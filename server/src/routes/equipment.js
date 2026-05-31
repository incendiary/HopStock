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
    .prepare('SELECT id, filename, created_at FROM photos WHERE equipment_id = ? ORDER BY id')
    .all(item.id);
  return { ...item, photos };
}

// --- routes ---

// GET /api/equipment
// Query params: ?category=&condition=
router.get('/', (req, res) => {
  const { category, condition } = req.query;

  let sql  = 'SELECT * FROM equipment WHERE deleted = 0';
  const params = [];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (condition) {
    sql += ' AND condition = ?';
    params.push(condition);
  }

  sql += ' ORDER BY name COLLATE NOCASE';

  const items = db.prepare(sql).all(...params);
  res.json({ items, total: items.length });
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

  const { name, category, condition = 'Good', notes = null, icon = null } = req.body;

  const result = db
    .prepare(`
      INSERT INTO equipment (name, category, condition, notes, icon)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(name.trim(), category, condition, notes, icon);

  const created = db
    .prepare('SELECT * FROM equipment WHERE id = ?')
    .get(result.lastInsertRowid);

  res.status(201).json(withPhotos(created));
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

  db.prepare(`
    UPDATE equipment
    SET name = ?, category = ?, condition = ?, notes = ?, icon = ?,
        updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
    WHERE id = ?
  `).run(name.trim(), category, condition, notes, icon, req.params.id);

  const updated = db
    .prepare('SELECT * FROM equipment WHERE id = ?')
    .get(req.params.id);

  res.json(withPhotos(updated));
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
