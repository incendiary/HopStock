import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

// GET /api/locations
router.get('/', (_req, res) => {
  const rows = db.prepare(`
    SELECT l.*, COUNT(e.id) as item_count
    FROM locations l
    LEFT JOIN equipment e ON e.location_id = l.id AND e.deleted = 0
    GROUP BY l.id
    ORDER BY l.name COLLATE NOCASE
  `).all();
  res.json(rows);
});

// GET /api/locations/:id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// POST /api/locations
router.post('/', (req, res) => {
  const { name, notes = null } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  try {
    const result = db
      .prepare("INSERT INTO locations (name, notes) VALUES (?, ?)")
      .run(name.trim(), notes);
    const created = db.prepare('SELECT * FROM locations WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'A location with that name already exists' });
    }
    throw err;
  }
});

// PUT /api/locations/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { name = existing.name, notes = existing.notes } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  try {
    db.prepare('UPDATE locations SET name = ?, notes = ? WHERE id = ?')
      .run(name.trim(), notes ?? null, req.params.id);
    res.json(db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id));
  } catch (err) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'A location with that name already exists' });
    }
    throw err;
  }
});

// DELETE /api/locations/:id
// Sets location_id = NULL on any equipment assigned here, then deletes
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM locations WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  db.transaction(() => {
    db.prepare('UPDATE equipment SET location_id = NULL WHERE location_id = ?').run(req.params.id);
    db.prepare('DELETE FROM locations WHERE id = ?').run(req.params.id);
  })();

  res.json({ success: true });
});

export default router;
