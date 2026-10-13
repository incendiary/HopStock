import { describe, it, expect, vi } from 'vitest';
import { makeTestDb, seedEquipment } from './helpers.js';

const testDb = makeTestDb();
vi.mock('../db/index.js', () => ({ default: testDb }));

const { default: app } = await import('../app.js');
const request = (await import('supertest')).default;

describe('Maintenance validation', () => {
  const post = (id, body) => request(app).post(`/api/equipment/${id}/maintenance`).send(body);

  it('rejects an unparseable performed_at', async () => {
    const item = seedEquipment(testDb);
    for (const performed_at of ['not-a-date', 123]) {
      const res = await post(item.id, { event_type: 'Serviced', performed_at });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('performed_at must be a valid date');
    }
  });

  it('accepts a valid performed_at and defaults when omitted', async () => {
    const item = seedEquipment(testDb);
    const given = await post(item.id, { event_type: 'Serviced', performed_at: '2026-01-02T03:04:05Z' });
    expect(given.status).toBe(201);
    expect(given.body.performed_at).toBe('2026-01-02T03:04:05Z');
    const dflt = await post(item.id, { event_type: 'Serviced' });
    expect(dflt.status).toBe(201);
    expect(dflt.body.performed_at).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
  });
});
