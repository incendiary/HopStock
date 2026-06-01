import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────

function getRoutineWithDetails(id) {
  const routine = db
    .prepare('SELECT * FROM service_routines WHERE id = ?')
    .get(id);
  if (!routine) return null;

  const steps = db
    .prepare('SELECT * FROM routine_steps WHERE routine_id = ? ORDER BY sort_order, id')
    .all(id);

  const equipment = db
    .prepare(`
      SELECT e.id, e.name, e.icon, e.category, e.condition
      FROM equipment e
      JOIN routine_equipment re ON re.equipment_id = e.id
      WHERE re.routine_id = ? AND e.deleted = 0
      ORDER BY e.name COLLATE NOCASE
    `)
    .all(id);

  // Last run: most recent maintenance event created by running this routine
  // We track this via a tag in the notes field: "[routine:<id>]"
  const lastRunRow = db
    .prepare(`
      SELECT MAX(performed_at) as last_run
      FROM maintenance_events
      WHERE notes LIKE ?
    `)
    .get(`%[routine:${id}]%`);

  return {
    ...routine,
    steps,
    equipment,
    last_run: lastRunRow?.last_run ?? null,
  };
}

// ─── Routes ───────────────────────────────────────────────

// GET /api/routines
router.get('/', (_req, res) => {
  const routines = db
    .prepare('SELECT * FROM service_routines ORDER BY name COLLATE NOCASE')
    .all();

  // Attach summary counts and last_run to each
  const result = routines.map((r) => {
    const stepCount = db
      .prepare('SELECT COUNT(*) as n FROM routine_steps WHERE routine_id = ?')
      .get(r.id).n;
    const equipCount = db
      .prepare('SELECT COUNT(*) as n FROM routine_equipment WHERE routine_id = ?')
      .get(r.id).n;
    const lastRunRow = db
      .prepare(`SELECT MAX(performed_at) as last_run FROM maintenance_events WHERE notes LIKE ?`)
      .get(`%[routine:${r.id}]%`);
    return {
      ...r,
      step_count: stepCount,
      equipment_count: equipCount,
      last_run: lastRunRow?.last_run ?? null,
    };
  });

  res.json(result);
});

// GET /api/routines/:id
router.get('/:id', (req, res) => {
  const routine = getRoutineWithDetails(req.params.id);
  if (!routine) return res.status(404).json({ error: 'Not found' });
  res.json(routine);
});

// POST /api/routines
router.post('/', (req, res) => {
  const { name, description = null, interval_days = null, steps = [] } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  const createRoutine = db.transaction(() => {
    const result = db
      .prepare(`
        INSERT INTO service_routines (name, description, interval_days)
        VALUES (?, ?, ?)
      `)
      .run(name.trim(), description, interval_days ?? null);

    const routineId = result.lastInsertRowid;

    steps.forEach((step, i) => {
      db.prepare(`
        INSERT INTO routine_steps (routine_id, sort_order, instruction, is_check)
        VALUES (?, ?, ?, ?)
      `).run(routineId, i, step.instruction, step.is_check ? 1 : 0);
    });

    return routineId;
  });

  const routineId = createRoutine();
  res.status(201).json(getRoutineWithDetails(routineId));
});

// PUT /api/routines/:id
router.put('/:id', (req, res) => {
  const existing = db
    .prepare('SELECT id FROM service_routines WHERE id = ?')
    .get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { name, description = null, interval_days = null, steps } = req.body;

  if (name !== undefined && !name.trim()) {
    return res.status(400).json({ error: 'name cannot be empty' });
  }

  const update = db.transaction(() => {
    if (name !== undefined || description !== undefined || interval_days !== undefined) {
      db.prepare(`
        UPDATE service_routines
        SET name = COALESCE(?, name),
            description = ?,
            interval_days = ?,
            updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
        WHERE id = ?
      `).run(name?.trim() ?? null, description, interval_days ?? null, req.params.id);
    }

    if (Array.isArray(steps)) {
      db.prepare('DELETE FROM routine_steps WHERE routine_id = ?').run(req.params.id);
      steps.forEach((step, i) => {
        db.prepare(`
          INSERT INTO routine_steps (routine_id, sort_order, instruction, is_check)
          VALUES (?, ?, ?, ?)
        `).run(req.params.id, i, step.instruction, step.is_check ? 1 : 0);
      });
    }
  });

  update();
  res.json(getRoutineWithDetails(req.params.id));
});

// DELETE /api/routines/:id
router.delete('/:id', (req, res) => {
  const existing = db
    .prepare('SELECT id FROM service_routines WHERE id = ?')
    .get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  db.prepare('DELETE FROM service_routines WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST /api/routines/:id/equipment  — attach an item
router.post('/:id/equipment', (req, res) => {
  const routine = db
    .prepare('SELECT id FROM service_routines WHERE id = ?')
    .get(req.params.id);
  if (!routine) return res.status(404).json({ error: 'Routine not found' });

  const { equipment_id } = req.body;
  const equip = db
    .prepare('SELECT id FROM equipment WHERE id = ? AND deleted = 0')
    .get(equipment_id);
  if (!equip) return res.status(404).json({ error: 'Equipment not found' });

  db.prepare(`
    INSERT OR IGNORE INTO routine_equipment (routine_id, equipment_id) VALUES (?, ?)
  `).run(req.params.id, equipment_id);

  res.status(201).json(getRoutineWithDetails(req.params.id));
});

// DELETE /api/routines/:id/equipment/:equipmentId  — detach an item
router.delete('/:id/equipment/:equipmentId', (req, res) => {
  db.prepare(
    'DELETE FROM routine_equipment WHERE routine_id = ? AND equipment_id = ?',
  ).run(req.params.id, req.params.equipmentId);
  res.json({ success: true });
});

// POST /api/routines/:id/run  — log completion for all attached equipment
router.post('/:id/run', (req, res) => {
  const routine = getRoutineWithDetails(req.params.id);
  if (!routine) return res.status(404).json({ error: 'Not found' });

  if (!routine.equipment.length) {
    return res.status(400).json({ error: 'No equipment attached to this routine' });
  }

  const { performed_at, notes = '' } = req.body;
  const performedAt = performed_at ?? new Date().toISOString().slice(0, 19) + 'Z';

  // Tag the notes so we can track last_run per routine
  const taggedNotes = [notes.trim(), `[routine:${routine.id}]`]
    .filter(Boolean)
    .join(' ')
    .trim();

  const runRoutine = db.transaction(() => {
    routine.equipment.forEach((equip) => {
      db.prepare(`
        INSERT INTO maintenance_events (equipment_id, event_type, notes, performed_at)
        VALUES (?, 'Serviced', ?, ?)
      `).run(equip.id, taggedNotes, performedAt);
    });
  });

  runRoutine();

  res.json({
    success: true,
    logged_count: routine.equipment.length,
    performed_at: performedAt,
  });
});

export default router;
