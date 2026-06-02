import { describe, it, expect, beforeAll, vi } from 'vitest';
import { makeTestDb, seedEquipment } from './helpers.js';

const testDb = makeTestDb();
vi.mock('../db/index.js', () => ({ default: testDb }));

const { default: app } = await import('../app.js');
const request = (await import('supertest')).default;

describe('Equipment API', () => {
  describe('POST /api/equipment', () => {
    it('creates an item and returns it', async () => {
      const res = await request(app)
        .post('/api/equipment')
        .send({ name: 'Brew Kettle', category: 'kettle', condition: 'Good' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        name: 'Brew Kettle',
        category: 'kettle',
        condition: 'Good',
        quantity: 1,
      });
      expect(res.body.id).toBeTruthy();
    });

    it('rejects missing name', async () => {
      const res = await request(app)
        .post('/api/equipment')
        .send({ category: 'kettle' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.join(' ')).toMatch(/name/i);
    });

    it('rejects invalid category', async () => {
      const res = await request(app)
        .post('/api/equipment')
        .send({ name: 'X', category: 'not-a-real-category' });

      expect(res.status).toBe(400);
      expect(res.body.errors.join(' ')).toMatch(/category/i);
    });

    it('rejects invalid condition', async () => {
      const res = await request(app)
        .post('/api/equipment')
        .send({ name: 'X', category: 'kettle', condition: 'Sparkling' });

      expect(res.status).toBe(400);
      expect(res.body.errors.join(' ')).toMatch(/condition/i);
    });
  });

  describe('GET /api/equipment', () => {
    beforeAll(() => {
      seedEquipment(testDb, { name: 'Fermenter A', category: 'fermenter', condition: 'Fair' });
      seedEquipment(testDb, { name: 'Fermenter B', category: 'fermenter', condition: 'Good' });
    });

    it('returns a list of items', async () => {
      const res = await request(app).get('/api/equipment');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeGreaterThan(0);
    });

    it('filters by category', async () => {
      const res = await request(app).get('/api/equipment?category=fermenter');
      expect(res.status).toBe(200);
      expect(res.body.items.every((i) => i.category === 'fermenter')).toBe(true);
    });

    it('filters by condition', async () => {
      const res = await request(app).get('/api/equipment?condition=Fair');
      expect(res.status).toBe(200);
      expect(res.body.items.every((i) => i.condition === 'Fair')).toBe(true);
    });

    it('does not return deleted items', async () => {
      const item = seedEquipment(testDb, { name: 'ToDelete' });
      testDb.prepare('UPDATE equipment SET deleted = 1 WHERE id = ?').run(item.id);

      const res = await request(app).get('/api/equipment');
      expect(res.body.items.find((i) => i.id === item.id)).toBeUndefined();
    });
  });

  describe('GET /api/equipment/:id', () => {
    it('returns the item with photos array', async () => {
      const item = seedEquipment(testDb, { name: 'Keg Detail' });
      const res = await request(app).get(`/api/equipment/${item.id}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Keg Detail');
      expect(Array.isArray(res.body.photos)).toBe(true);
    });

    it('returns 404 for unknown id', async () => {
      const res = await request(app).get('/api/equipment/999999');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/equipment/:id', () => {
    it('updates fields and returns updated item', async () => {
      const item = seedEquipment(testDb, { name: 'Old Name' });
      const res = await request(app)
        .put(`/api/equipment/${item.id}`)
        .send({ name: 'New Name', category: 'kettle', condition: 'Retired' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('New Name');
      expect(res.body.condition).toBe('Retired');
    });
  });

  describe('DELETE /api/equipment/:id', () => {
    it('soft-deletes the item (absent from list)', async () => {
      const item = seedEquipment(testDb, { name: 'Delete Me' });

      const del = await request(app).delete(`/api/equipment/${item.id}`);
      expect(del.status).toBe(200);

      const list = await request(app).get('/api/equipment');
      expect(list.body.items.find((i) => i.id === item.id)).toBeUndefined();
    });

    it('returns 404 for unknown id', async () => {
      const res = await request(app).delete('/api/equipment/999999');
      expect(res.status).toBe(404);
    });
  });
});
