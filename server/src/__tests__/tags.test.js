import { describe, it, expect, vi } from 'vitest';
import { makeTestDb, seedEquipment } from './helpers.js';

const testDb = makeTestDb();
vi.mock('../db/index.js', () => ({ default: testDb }));

const { default: app } = await import('../app.js');
const request = (await import('supertest')).default;

describe('Tags API', () => {
  it('creates a tag', async () => {
    const res = await request(app)
      .post('/api/tags')
      .send({ name: 'lager-setup', color: '#3b82f6' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'lager-setup', color: '#3b82f6' });
  });

  it('lists tags', async () => {
    const res = await request(app).get('/api/tags');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('updates a tag', async () => {
    const created = await request(app)
      .post('/api/tags')
      .send({ name: 'original', color: '#aaa' });
    const id = created.body.id;

    const res = await request(app)
      .put(`/api/tags/${id}`)
      .send({ name: 'renamed', color: '#bbb' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('renamed');
  });

  it('deletes a tag', async () => {
    const created = await request(app)
      .post('/api/tags')
      .send({ name: 'to-delete', color: '#ccc' });
    const id = created.body.id;

    const del = await request(app).delete(`/api/tags/${id}`);
    expect(del.status).toBe(200);

    const list = await request(app).get('/api/tags');
    expect(list.body.find((t) => t.id === id)).toBeUndefined();
  });

  it('assigned tag appears on equipment (batch uses tag id)', async () => {
    const item = seedEquipment(testDb);
    const tag = await request(app)
      .post('/api/tags')
      .send({ name: 'keezer', color: '#10b981' });

    // batch action uses tag id (not name)
    await request(app)
      .post('/api/equipment/batch')
      .send({ ids: [item.id], action: 'tag', value: tag.body.id });

    const detail = await request(app).get(`/api/equipment/${item.id}`);
    expect(detail.body.tags.some((t) => t.name === 'keezer')).toBe(true);
  });
});
