import { describe, it, expect, vi, beforeAll } from 'vitest';
import { makeTestDb, seedEquipment } from './helpers.js';

const testDb = makeTestDb();
vi.mock('../db/index.js', () => ({ default: testDb }));

const { default: app } = await import('../app.js');
const request = (await import('supertest')).default;

describe('Stats API', () => {
  beforeAll(() => {
    // Seed known data
    seedEquipment(testDb, { name: 'S1', category: 'kettle',    condition: 'Good',        quantity: 2 });
    seedEquipment(testDb, { name: 'S2', category: 'fermenter', condition: 'Fair',        quantity: 1 });
    seedEquipment(testDb, { name: 'S3', category: 'keg',       condition: 'Needs Repair', quantity: 1 });

    // One with a purchase price
    testDb.prepare(`
      INSERT INTO equipment (name, category, condition, quantity, purchase_price, purchase_currency)
      VALUES ('S4', 'kettle', 'Good', 1, 99.99, 'GBP')
    `).run();
  });

  it('returns total item count', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(4);
  });

  it('byCondition includes all four conditions', async () => {
    const res = await request(app).get('/api/stats');
    const conditions = res.body.byCondition.map((r) => r.condition);
    expect(conditions).toContain('Good');
    expect(conditions).toContain('Fair');
    expect(conditions).toContain('Needs Repair');
    expect(conditions).toContain('Retired');
  });

  it('byCategory groups items correctly', async () => {
    const res = await request(app).get('/api/stats');
    const kettleRow = res.body.byCategory.find((r) => r.category === 'kettle');
    expect(kettleRow).toBeDefined();
    expect(kettleRow.count).toBeGreaterThanOrEqual(2); // S1 + S4
  });

  it('valueSummary sums purchase prices', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.body.valueSummary.total_value).toBeGreaterThanOrEqual(99.99);
    expect(res.body.valueSummary.priced_count).toBeGreaterThanOrEqual(1);
  });

  it('onLoan count reflects active loans', async () => {
    const item = seedEquipment(testDb);
    await request(app)
      .post(`/api/equipment/${item.id}/loans`)
      .send({ borrower: 'StatsTest', loaned_at: '2026-01-01' });

    const res = await request(app).get('/api/stats');
    expect(res.body.onLoan).toBeGreaterThanOrEqual(1);
  });
});
