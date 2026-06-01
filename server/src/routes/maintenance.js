import { Router } from 'express';
import db from '../db/index.js';
import { MAINTENANCE_EVENT_TYPES } from '../db/constants.js';

const router = Router({ mergeParams: true }); // gives access to :equipmentId from parent

const VALID_TYPES = new Set(MAINTENANCE_EVENT_TYPES);

function getEquipment(id) {
  return db
    .prepare('SELECT id FROM equipment WHERE id = ? AND deleted = 0')
    .get(id);
}

// GET /api/equipment/:equipmentId/maintenance
router.get('/', (req, res) => {
  const equip = getEquipment(req.params.equipmentId);
  if (!equip) return res.status(404).json({ error: 'Equipment not found' });

  const events = db
    .prepare(
      'SELECT * FROM maintenance_events WHERE equipment_id = ? ORDER BY performed_at DESC, id DESC',
    )
    .all(req.params.equipmentId);

  res.json(events);
});

// POST /api/equipment/:equipmentId/maintenance
router.post('/', (req, res) => {
  const equip = getEquipment(req.params.equipmentId);
  if (!equip) return res.status(404).json({ error: 'Equipment not found' });

  const { event_type, notes = null, performed_at } = req.body;

  if (!event_type || !VALID_TYPES.has(event_type)) {
    return res.status(400).json({
      error: `event_type must be one of: ${MAINTENANCE_EVENT_TYPES.join(', ')}`,
    });
  }

  // Default performed_at to now; accept ISO string from client
  const performedAt = performed_at ?? new Date().toISOString().replace('T', 'T').slice(0, 19) + 'Z';

  const result = db
    .prepare(
      'INSERT INTO maintenance_events (equipment_id, event_type, notes, performed_at) VALUES (?, ?, ?, ?)',
    )
    .run(req.params.equipmentId, event_type, notes, performedAt);

  const created = db
    .prepare('SELECT * FROM maintenance_events WHERE id = ?')
    .get(result.lastInsertRowid);

  res.status(201).json(created);
});

// DELETE /api/equipment/:equipmentId/maintenance/:eventId
router.delete('/:eventId', (req, res) => {
  const event = db
    .prepare(
      'SELECT id FROM maintenance_events WHERE id = ? AND equipment_id = ?',
    )
    .get(req.params.eventId, req.params.equipmentId);

  if (!event) return res.status(404).json({ error: 'Event not found' });

  db.prepare('DELETE FROM maintenance_events WHERE id = ?').run(req.params.eventId);
  res.json({ success: true });
});

export default router;
