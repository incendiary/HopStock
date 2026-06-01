import { Router } from 'express';
import db from '../db/index.js';
import { CATEGORIES, CONDITIONS, MAINTENANCE_EVENT_TYPES } from '../db/constants.js';

const router = Router();

// GET /api/categories
router.get('/categories', (_req, res) => {
  res.json(CATEGORIES);
});

// GET /api/conditions
router.get('/conditions', (_req, res) => {
  res.json(CONDITIONS);
});

// GET /api/maintenance-event-types
router.get('/maintenance-event-types', (_req, res) => {
  res.json(MAINTENANCE_EVENT_TYPES);
});

// GET /api/stats
router.get('/stats', (_req, res) => {
  const { total } = db
    .prepare('SELECT COUNT(*) as total FROM equipment WHERE deleted = 0')
    .get();

  const { photos } = db
    .prepare(`
      SELECT COUNT(*) as photos
      FROM photos p
      JOIN equipment e ON p.equipment_id = e.id
      WHERE e.deleted = 0
    `)
    .get();

  const condMap = Object.fromEntries(
    db
      .prepare('SELECT condition, COUNT(*) as count FROM equipment WHERE deleted = 0 GROUP BY condition')
      .all()
      .map((r) => [r.condition, r.count]),
  );
  const byCondition = CONDITIONS.map((c) => ({ condition: c, count: condMap[c] ?? 0 }));

  const byCategory = db
    .prepare(`
      SELECT category, COUNT(*) as count
      FROM equipment
      WHERE deleted = 0
      GROUP BY category
      ORDER BY count DESC
    `)
    .all();

  res.json({ total, photos, byCondition, byCategory });
});

export default router;
