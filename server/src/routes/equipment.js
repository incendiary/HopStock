import { Router } from 'express';
import db from '../db/index.js';
import { CATEGORIES, CONDITIONS } from '../db/constants.js';

const router = Router();

const VALID_CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));
const VALID_CONDITIONS   = new Set(CONDITIONS);

// --- helpers ---

function validate(body) {
  const errors = [];
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    errors.push('name is required');
  }
  if (!body.category || !VALID_CATEGORY_IDS.has(body.category)) {
    errors.push(`category must be one of: ${[...VALID_CATEGORY_IDS].join(', ')}`);
  }
  if (body.condition && !VALID_CONDITIONS.has(body.condition)) {
    errors.push(`condition must be one of: ${CONDITIONS.join(', ')}`);
  }
  return errors;
}

function withPhotos(item) {
  if (!item) return null;
  const photos = db
    .prepare('SELECT id, filename, sort_order, caption, created_at FROM photos WHERE equipment_id = ? ORDER BY sort_order, id')
    .all(item.id)
    .map((p) => ({ ...p, url: `/uploads/${p.filename}` }));
  const tags = db
    .prepare(`
      SELECT t.id, t.name, t.color
      FROM tags t JOIN equipment_tags et ON et.tag_id = t.id
      WHERE et.equipment_id = ?
      ORDER BY t.name COLLATE NOCASE
    `)
    .all(item.id);
  const location = item.location_id
    ? db.prepare('SELECT id, name FROM locations WHERE id = ?').get(item.location_id)
    : null;
  const activeLoan = db.prepare(`
    SELECT id, borrower, loaned_at, expected_return
    FROM loans WHERE equipment_id = ? AND returned_at IS NULL
    ORDER BY loaned_at DESC LIMIT 1
  `).get(item.id) ?? null;
  return { ...item, photos, tags, location, activeLoan };
}

// --- routes ---

// GET /api/equipment
// Query params: ?category=&condition=&tag=&location=&onLoan=1&q=
router.get('/', (req, res) => {
  const { category, condition, tag, location, onLoan, q } = req.query;

  let sql    = 'SELECT DISTINCT e.* FROM equipment e';
  const params = [];

  if (tag) {
    sql += ' JOIN equipment_tags et ON et.equipment_id = e.id JOIN tags t ON t.id = et.tag_id';
  }
  if (onLoan === '1') {
    sql += ' JOIN loans ln ON ln.equipment_id = e.id AND ln.returned_at IS NULL';
  }
  if (q) {
    // FTS5 MATCH — use prefix matching (* suffix) and escape special chars
    sql += ' JOIN equipment_fts fts ON fts.rowid = e.id';
  }

  sql += ' WHERE e.deleted = 0';

  if (category) {
    sql += ' AND e.category = ?';
    params.push(category);
  }
  if (condition) {
    sql += ' AND e.condition = ?';
    params.push(condition);
  }
  if (tag) {
    sql += ' AND t.name = ?';
    params.push(tag);
  }
  if (location === 'none') {
    sql += ' AND e.location_id IS NULL';
  } else if (location) {
    sql += ' AND e.location_id = ?';
    params.push(location);
  }
  if (q) {
    // Sanitise query: strip FTS5 special chars, add prefix wildcard
    const safeQ = q.replace(/["'*^]/g, ' ').trim();
    if (safeQ) {
      sql += ' AND fts.equipment_fts MATCH ?';
      params.push(`"${safeQ}"*`);
    }
  }

  sql += ' ORDER BY e.name COLLATE NOCASE';

  const items = db.prepare(sql).all(...params);
  res.json({ items: items.map(withPhotos), total: items.length });
});

// GET /api/equipment/:id
router.get('/:id', (req, res) => {
  const item = db
    .prepare('SELECT * FROM equipment WHERE id = ? AND deleted = 0')
    .get(req.params.id);

  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(withPhotos(item));
});

// POST /api/equipment
router.post('/', (req, res) => {
  const errors = validate(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const {
    name, category, condition = 'Good', notes = null, icon = null, tag_ids = [],
    purchase_date = null, purchase_price = null, purchase_currency = null,
    retailer = null, serial_number = null, model_number = null, warranty_expires = null,
    quantity = 1, location_id = null,
  } = req.body;

  const create = db.transaction(() => {
    const result = db
      .prepare(`
        INSERT INTO equipment
          (name, category, condition, notes, icon,
           purchase_date, purchase_price, purchase_currency,
           retailer, serial_number, model_number, warranty_expires, quantity, location_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        name.trim(), category, condition, notes, icon,
        purchase_date, purchase_price, purchase_currency || 'GBP',
        retailer, serial_number, model_number, warranty_expires,
        Math.max(1, parseInt(quantity, 10) || 1),
        location_id ?? null,
      );
    const id = result.lastInsertRowid;
    for (const tagId of tag_ids) {
      db.prepare('INSERT OR IGNORE INTO equipment_tags (equipment_id, tag_id) VALUES (?, ?)').run(id, tagId);
    }
    return id;
  });

  const id = create();
  res.status(201).json(withPhotos(db.prepare('SELECT * FROM equipment WHERE id = ?').get(id)));
});

// PUT /api/equipment/:id
router.put('/:id', (req, res) => {
  const existing = db
    .prepare('SELECT * FROM equipment WHERE id = ? AND deleted = 0')
    .get(req.params.id);

  if (!existing) return res.status(404).json({ error: 'Not found' });

  const merged = { ...existing, ...req.body };
  const errors = validate(merged);
  if (errors.length) return res.status(400).json({ errors });

  const { name, category, condition, notes = null, icon = null } = merged;
  const tag_ids = req.body.tag_ids; // undefined = don't touch tags

  // Purchase fields + quantity + location — only update if explicitly sent (don't wipe on partial updates)
  const purchaseFields = [
    'purchase_date', 'purchase_price', 'purchase_currency',
    'retailer', 'serial_number', 'model_number', 'warranty_expires',
    'quantity', 'location_id',
  ];
  const purchaseUpdates = purchaseFields.filter((f) => f in req.body);

  const update = db.transaction(() => {
    let sql = `
      UPDATE equipment
      SET name = ?, category = ?, condition = ?, notes = ?, icon = ?,
          updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
    `;
    const params = [name.trim(), category, condition, notes, icon];

    for (const f of purchaseUpdates) {
      sql += `, ${f} = ?`;
      const val = req.body[f] ?? null;
      params.push(f === 'quantity' ? Math.max(1, parseInt(val, 10) || 1) : val);
    }
    sql += ' WHERE id = ?';
    params.push(req.params.id);

    db.prepare(sql).run(...params);

    if (Array.isArray(tag_ids)) {
      db.prepare('DELETE FROM equipment_tags WHERE equipment_id = ?').run(req.params.id);
      for (const tagId of tag_ids) {
        db.prepare('INSERT OR IGNORE INTO equipment_tags (equipment_id, tag_id) VALUES (?, ?)').run(req.params.id, tagId);
      }
    }
  });

  update();
  res.json(withPhotos(db.prepare('SELECT * FROM equipment WHERE id = ?').get(req.params.id)));
});

// POST /api/equipment/batch — bulk operations
// Body: { ids: number[], action: 'condition'|'tag'|'location'|'delete', value?: any }
router.post('/batch', (req, res) => {
  const { ids, action, value } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids must be a non-empty array' });
  }
  if (!['condition', 'tag', 'location', 'delete'].includes(action)) {
    return res.status(400).json({ error: 'invalid action' });
  }

  const placeholders = ids.map(() => '?').join(',');

  db.transaction(() => {
    if (action === 'delete') {
      db.prepare(`
        UPDATE equipment SET deleted = 1, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
        WHERE id IN (${placeholders}) AND deleted = 0
      `).run(...ids);
    } else if (action === 'condition') {
      if (!VALID_CONDITIONS.has(value)) throw Object.assign(new Error('invalid condition'), { status: 400 });
      db.prepare(`
        UPDATE equipment SET condition = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
        WHERE id IN (${placeholders}) AND deleted = 0
      `).run(value, ...ids);
    } else if (action === 'location') {
      // value = location id (number) or null to unassign
      db.prepare(`
        UPDATE equipment SET location_id = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
        WHERE id IN (${placeholders}) AND deleted = 0
      `).run(value ?? null, ...ids);
    } else if (action === 'tag') {
      // value = tag id to add to all selected items
      if (!value) throw Object.assign(new Error('tag id required'), { status: 400 });
      for (const id of ids) {
        db.prepare('INSERT OR IGNORE INTO equipment_tags (equipment_id, tag_id) VALUES (?, ?)').run(id, value);
      }
    }
  })();

  res.json({ success: true, affected: ids.length });
});

// DELETE /api/equipment/:id  (soft delete)
router.delete('/:id', (req, res) => {
  const existing = db
    .prepare('SELECT id FROM equipment WHERE id = ? AND deleted = 0')
    .get(req.params.id);

  if (!existing) return res.status(404).json({ error: 'Not found' });

  db.prepare(`
    UPDATE equipment
    SET deleted = 1, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
    WHERE id = ?
  `).run(req.params.id);

  res.json({ success: true });
});

export default router;
