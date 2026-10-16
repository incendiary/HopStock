import { describe, it, expect, vi } from 'vitest';
import { makeTestDb, seedEquipment } from './helpers.js';

const testDb = makeTestDb();
vi.mock('../db/index.js', () => ({ default: testDb }));

const { default: app } = await import('../app.js');
const request = (await import('supertest')).default;

import { CATEGORIES, CONDITIONS, MAINTENANCE_EVENT_TYPES } from '../db/constants.js';

describe('Meta constants endpoints', () => {
  it('GET /api/categories returns the category constants', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(CATEGORIES);
    expect(res.body.find((c) => c.id === 'kettle')).toEqual({
      id: 'kettle',
      label: 'Kettle',
      group: 'Vessels',
    });
  });

  it('GET /api/conditions returns the four conditions in order', async () => {
    const res = await request(app).get('/api/conditions');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(['Good', 'Fair', 'Needs Repair', 'Retired']);
    expect(res.body).toEqual(CONDITIONS);
  });

  it('GET /api/maintenance-event-types returns the event types in order', async () => {
    const res = await request(app).get('/api/maintenance-event-types');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(['Cleaned', 'Serviced', 'Repaired', 'Replaced Part', 'Inspected']);
    expect(res.body).toEqual(MAINTENANCE_EVENT_TYPES);
  });
});

describe('GET /api/stats', () => {
  it('returns zeroed stats on an empty database', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      total: 0,
      totalUnits: 0,
      photos: 0,
      onLoan: 0,
      byCondition: CONDITIONS.map((condition) => ({ condition, count: 0 })),
      byCategory: [],
      byLocation: [],
      valueSummary: { priced_count: 0, unpriced_count: 0, total_value: 0 },
    });
  });

  it('computes exact values on a seeded set and ignores soft-deleted items', async () => {
    const loc = testDb
      .prepare("INSERT INTO locations (name) VALUES ('Shed')")
      .run().lastInsertRowid;
    const a = seedEquipment(testDb, {
      name: 'A',
      category: 'kettle',
      condition: 'Good',
      quantity: 3,
    });
    const b = seedEquipment(testDb, { name: 'B', category: 'kettle', condition: 'Fair' });
    const c = seedEquipment(testDb, { name: 'C', category: 'keg', condition: 'Good' });
    const d = seedEquipment(testDb, { name: 'Deleted', category: 'pump', condition: 'Retired' });
    testDb.prepare('UPDATE equipment SET location_id = ? WHERE id IN (?, ?)').run(loc, a.id, b.id);
    testDb.prepare('UPDATE equipment SET purchase_price = 10.5 WHERE id = ?').run(a.id);
    testDb.prepare('UPDATE equipment SET purchase_price = 4.25 WHERE id = ?').run(c.id);
    testDb.prepare('UPDATE equipment SET purchase_price = 100, deleted = 1 WHERE id = ?').run(d.id);
    const photo = testDb.prepare('INSERT INTO photos (equipment_id, filename) VALUES (?, ?)');
    photo.run(a.id, 'a1.jpg');
    photo.run(a.id, 'a2.jpg');
    photo.run(d.id, 'd.jpg');
    const loan = testDb.prepare(
      'INSERT INTO loans (equipment_id, borrower, returned_at) VALUES (?, ?, ?)',
    );
    loan.run(a.id, 'Ann', null);
    loan.run(a.id, 'Ben', null);
    loan.run(b.id, 'Cat', '2026-01-01');
    loan.run(d.id, 'Dee', null);

    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.totalUnits).toBe(5);
    expect(res.body.photos).toBe(2);
    expect(res.body.onLoan).toBe(1);
    expect(res.body.byCondition).toEqual([
      { condition: 'Good', count: 2 },
      { condition: 'Fair', count: 1 },
      { condition: 'Needs Repair', count: 0 },
      { condition: 'Retired', count: 0 },
    ]);
    expect(res.body.byCategory).toEqual([
      { category: 'kettle', count: 2 },
      { category: 'keg', count: 1 },
    ]);
    expect(res.body.valueSummary).toEqual({
      priced_count: 2,
      unpriced_count: 1,
      total_value: 14.75,
    });
    expect(res.body.byLocation).toEqual([
      { name: 'Shed', id: Number(loc), count: 2 },
      { name: 'Unassigned', id: null, count: 1 },
    ]);
  });
});
