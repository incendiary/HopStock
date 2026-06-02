import { describe, it, expect, vi } from 'vitest';
import { makeTestDb, seedEquipment } from './helpers.js';

const testDb = makeTestDb();
vi.mock('../db/index.js', () => ({ default: testDb }));

const { default: app } = await import('../app.js');
const request = (await import('supertest')).default;

describe('Loans API', () => {
  it('records a loan and shows activeLoan on equipment', async () => {
    const item = seedEquipment(testDb);

    const res = await request(app)
      .post(`/api/equipment/${item.id}/loans`)
      .send({ borrower: 'Alice', loaned_at: '2026-01-01' });

    expect(res.status).toBe(201);
    expect(res.body.borrower).toBe('Alice');

    const detail = await request(app).get(`/api/equipment/${item.id}`);
    expect(detail.body.activeLoan).toMatchObject({ borrower: 'Alice' });
  });

  it('marks a loan returned and clears activeLoan', async () => {
    const item = seedEquipment(testDb);
    const loan = await request(app)
      .post(`/api/equipment/${item.id}/loans`)
      .send({ borrower: 'Bob', loaned_at: '2026-01-01' });

    await request(app)
      .put(`/api/equipment/${item.id}/loans/${loan.body.id}/return`)
      .send({ returned_at: '2026-02-01' });

    const detail = await request(app).get(`/api/equipment/${item.id}`);
    expect(detail.body.activeLoan).toBeNull();
  });

  it('onLoan filter returns only loaned items', async () => {
    const loaned  = seedEquipment(testDb, { name: 'Loaned Keg' });
    const present = seedEquipment(testDb, { name: 'Present Keg' });

    await request(app)
      .post(`/api/equipment/${loaned.id}/loans`)
      .send({ borrower: 'Carol', loaned_at: '2026-01-01' });

    const res = await request(app).get('/api/equipment?onLoan=1');
    const ids = res.body.items.map((i) => i.id);
    expect(ids).toContain(loaned.id);
    expect(ids).not.toContain(present.id);
  });

  it('deletes a loan record', async () => {
    const item = seedEquipment(testDb);
    const loan = await request(app)
      .post(`/api/equipment/${item.id}/loans`)
      .send({ borrower: 'Dave', loaned_at: '2026-01-01' });

    const del = await request(app)
      .delete(`/api/equipment/${item.id}/loans/${loan.body.id}`);
    expect(del.status).toBe(200);

    const list = await request(app).get(`/api/equipment/${item.id}/loans`);
    expect(list.body.find((l) => l.id === loan.body.id)).toBeUndefined();
  });
});
