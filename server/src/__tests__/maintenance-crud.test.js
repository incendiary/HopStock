import { describe, it, expect, vi } from 'vitest';
import { makeTestDb, seedEquipment } from './helpers.js';

const testDb = makeTestDb();
vi.mock('../db/index.js', () => ({ default: testDb }));

const { default: app } = await import('../app.js');
const request = (await import('supertest')).default;

const url = (id) => `/api/equipment/${id}/maintenance`;

describe('Maintenance list, delete and event types', () => {
  it('lists events by performed_at DESC then id DESC', async () => {
    const e = seedEquipment(testDb);
    const post = (event_type, performed_at) => request(app).post(url(e.id)).send({ event_type, performed_at });
    const a = (await post('Cleaned', '2026-01-01T00:00:00Z')).body;
    const b = (await post('Serviced', '2026-03-01T00:00:00Z')).body;
    const c = (await post('Repaired', '2026-03-01T00:00:00Z')).body;
    const d = (await post('Inspected', '2026-02-01T00:00:00Z')).body;
    const res = await request(app).get(url(e.id));
    expect(res.status).toBe(200);
    expect(res.body.map((x) => x.id)).toEqual([c.id, b.id, d.id, a.id]);
    expect(res.body[0]).toMatchObject({ equipment_id: e.id, event_type: 'Repaired', notes: null });
  });

  it('returns an empty list for equipment with no events', async () => {
    const e = seedEquipment(testDb);
    const res = await request(app).get(url(e.id));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('404s on list and create for unknown or soft-deleted equipment', async () => {
    const gone = seedEquipment(testDb);
    testDb.prepare('UPDATE equipment SET deleted = 1 WHERE id = ?').run(gone.id);
    for (const id of [99999, gone.id]) {
      const list = await request(app).get(url(id));
      expect(list.status).toBe(404);
      expect(list.body).toEqual({ error: 'Equipment not found' });
      const post = await request(app).post(url(id)).send({ event_type: 'Cleaned' });
      expect(post.status).toBe(404);
      expect(post.body).toEqual({ error: 'Equipment not found' });
    }
  });

  it('rejects a missing or invalid event_type with the allowed list', async () => {
    const e = seedEquipment(testDb);
    const msg = 'event_type must be one of: Cleaned, Serviced, Repaired, Replaced Part, Inspected';
    for (const body of [{}, { event_type: 'Polished' }]) {
      const res = await request(app).post(url(e.id)).send(body);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: msg });
    }
    expect(testDb.prepare('SELECT COUNT(*) n FROM maintenance_events WHERE equipment_id = ?').get(e.id).n).toBe(0);
  });

  it('stores notes on create', async () => {
    const e = seedEquipment(testDb);
    const res = await request(app).post(url(e.id)).send({ event_type: 'Cleaned', notes: 'PBW soak' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ equipment_id: e.id, event_type: 'Cleaned', notes: 'PBW soak' });
  });

  it('deletes an event', async () => {
    const e = seedEquipment(testDb);
    const ev = (await request(app).post(url(e.id)).send({ event_type: 'Cleaned' })).body;
    const res = await request(app).delete(`${url(e.id)}/${ev.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect((await request(app).get(url(e.id))).body).toEqual([]);
  });

  it('delete 404s for an unknown event or an event on a different item', async () => {
    const e1 = seedEquipment(testDb);
    const e2 = seedEquipment(testDb);
    const ev = (await request(app).post(url(e1.id)).send({ event_type: 'Cleaned' })).body;
    for (const path of [`${url(e1.id)}/99999`, `${url(e2.id)}/${ev.id}`]) {
      const res = await request(app).delete(path);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Event not found' });
    }
    expect((await request(app).get(url(e1.id))).body).toHaveLength(1);
  });
});
