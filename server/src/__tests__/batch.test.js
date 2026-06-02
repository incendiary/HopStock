import { describe, it, expect, vi } from 'vitest';
import { makeTestDb, seedEquipment } from './helpers.js';

const testDb = makeTestDb();
vi.mock('../db/index.js', () => ({ default: testDb }));

const { default: app } = await import('../app.js');
const request = (await import('supertest')).default;

describe('Batch operations API', () => {
  it('bulk updates condition', async () => {
    const a = seedEquipment(testDb, { name: 'Batch A', condition: 'Good' });
    const b = seedEquipment(testDb, { name: 'Batch B', condition: 'Good' });

    const res = await request(app)
      .post('/api/equipment/batch')
      .send({ ids: [a.id, b.id], action: 'condition', value: 'Retired' });

    expect(res.status).toBe(200);

    const detailA = await request(app).get(`/api/equipment/${a.id}`);
    const detailB = await request(app).get(`/api/equipment/${b.id}`);
    expect(detailA.body.condition).toBe('Retired');
    expect(detailB.body.condition).toBe('Retired');
  });

  it('bulk soft-deletes items', async () => {
    const a = seedEquipment(testDb, { name: 'Del A' });
    const b = seedEquipment(testDb, { name: 'Del B' });

    const res = await request(app)
      .post('/api/equipment/batch')
      .send({ ids: [a.id, b.id], action: 'delete' });

    expect(res.status).toBe(200);

    const list = await request(app).get('/api/equipment');
    const ids = list.body.items.map((i) => i.id);
    expect(ids).not.toContain(a.id);
    expect(ids).not.toContain(b.id);
  });

  it('bulk adds a tag by tag id', async () => {
    const a = seedEquipment(testDb, { name: 'Tag A' });
    const b = seedEquipment(testDb, { name: 'Tag B' });

    const tagRes = await request(app).post('/api/tags').send({ name: 'batch-tag', color: '#f00' });
    const tagId = tagRes.body.id;

    const res = await request(app)
      .post('/api/equipment/batch')
      .send({ ids: [a.id, b.id], action: 'tag', value: tagId });

    expect(res.status).toBe(200);

    const detailA = await request(app).get(`/api/equipment/${a.id}`);
    expect(detailA.body.tags.some((t) => t.id === tagId)).toBe(true);
  });

  it('bulk assigns a location', async () => {
    const loc = await request(app)
      .post('/api/locations')
      .send({ name: 'Batch Location' });
    const a = seedEquipment(testDb, { name: 'Loc A' });
    const b = seedEquipment(testDb, { name: 'Loc B' });

    const res = await request(app)
      .post('/api/equipment/batch')
      .send({ ids: [a.id, b.id], action: 'location', value: loc.body.id });

    expect(res.status).toBe(200);

    const detailA = await request(app).get(`/api/equipment/${a.id}`);
    expect(detailA.body.location?.id).toBe(loc.body.id);
  });

  it('rejects unknown action', async () => {
    const a = seedEquipment(testDb);
    const res = await request(app)
      .post('/api/equipment/batch')
      .send({ ids: [a.id], action: 'explode' });

    expect(res.status).toBe(400);
  });

  it('rejects empty ids array', async () => {
    const res = await request(app)
      .post('/api/equipment/batch')
      .send({ ids: [], action: 'delete' });

    expect(res.status).toBe(400);
  });
});
