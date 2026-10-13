import { describe, it, expect, vi } from 'vitest';
import { makeTestDb, seedEquipment } from './helpers.js';

const testDb = makeTestDb();
vi.mock('../db/index.js', () => ({ default: testDb }));

const { default: app } = await import('../app.js');
const request = (await import('supertest')).default;

// Counts prepare() and exec() calls made while fn runs
async function countQueries(fn) {
  const prepare = vi.spyOn(testDb, 'prepare');
  const exec = vi.spyOn(testDb, 'exec');
  try {
    await fn();
    return prepare.mock.calls.length + exec.mock.calls.length;
  } finally {
    prepare.mockRestore();
    exec.mockRestore();
  }
}

function seedRich(n, prefix) {
  const loc = testDb.prepare('INSERT INTO locations (name) VALUES (?)').run(`${prefix} shelf`).lastInsertRowid;
  const tagA = testDb.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(`${prefix}-b`, '#111111').lastInsertRowid;
  const tagB = testDb.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(`${prefix}-A`, '#222222').lastInsertRowid;
  for (let i = 0; i < n; i++) {
    const { id } = seedEquipment(testDb, { name: `${prefix} ${String(i).padStart(3, '0')}` });
    testDb.prepare('UPDATE equipment SET location_id = ? WHERE id = ?').run(i % 2 ? loc : null, id);
    testDb.prepare('INSERT INTO photos (equipment_id, filename, sort_order) VALUES (?, ?, ?)').run(id, `${id}-2.jpg`, 2);
    testDb.prepare('INSERT INTO photos (equipment_id, filename, sort_order) VALUES (?, ?, ?)').run(id, `${id}-1.jpg`, 1);
    testDb.prepare('INSERT INTO equipment_tags (equipment_id, tag_id) VALUES (?, ?)').run(id, tagA);
    testDb.prepare('INSERT INTO equipment_tags (equipment_id, tag_id) VALUES (?, ?)').run(id, tagB);
    testDb.prepare('INSERT INTO loans (equipment_id, borrower, loaned_at, returned_at) VALUES (?, ?, ?, ?)')
      .run(id, 'old', '2024-01-01T00:00:00Z', '2024-01-02T00:00:00Z');
    testDb.prepare('INSERT INTO loans (equipment_id, borrower, loaned_at) VALUES (?, ?, ?)').run(id, 'older', '2024-02-01T00:00:00Z');
    if (i % 3 === 0) {
      testDb.prepare('INSERT INTO loans (equipment_id, borrower, loaned_at) VALUES (?, ?, ?)').run(id, 'newest', '2024-03-01T00:00:00Z');
    }
  }
}

describe('GET /api/equipment list queries', () => {
  it('matches the single-item shape for every item', async () => {
    seedRich(6, 'shape');
    seedEquipment(testDb, { name: 'shape bare' });
    const list = await request(app).get('/api/equipment');
    expect(list.body.items.length).toBeGreaterThan(6);
    for (const item of list.body.items) {
      const single = await request(app).get(`/api/equipment/${item.id}`);
      expect(item).toEqual(single.body);
    }
    expect(list.body.items.some((i) => i.location && i.activeLoan?.borrower === 'newest')).toBe(true);
  });

  it('uses a constant number of queries', async () => {
    const run = () => request(app).get('/api/equipment').then((r) => expect(r.status).toBe(200));
    const before = await countQueries(run);
    seedRich(60, 'many');
    const after = await countQueries(run);
    expect(after).toBe(before);
    expect(after).toBeLessThanOrEqual(6);
  });

  it('paginates with limit and offset and keeps the full total', async () => {
    const all = (await request(app).get('/api/equipment')).body;
    const page = await request(app).get('/api/equipment?limit=5&offset=2');
    expect(page.status).toBe(200);
    expect(page.body.items.map((i) => i.id)).toEqual(all.items.slice(2, 7).map((i) => i.id));
    expect(page.body.total).toBe(all.total);
    expect((await request(app).get('/api/equipment?offset=3')).body.items).toHaveLength(all.total - 3);
    expect((await request(app).get('/api/equipment?limit=0')).body).toMatchObject({ items: [], total: all.total });
    const filtered = await request(app).get('/api/equipment?q=many&limit=10');
    expect(filtered.body.items).toHaveLength(10);
    expect(filtered.body.total).toBe(60);
  });

  it('caps limit at 500', async () => {
    const res = await request(app).get('/api/equipment?limit=100000');
    expect(res.status).toBe(200);
  });

  it('rejects invalid limit and offset', async () => {
    for (const qs of ['limit=-1', 'limit=abc', 'limit=1.5', 'offset=-2', 'offset=x', 'limit=', 'limit=1&limit=2']) {
      const res = await request(app).get(`/api/equipment?${qs}`);
      expect(res.status, qs).toBe(400);
      expect(res.body.error).toMatch(/non-negative/);
    }
  });
});

describe('GET /api/routines list queries', () => {
  function seedRoutines(n) {
    for (let i = 0; i < n; i++) {
      const id = testDb.prepare('INSERT INTO service_routines (name) VALUES (?)').run(`routine ${i}`).lastInsertRowid;
      testDb.prepare('INSERT INTO routine_steps (routine_id, instruction) VALUES (?, ?)').run(id, 'step');
      const eq = seedEquipment(testDb, { name: `r-eq ${i}` });
      testDb.prepare('INSERT INTO routine_equipment (routine_id, equipment_id) VALUES (?, ?)').run(id, eq.id);
      testDb.prepare('INSERT INTO maintenance_events (equipment_id, event_type, performed_at, notes) VALUES (?, ?, ?, ?)')
        .run(eq.id, 'cleaning', '2024-05-01T00:00:00Z', `Ran it [routine:${id}]`);
    }
  }

  it('returns counts and last_run', async () => {
    seedRoutines(2);
    const res = await request(app).get('/api/routines');
    expect(res.body).toHaveLength(2);
    for (const r of res.body) {
      expect(r).toMatchObject({ step_count: 1, equipment_count: 1, last_run: '2024-05-01T00:00:00Z' });
    }
  });

  it('uses a constant number of queries', async () => {
    const run = () => request(app).get('/api/routines').then((r) => expect(r.status).toBe(200));
    const before = await countQueries(run);
    seedRoutines(40);
    const after = await countQueries(run);
    expect(after).toBe(before);
    expect(after).toBeLessThanOrEqual(6);
  });
});
