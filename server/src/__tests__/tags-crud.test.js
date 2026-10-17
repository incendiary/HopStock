import { describe, it, expect, vi } from 'vitest';
import { makeTestDb, seedEquipment } from './helpers.js';

const testDb = makeTestDb();
vi.mock('../db/index.js', () => ({ default: testDb }));

const { default: app } = await import('../app.js');
const request = (await import('supertest')).default;

const mkTag = async (name, color) =>
  (await request(app).post('/api/tags').send({ name, color })).body;

describe('Tags CRUD edges', () => {
  it('POST defaults the colour and trims the name', async () => {
    const res = await request(app).post('/api/tags').send({ name: '  plain  ' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'plain', color: '#6366f1' });
  });

  it('POST rejects a blank name', async () => {
    const res = await request(app).post('/api/tags').send({ name: '   ' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'name is required' });
  });

  it('POST returns 409 for a duplicate name', async () => {
    await mkTag('dupe');
    const res = await request(app).post('/api/tags').send({ name: 'dupe' });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'Tag "dupe" already exists' });
  });

  it('PUT with only a colour keeps the name', async () => {
    const t = await mkTag('keepname', '#111111');
    const res = await request(app).put(`/api/tags/${t.id}`).send({ color: '#222222' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: t.id, name: 'keepname', color: '#222222' });
  });

  it('PUT returns 409 when renaming onto an existing tag', async () => {
    await mkTag('taken');
    const t = await mkTag('other');
    const res = await request(app).put(`/api/tags/${t.id}`).send({ name: 'taken' });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'Tag name already exists' });
    expect((await request(app).get('/api/tags')).body.find((x) => x.id === t.id).name).toBe(
      'other',
    );
  });

  it('PUT and DELETE return 404 for an unknown tag', async () => {
    const put = await request(app).put('/api/tags/99999').send({ name: 'x' });
    expect(put.status).toBe(404);
    expect(put.body).toEqual({ error: 'Not found' });
    const del = await request(app).delete('/api/tags/99999');
    expect(del.status).toBe(404);
    expect(del.body).toEqual({ error: 'Not found' });
  });

  it('PUT with a whitespace-only name returns 400 and keeps the stored name', async () => {
    const t = await mkTag('blankme');
    const res = await request(app).put(`/api/tags/${t.id}`).send({ name: '   ' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'name is required' });
    const list = (await request(app).get('/api/tags')).body;
    expect(list.find((x) => x.id === t.id).name).toBe('blankme');
  });
});

describe('Tag assignment and usage_count', () => {
  it('PUT /equipment/:id replaces tags, sorted by name, and usage_count follows', async () => {
    const e1 = seedEquipment(testDb);
    const e2 = seedEquipment(testDb);
    const b = await mkTag('b-tag', '#bbbbbb');
    const a = await mkTag('a-tag', '#aaaaaa');
    const c = await mkTag('c-tag', '#cccccc');

    const first = await request(app)
      .put(`/api/tags/equipment/${e1.id}`)
      .send({ tag_ids: [b.id, a.id, a.id] });
    expect(first.status).toBe(200);
    expect(first.body).toEqual([
      { id: a.id, name: 'a-tag', color: '#aaaaaa' },
      { id: b.id, name: 'b-tag', color: '#bbbbbb' },
    ]);
    await request(app)
      .put(`/api/tags/equipment/${e2.id}`)
      .send({ tag_ids: [a.id] });

    const count = async (id) =>
      (await request(app).get('/api/tags')).body.find((t) => t.id === id).usage_count;
    expect(await count(a.id)).toBe(2);
    expect(await count(b.id)).toBe(1);
    expect(await count(c.id)).toBe(0);

    const replaced = await request(app)
      .put(`/api/tags/equipment/${e1.id}`)
      .send({ tag_ids: [c.id] });
    expect(replaced.body).toEqual([{ id: c.id, name: 'c-tag', color: '#cccccc' }]);
    expect(await count(a.id)).toBe(1);
    expect(await count(b.id)).toBe(0);
    expect((await request(app).get(`/api/tags/equipment/${e1.id}`)).body).toEqual(replaced.body);

    const cleared = await request(app).put(`/api/tags/equipment/${e1.id}`).send({ tag_ids: [] });
    expect(cleared.body).toEqual([]);
  });

  it('PUT /equipment/:id 404s for unknown or soft-deleted equipment', async () => {
    const gone = seedEquipment(testDb);
    testDb.prepare('UPDATE equipment SET deleted = 1 WHERE id = ?').run(gone.id);
    for (const id of [99999, gone.id]) {
      const res = await request(app).put(`/api/tags/equipment/${id}`).send({ tag_ids: [] });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Equipment not found' });
    }
  });

  it('PUT /equipment/:id with an unknown tag id is rejected and keeps the existing tags', async () => {
    const e = seedEquipment(testDb);
    const t = await mkTag('stays');
    await request(app)
      .put(`/api/tags/equipment/${e.id}`)
      .send({ tag_ids: [t.id] });
    const res = await request(app)
      .put(`/api/tags/equipment/${e.id}`)
      .send({ tag_ids: [99999] });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Referenced record does not exist' });
    expect((await request(app).get(`/api/tags/equipment/${e.id}`)).body.map((x) => x.id)).toEqual([
      t.id,
    ]);
  });

  it('deleting a tag removes its assignments', async () => {
    const e = seedEquipment(testDb);
    const t = await mkTag('vanish');
    await request(app)
      .put(`/api/tags/equipment/${e.id}`)
      .send({ tag_ids: [t.id] });
    await request(app).delete(`/api/tags/${t.id}`);
    expect((await request(app).get(`/api/tags/equipment/${e.id}`)).body).toEqual([]);
  });

  it('GET /equipment/:id returns [] for an item with no tags', async () => {
    const e = seedEquipment(testDb);
    const res = await request(app).get(`/api/tags/equipment/${e.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
