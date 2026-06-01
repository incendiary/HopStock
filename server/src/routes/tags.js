import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────

function getTagsForEquipment(equipmentId) {
  return db
    .prepare(`
      SELECT t.id, t.name, t.color
      FROM tags t
      JOIN equipment_tags et ON et.tag_id = t.id
      WHERE et.equipment_id = ?
      ORDER BY t.name COLLATE NOCASE
    `)
    .all(equipmentId);
}

// ─── Tag CRUD ─────────────────────────────────────────────

// GET /api/tags
router.get('/', (_req, res) => {
  const tags = db
    .prepare('SELECT * FROM tags ORDER BY name COLLATE NOCASE')
    .all();
  // Attach usage count
  const result = tags.map((t) => ({
    ...t,
    usage_count: db
      .prepare('SELECT COUNT(*) as n FROM equipment_tags WHERE tag_id = ?')
      .get(t.id).n,
  }));
  res.json(result);
});

// POST /api/tags
router.post('/', (req, res) => {
  const { name, color = '#6366f1' } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  try {
    const result = db
      .prepare('INSERT INTO tags (name, color) VALUES (?, ?)')
      .run(name.trim(), color);
    const created = db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: `Tag "${name.trim()}" already exists` });
    }
    throw err;
  }
});

// PUT /api/tags/:id
router.put('/:id', (req, res) => {
  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id);
  if (!tag) return res.status(404).json({ error: 'Not found' });

  const { name, color } = req.body;

  try {
    db.prepare(`
      UPDATE tags SET name = COALESCE(?, name), color = COALESCE(?, color) WHERE id = ?
    `).run(name?.trim() ?? null, color ?? null, req.params.id);
    res.json(db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id));
  } catch (err) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: `Tag name already exists` });
    }
    throw err;
  }
});

// DELETE /api/tags/:id
router.delete('/:id', (req, res) => {
  const tag = db.prepare('SELECT id FROM tags WHERE id = ?').get(req.params.id);
  if (!tag) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM tags WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Equipment ↔ tag assignment ───────────────────────────

// GET /api/tags/equipment/:id  — tags for one equipment item
router.get('/equipment/:id', (req, res) => {
  res.json(getTagsForEquipment(req.params.id));
});

// PUT /api/tags/equipment/:id  — replace all tags for an item
router.put('/equipment/:id', (req, res) => {
  const equip = db
    .prepare('SELECT id FROM equipment WHERE id = ? AND deleted = 0')
    .get(req.params.id);
  if (!equip) return res.status(404).json({ error: 'Equipment not found' });

  const { tag_ids = [] } = req.body;

  const sync = db.transaction(() => {
    db.prepare('DELETE FROM equipment_tags WHERE equipment_id = ?').run(req.params.id);
    for (const tagId of tag_ids) {
      db.prepare('INSERT OR IGNORE INTO equipment_tags (equipment_id, tag_id) VALUES (?, ?)')
        .run(req.params.id, tagId);
    }
  });

  sync();
  res.json(getTagsForEquipment(req.params.id));
});

export default router;
