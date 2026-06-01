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
  const { total, totalUnits } = db
    .prepare('SELECT COUNT(*) as total, COALESCE(SUM(quantity), COUNT(*)) as totalUnits FROM equipment WHERE deleted = 0')
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

  // Value summary for inventory report
  const valueSummary = db.prepare(`
    SELECT
      COUNT(CASE WHEN purchase_price IS NOT NULL THEN 1 END)  as priced_count,
      COUNT(CASE WHEN purchase_price IS NULL     THEN 1 END)  as unpriced_count,
      COALESCE(SUM(purchase_price),  0)                       as total_value
    FROM equipment WHERE deleted = 0
  `).get();

  const { onLoan } = db.prepare(`
    SELECT COUNT(DISTINCT l.equipment_id) as onLoan
    FROM loans l
    JOIN equipment e ON e.id = l.equipment_id
    WHERE l.returned_at IS NULL AND e.deleted = 0
  `).get();

  const byLocation = db.prepare(`
    SELECT COALESCE(l.name, 'Unassigned') as name, l.id, COUNT(e.id) as count
    FROM equipment e
    LEFT JOIN locations l ON l.id = e.location_id
    WHERE e.deleted = 0
    GROUP BY e.location_id
    ORDER BY count DESC
  `).all();

  res.json({ total, totalUnits, photos, onLoan, byCondition, byCategory, byLocation, valueSummary });
});

export default router;
