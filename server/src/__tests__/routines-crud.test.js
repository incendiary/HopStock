import { describe, it, expect, vi } from 'vitest';
import { makeTestDb, seedEquipment } from './helpers.js';

const testDb = makeTestDb();
vi.mock('../db/index.js', () => ({ default: testDb }));

const { default: app } = await import('../app.js');
const request = (await import('supertest')).default;

const mk = async (body) => (await request(app).post('/api/routines').send(body)).body;
const attach = (id, equipment_id) => request(app).post(`/api/routines/${id}/equipment`).send({ equipment_id });

describe('Routines CRUD', () => {
  it('GET /:id returns 404 for an unknown routine', async () => {
    const res = await request(app).get('/api/routines/99999');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  it('GET /:id returns steps in order, equipment and null last_run', async () => {
    const r = await mk({
      name: 'Full',
      description: 'd',
      interval_days: 14,
      steps: [{ instruction: 'one' }, { instruction: 'two', is_check: true }],
    });
    const res = await request(app).get(`/api/routines/${r.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Full', description: 'd', interval_days: 14, last_run: null, equipment: [] });
    expect(res.body.steps.map((s) => [s.sort_order, s.instruction, s.is_check])).toEqual([
      [0, 'one', 0],
      [1, 'two', 1],
    ]);
  });

  it('PUT updates fields and replaces steps wholesale', async () => {
    const r = await mk({ name: 'Old', steps: [{ instruction: 'a' }, { instruction: 'b' }, { instruction: 'c' }] });
    const res = await request(app)
      .put(`/api/routines/${r.id}`)
      .send({ name: '  New  ', description: 'desc', interval_days: 7, steps: [{ instruction: 'z' }] });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'New', description: 'desc', interval_days: 7 });
    expect(res.body.steps.map((s) => s.instruction)).toEqual(['z']);
    expect(testDb.prepare('SELECT COUNT(*) n FROM routine_steps WHERE routine_id = ?').get(r.id).n).toBe(1);
  });

  it('PUT without steps leaves the steps untouched and keeps the name', async () => {
    const r = await mk({ name: 'Keep', steps: [{ instruction: 'a' }, { instruction: 'b' }] });
    const res = await request(app).put(`/api/routines/${r.id}`).send({ description: 'only desc' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Keep');
    expect(res.body.description).toBe('only desc');
    expect(res.body.steps.map((s) => s.instruction)).toEqual(['a', 'b']);
  });

  it('PUT with steps: [] removes all steps', async () => {
    const r = await mk({ name: 'Clear', steps: [{ instruction: 'a' }] });
    const res = await request(app).put(`/api/routines/${r.id}`).send({ steps: [] });
    expect(res.body.steps).toEqual([]);
  });

  it('PUT with only a name keeps description and interval_days', async () => {
    const r = await mk({ name: 'Keep', description: 'keep me', interval_days: 30 });
    const res = await request(app).put(`/api/routines/${r.id}`).send({ name: 'Kept' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Kept', description: 'keep me', interval_days: 30 });
  });

  it('PUT with explicit null clears description and interval_days independently', async () => {
    const r = await mk({ name: 'Clear', description: 'd', interval_days: 7 });
    const a = await request(app).put(`/api/routines/${r.id}`).send({ description: null });
    expect(a.body).toMatchObject({ name: 'Clear', description: null, interval_days: 7 });
    const b = await request(app).put(`/api/routines/${r.id}`).send({ description: 'back', interval_days: null });
    expect(b.body).toMatchObject({ name: 'Clear', description: 'back', interval_days: null });
  });

  it('PUT returns 404 for an unknown routine', async () => {
    const res = await request(app).put('/api/routines/99999').send({ name: 'x' });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  it('DELETE cascades to steps and attachments but keeps the equipment', async () => {
    const e = seedEquipment(testDb);
    const r = await mk({ name: 'Doomed', steps: [{ instruction: 'a' }, { instruction: 'b' }] });
    await attach(r.id, e.id);
    const res = await request(app).delete(`/api/routines/${r.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(testDb.prepare('SELECT COUNT(*) n FROM routine_steps WHERE routine_id = ?').get(r.id).n).toBe(0);
    expect(testDb.prepare('SELECT COUNT(*) n FROM routine_equipment WHERE routine_id = ?').get(r.id).n).toBe(0);
    expect(testDb.prepare('SELECT COUNT(*) n FROM equipment WHERE id = ?').get(e.id).n).toBe(1);
    expect((await request(app).get(`/api/routines/${r.id}`)).status).toBe(404);
  });

  it('DELETE returns 404 for an unknown routine', async () => {
    const res = await request(app).delete('/api/routines/99999');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });
});

describe('Routine equipment attach and detach', () => {
  it('attaches equipment and returns the routine with it listed', async () => {
    const e = seedEquipment(testDb, { name: 'Attach Me', category: 'keg', condition: 'Fair', icon: 'K' });
    const r = await mk({ name: 'Att' });
    const res = await attach(r.id, e.id);
    expect(res.status).toBe(201);
    expect(res.body.equipment).toEqual([{ id: e.id, name: 'Attach Me', icon: 'K', category: 'keg', condition: 'Fair' }]);
  });

  it('attaching twice is idempotent', async () => {
    const e = seedEquipment(testDb);
    const r = await mk({ name: 'Twice' });
    await attach(r.id, e.id);
    const res = await attach(r.id, e.id);
    expect(res.status).toBe(201);
    expect(res.body.equipment).toHaveLength(1);
    expect(testDb.prepare('SELECT COUNT(*) n FROM routine_equipment WHERE routine_id = ?').get(r.id).n).toBe(1);
  });

  it('404s for an unknown routine', async () => {
    const e = seedEquipment(testDb);
    const res = await attach(99999, e.id);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Routine not found' });
  });

  it('404s for unknown, soft-deleted or missing equipment', async () => {
    const gone = seedEquipment(testDb);
    testDb.prepare('UPDATE equipment SET deleted = 1 WHERE id = ?').run(gone.id);
    const r = await mk({ name: 'NoEquip' });
    for (const id of [99999, gone.id, undefined]) {
      const res = await attach(r.id, id);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Equipment not found' });
    }
  });

  it('detaches equipment and tolerates detaching again', async () => {
    const e = seedEquipment(testDb);
    const r = await mk({ name: 'Det' });
    await attach(r.id, e.id);
    const first = await request(app).delete(`/api/routines/${r.id}/equipment/${e.id}`);
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ success: true });
    expect((await request(app).get(`/api/routines/${r.id}`)).body.equipment).toEqual([]);
    const again = await request(app).delete(`/api/routines/${r.id}/equipment/${e.id}`);
    expect(again.status).toBe(200);
    expect(again.body).toEqual({ success: true });
  });

  it('hides soft-deleted equipment from the routine', async () => {
    const e = seedEquipment(testDb);
    const r = await mk({ name: 'Soft' });
    await attach(r.id, e.id);
    testDb.prepare('UPDATE equipment SET deleted = 1 WHERE id = ?').run(e.id);
    expect((await request(app).get(`/api/routines/${r.id}`)).body.equipment).toEqual([]);
    expect((await request(app).get('/api/routines')).body.find((x) => x.id === r.id).equipment_count).toBe(1);
  });
});

describe('Routine run', () => {
  it('404s for an unknown routine', async () => {
    const res = await request(app).post('/api/routines/99999/run').send({});
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  it('400s when no equipment is attached and logs nothing', async () => {
    const r = await mk({ name: 'Empty run' });
    const res = await request(app).post(`/api/routines/${r.id}/run`).send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'No equipment attached to this routine' });
    expect(testDb.prepare('SELECT COUNT(*) n FROM maintenance_events WHERE routine_id = ?').get(r.id).n).toBe(0);
  });

  it('logs one Serviced event per attached item at the chosen performed_at', async () => {
    const a = seedEquipment(testDb, { name: 'RunA' });
    const b = seedEquipment(testDb, { name: 'RunB' });
    const c = seedEquipment(testDb, { name: 'NotAttached' });
    const r = await mk({ name: 'Run' });
    await attach(r.id, a.id);
    await attach(r.id, b.id);
    const res = await request(app)
      .post(`/api/routines/${r.id}/run`)
      .send({ performed_at: '2026-03-04T05:06:07Z', notes: '  all good  ' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, logged_count: 2, performed_at: '2026-03-04T05:06:07Z' });
    const rows = testDb.prepare('SELECT * FROM maintenance_events WHERE routine_id = ? ORDER BY equipment_id').all(r.id);
    expect(rows.map((x) => [x.equipment_id, x.event_type, x.notes, x.performed_at])).toEqual([
      [a.id, 'Serviced', 'all good', '2026-03-04T05:06:07Z'],
      [b.id, 'Serviced', 'all good', '2026-03-04T05:06:07Z'],
    ]);
    expect(testDb.prepare('SELECT COUNT(*) n FROM maintenance_events WHERE equipment_id = ?').get(c.id).n).toBe(0);
  });

  it('stores null notes when none are given', async () => {
    const e = seedEquipment(testDb);
    const r = await mk({ name: 'NoNotes' });
    await attach(r.id, e.id);
    await request(app).post(`/api/routines/${r.id}/run`).send({});
    expect(testDb.prepare('SELECT notes FROM maintenance_events WHERE routine_id = ?').get(r.id).notes).toBeNull();
  });
});
