import { describe, it, expect, vi } from 'vitest';
import { makeTestDb, seedEquipment } from './helpers.js';

const testDb = makeTestDb();
vi.mock('../db/index.js', () => ({ default: testDb }));

const { default: app } = await import('../app.js');
const request = (await import('supertest')).default;

describe('Locations API', () => {
  it('creates a location', async () => {
    const res = await request(app)
      .post('/api/locations')
      .send({ name: 'Garage Shelf 1', notes: 'Top shelf' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Garage Shelf 1' });
  });

  it('lists locations with item_count', async () => {
    const loc = await request(app)
      .post('/api/locations')
      .send({ name: 'Keezer' });

    const item = seedEquipment(testDb);
    await request(app)
      .put(`/api/equipment/${item.id}`)
      .send({ name: item.name, category: item.category, condition: item.condition, location_id: loc.body.id });

    const list = await request(app).get('/api/locations');
    expect(list.status).toBe(200);
    const found = list.body.find((l) => l.id === loc.body.id);
    expect(found.item_count).toBe(1);
  });

  it('filters equipment by location', async () => {
    const loc = await request(app)
      .post('/api/locations')
      .send({ name: 'Under Stairs' });

    const item = seedEquipment(testDb, { name: 'Stair Item' });
    await request(app)
      .put(`/api/equipment/${item.id}`)
      .send({ name: item.name, category: item.category, condition: item.condition, location_id: loc.body.id });

    const res = await request(app).get(`/api/equipment?location=${loc.body.id}`);
    expect(res.body.items.every((i) => i.location?.id === loc.body.id)).toBe(true);
  });

  it('updates a location', async () => {
    const created = await request(app)
      .post('/api/locations')
      .send({ name: 'Old Name' });

    const res = await request(app)
      .put(`/api/locations/${created.body.id}`)
      .send({ name: 'New Name' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
  });

  it('deletes a location and nullifies equipment FK', async () => {
    const loc = await request(app)
      .post('/api/locations')
      .send({ name: 'To Delete' });

    const item = seedEquipment(testDb);
    testDb.prepare('UPDATE equipment SET location_id = ? WHERE id = ?').run(loc.body.id, item.id);

    await request(app).delete(`/api/locations/${loc.body.id}`);

    const detail = await request(app).get(`/api/equipment/${item.id}`);
    expect(detail.body.location).toBeNull();
  });
});
