import { describe, it, expect, vi } from 'vitest';
import { makeTestDb, seedEquipment } from './helpers.js';

const testDb = makeTestDb();
vi.mock('../db/index.js', () => ({ default: testDb }));

const { default: app } = await import('../app.js');
const request = (await import('supertest')).default;

const url = (id) => `/api/equipment/${id}/loans`;
const lend = async (id, body) => (await request(app).post(url(id)).send(body)).body;

describe('Loans edges', () => {
  it('POST requires a non-blank string borrower', async () => {
    const e = seedEquipment(testDb);
    for (const borrower of ['  ', 5, undefined]) {
      const res = await request(app).post(url(e.id)).send({ borrower });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'borrower is required' });
    }
  });

  it('POST stores trimmed borrower, expected_return and notes, and defaults loaned_at', async () => {
    const e = seedEquipment(testDb);
    const res = await request(app)
      .post(url(e.id))
      .send({ borrower: '  Eve  ', expected_return: '2026-05-01', notes: 'with lid' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      equipment_id: e.id,
      borrower: 'Eve',
      expected_return: '2026-05-01',
      notes: 'with lid',
      returned_at: null,
    });
    expect(res.body.loaned_at).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
  });

  it('GET and POST 404 for unknown or soft-deleted equipment', async () => {
    const gone = seedEquipment(testDb);
    testDb.prepare('UPDATE equipment SET deleted = 1 WHERE id = ?').run(gone.id);
    for (const id of [99999, gone.id]) {
      const get = await request(app).get(url(id));
      expect(get.status).toBe(404);
      expect(get.body).toEqual({ error: 'Not found' });
      const post = await request(app).post(url(id)).send({ borrower: 'X' });
      expect(post.status).toBe(404);
      expect(post.body).toEqual({ error: 'Not found' });
    }
  });

  it('GET lists loans newest loaned_at first', async () => {
    const e = seedEquipment(testDb);
    const old = await lend(e.id, { borrower: 'Old', loaned_at: '2026-01-01' });
    const mid = await lend(e.id, { borrower: 'Mid', loaned_at: '2026-03-01' });
    const recent = await lend(e.id, { borrower: 'New', loaned_at: '2026-06-01' });
    const res = await request(app).get(url(e.id));
    expect(res.status).toBe(200);
    expect(res.body.map((l) => l.id)).toEqual([recent.id, mid.id, old.id]);
  });

  it('return stores the given returned_at and returns the updated loan', async () => {
    const e = seedEquipment(testDb);
    const loan = await lend(e.id, { borrower: 'Fay', loaned_at: '2026-01-01' });
    const res = await request(app)
      .put(`${url(e.id)}/${loan.id}/return`)
      .send({ returned_at: '2026-02-02' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: loan.id, borrower: 'Fay', returned_at: '2026-02-02' });
  });

  it('return defaults returned_at to now when none is given', async () => {
    const e = seedEquipment(testDb);
    const loan = await lend(e.id, { borrower: 'Gus' });
    const res = await request(app)
      .put(`${url(e.id)}/${loan.id}/return`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.returned_at).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
  });

  it('returning twice is rejected and keeps the first returned_at', async () => {
    const e = seedEquipment(testDb);
    const loan = await lend(e.id, { borrower: 'Hal' });
    await request(app)
      .put(`${url(e.id)}/${loan.id}/return`)
      .send({ returned_at: '2026-02-02' });
    const res = await request(app)
      .put(`${url(e.id)}/${loan.id}/return`)
      .send({ returned_at: '2026-09-09' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Already returned' });
    const row = testDb.prepare('SELECT returned_at FROM loans WHERE id = ?').get(loan.id);
    expect(row.returned_at).toBe('2026-02-02');
  });

  it('return and delete 404 for an unknown loan or a loan on another item', async () => {
    const e1 = seedEquipment(testDb);
    const e2 = seedEquipment(testDb);
    const loan = await lend(e1.id, { borrower: 'Ivy' });
    for (const [method, path] of [
      ['put', `${url(e1.id)}/99999/return`],
      ['put', `${url(e2.id)}/${loan.id}/return`],
      ['delete', `${url(e1.id)}/99999`],
      ['delete', `${url(e2.id)}/${loan.id}`],
    ]) {
      const res = await request(app)[method](path).send({});
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Not found' });
    }
    expect(
      testDb.prepare('SELECT returned_at FROM loans WHERE id = ?').get(loan.id).returned_at,
    ).toBeNull();
  });

  it('delete returns { success: true } and removes only that loan', async () => {
    const e = seedEquipment(testDb);
    const keep = await lend(e.id, { borrower: 'Keep' });
    const drop = await lend(e.id, { borrower: 'Drop' });
    const res = await request(app).delete(`${url(e.id)}/${drop.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect((await request(app).get(url(e.id))).body.map((l) => l.id)).toEqual([keep.id]);
  });
});
