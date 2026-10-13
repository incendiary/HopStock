import { describe, it, expect, vi } from 'vitest';
import Database from 'better-sqlite3';
import { makeTestDb, seedEquipment } from './helpers.js';
import { runMigrations } from '../db/schema.js';

const testDb = makeTestDb();
vi.mock('../db/index.js', () => ({ default: testDb }));

const { default: app } = await import('../app.js');
const request = (await import('supertest')).default;

const events = (routineId) =>
  testDb.prepare('SELECT * FROM maintenance_events WHERE routine_id = ? ORDER BY id').all(routineId);

async function routineWith(equipCount = 2) {
  const { body } = await request(app).post('/api/routines').send({ name: 'Descale' });
  const items = [];
  for (let i = 0; i < equipCount; i++) {
    const e = seedEquipment(testDb, { name: `Kettle ${i}` });
    await request(app).post(`/api/routines/${body.id}/equipment`).send({ equipment_id: e.id });
    items.push(e);
  }
  return { id: body.id, items };
}

describe('Routine runs link events by routine_id', () => {
  it('sets routine_id, leaves no tag in notes, and last_run equals the run time', async () => {
    const { id, items } = await routineWith(2);
    const run = await request(app)
      .post(`/api/routines/${id}/run`)
      .send({ performed_at: '2026-03-01T09:00:00Z', notes: '  all good  ' });
    expect(run.body.logged_count).toBe(2);

    const rows = events(id);
    expect(rows.map((r) => r.equipment_id).sort()).toEqual(items.map((e) => e.id).sort());
    expect(rows.every((r) => r.notes === 'all good')).toBe(true);

    const detail = await request(app).get(`/api/routines/${id}`);
    expect(detail.body.last_run).toBe('2026-03-01T09:00:00Z');
    const list = await request(app).get('/api/routines');
    expect(list.body.find((r) => r.id === id).last_run).toBe('2026-03-01T09:00:00Z');
  });

  it('stores null notes when none are given', async () => {
    const { id } = await routineWith(1);
    await request(app).post(`/api/routines/${id}/run`).send({});
    expect(events(id)[0].notes).toBeNull();
  });

  it('ignores a hand-typed [routine:N] note for last_run', async () => {
    const { id, items } = await routineWith(1);
    const res = await request(app)
      .post(`/api/equipment/${items[0].id}/maintenance`)
      .send({ event_type: 'Serviced', notes: `[routine:${id}]`, performed_at: '2026-04-01T00:00:00Z' });
    expect(res.status).toBe(201);
    const detail = await request(app).get(`/api/routines/${id}`);
    expect(detail.body.last_run).toBeNull();
    const list = await request(app).get('/api/routines');
    expect(list.body.find((r) => r.id === id).last_run).toBeNull();
  });

  it('leaves events with routine_id NULL when the routine is deleted', async () => {
    const { id } = await routineWith(2);
    await request(app).post(`/api/routines/${id}/run`).send({ notes: 'x' });
    const ids = events(id).map((r) => r.id);
    expect(ids).toHaveLength(2);
    await request(app).delete(`/api/routines/${id}`);
    const after = testDb.prepare(`SELECT * FROM maintenance_events WHERE id IN (${ids.join(',')})`).all();
    expect(after).toHaveLength(2);
    expect(after.every((r) => r.routine_id === null && r.notes === 'x')).toBe(true);
  });
});

describe('routine_id migration from the pre-RA-9 schema', () => {
  function oldDb() {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    // Rebuild maintenance_events as it was before RA-9 (no routine_id column or index)
    db.exec(`
      DROP INDEX idx_maintenance_routine;
      ALTER TABLE maintenance_events DROP COLUMN routine_id;
    `);
    expect(db.pragma('table_info(maintenance_events)').map((c) => c.name)).not.toContain('routine_id');
    db.prepare("INSERT INTO service_routines (id, name) VALUES (7, 'Existing')").run();
    const equip = seedEquipment(db);
    const ins = db.prepare(
      "INSERT INTO maintenance_events (equipment_id, event_type, notes, performed_at) VALUES (?, 'Serviced', ?, '2026-01-01T00:00:00Z')",
    );
    for (const n of ['[routine:7]', '[routine:99]', 'wiped the lid [routine:7]', 'plain note', null]) {
      ins.run(equip.id, n);
    }
    return db;
  }
  const snapshot = (db) =>
    db.prepare('SELECT id, notes, routine_id FROM maintenance_events ORDER BY id').all();

  it('backfills once, strips tags, and never converts later hand-typed tags', () => {
    const db = oldDb();
    runMigrations(db);
    expect(snapshot(db).map(({ notes, routine_id }) => [routine_id, notes])).toEqual([
      [7, null],
      [null, null],
      [7, 'wiped the lid'],
      [null, 'plain note'],
      [null, null],
    ]);

    const after = snapshot(db);
    runMigrations(db);
    expect(snapshot(db)).toEqual(after);

    const equipId = db.prepare('SELECT id FROM equipment').get().id;
    db.prepare(
      "INSERT INTO maintenance_events (equipment_id, event_type, notes) VALUES (?, 'Serviced', '[routine:7]')",
    ).run(equipId);
    runMigrations(db);
    const typed = db.prepare('SELECT notes, routine_id FROM maintenance_events ORDER BY id DESC').get();
    expect(typed).toEqual({ notes: '[routine:7]', routine_id: null });
  });
});
