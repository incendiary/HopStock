import { describe, it, expect, vi, afterAll, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { makeTestDb, seedEquipment } from './helpers.js';

const uploadsDir = mkdtempSync(join(tmpdir(), 'hopstock-errors-'));
process.env.UPLOADS_DIR = uploadsDir;

const testDb = makeTestDb();
vi.mock('../db/index.js', () => ({ default: testDb }));

const { default: app } = await import('../app.js');
const request = (await import('supertest')).default;

afterAll(() => rmSync(uploadsDir, { recursive: true, force: true }));
afterEach(() => vi.restoreAllMocks());

describe('Error middleware', () => {
  it('maps a foreign-key violation to 400 JSON', async () => {
    const item = seedEquipment(testDb);
    // RA-6 now rejects unknown locations up front; bypass that check to reach the raw FK error
    const realPrepare = testDb.prepare.bind(testDb);
    vi.spyOn(testDb, 'prepare').mockImplementation((sql) =>
      sql.includes('FROM locations WHERE id') ? { get: () => ({ 1: 1 }) } : realPrepare(sql),
    );
    const res = await request(app).put(`/api/equipment/${item.id}`).send({
      name: item.name,
      category: item.category,
      condition: item.condition,
      location_id: 9999,
    });
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toEqual({ error: 'Referenced record does not exist' });
  });

  it('returns 500 JSON without a stack for unexpected errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(testDb, 'prepare').mockImplementationOnce(() => {
      throw new Error('boom at /secret/path');
    });
    const res = await request(app).get('/api/equipment/1');
    expect(res.status).toBe(500);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toEqual({ error: 'Internal server error' });
    expect(res.text).not.toMatch(/boom|secret|at /);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('boom at /secret/path'));
  });

  it('routes a non-ENOENT unlink failure to the middleware and stays up', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const item = seedEquipment(testDb);
    // A directory where the file should be makes unlink fail with EISDIR/EPERM
    mkdirSync(join(uploadsDir, 'undeletable.jpg'));
    const { lastInsertRowid } = testDb
      .prepare('INSERT INTO photos (equipment_id, filename, sort_order) VALUES (?, ?, 0)')
      .run(item.id, 'undeletable.jpg');

    const res = await request(app).delete(`/api/equipment/${item.id}/photos/${lastInsertRowid}`);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
    // Row kept, and the app still answers
    expect(testDb.prepare('SELECT id FROM photos WHERE id = ?').get(lastInsertRowid)).toBeTruthy();
    expect((await request(app).get('/api/health')).status).toBe(200);
  });
});
