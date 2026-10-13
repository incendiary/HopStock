import { describe, it, expect, vi } from 'vitest';
import { makeTestDb } from './helpers.js';

const testDb = makeTestDb();
vi.mock('../db/index.js', () => ({ default: testDb }));

const { default: app } = await import('../app.js');
const request = (await import('supertest')).default;

describe('Routines validation', () => {
  const create = (body) => request(app).post('/api/routines').send(body);

  it('creates a valid routine', async () => {
    const res = await create({ name: 'Descale', interval_days: 30, steps: [{ instruction: 'Rinse' }] });
    expect(res.status).toBe(201);
    expect(res.body.steps).toHaveLength(1);
  });

  it('rejects a non-string name on create', async () => {
    const res = await create({ name: 42 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('name is required');
  });

  it('rejects a non-string name on update', async () => {
    const { body } = await create({ name: 'Clean' });
    const res = await request(app).put(`/api/routines/${body.id}`).send({ name: 42 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('name cannot be empty');
  });

  it('rejects an empty step instruction', async () => {
    for (const steps of [[{ instruction: '  ' }], [{}], [{ instruction: 5 }]]) {
      const res = await create({ name: 'Steps', steps });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('each step needs a non-empty instruction');
    }
  });

  it('rejects an empty step instruction on update', async () => {
    const { body } = await create({ name: 'Upd' });
    const res = await request(app).put(`/api/routines/${body.id}`).send({ steps: [{ instruction: '' }] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('each step needs a non-empty instruction');
  });

  it('rejects an invalid interval_days', async () => {
    for (const interval_days of [0, -3, 1.5, '7']) {
      const res = await create({ name: 'Interval', interval_days });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('interval_days must be a positive integer or null');
    }
  });

  it('accepts a null interval_days', async () => {
    const res = await create({ name: 'No interval', interval_days: null });
    expect(res.status).toBe(201);
  });
});
