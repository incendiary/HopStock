import { describe, it, expect, vi } from 'vitest';
import { makeTestDb, seedEquipment } from './helpers.js';

const testDb = makeTestDb();
vi.mock('../db/index.js', () => ({ default: testDb }));

const { default: app } = await import('../app.js');
const request = (await import('supertest')).default;

const mk = async (name, notes) =>
  (await request(app).post('/api/locations').send({ name, notes })).body;

describe('Locations edges', () => {
  it('POST stores notes, trims the name and defaults notes to null', async () => {
    const a = await request(app).post('/api/locations').send({ name: '  Loft  ', notes: 'dry' });
    expect(a.status).toBe(201);
    expect(a.body).toMatchObject({ name: 'Loft', notes: 'dry' });
    const b = await request(app).post('/api/locations').send({ name: 'Cellar' });
    expect(b.body.notes).toBeNull();
  });

  it('POST rejects a blank or non-string name', async () => {
    for (const name of ['  ', 42, undefined]) {
      const res = await request(app).post('/api/locations').send({ name });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'name is required' });
    }
  });

  it('POST returns 409 for a duplicate name', async () => {
    await mk('Dup');
    const res = await request(app).post('/api/locations').send({ name: 'Dup' });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'A location with that name already exists' });
  });

  it('GET /:id returns the location, or 404', async () => {
    const l = await mk('Findable', 'n');
    const ok = await request(app).get(`/api/locations/${l.id}`);
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ id: l.id, name: 'Findable', notes: 'n' });
    const missing = await request(app).get('/api/locations/99999');
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: 'Not found' });
  });

  it('PUT with only notes keeps the name, and with only a name keeps the notes', async () => {
    const l = await mk('Keep', 'orig');
    const notesOnly = await request(app).put(`/api/locations/${l.id}`).send({ notes: 'changed' });
    expect(notesOnly.body).toMatchObject({ name: 'Keep', notes: 'changed' });
    const nameOnly = await request(app).put(`/api/locations/${l.id}`).send({ name: 'Kept' });
    expect(nameOnly.body).toMatchObject({ name: 'Kept', notes: 'changed' });
  });

  it('PUT rejects a blank name, 409s on a duplicate and 404s when unknown', async () => {
    await mk('Taken');
    const l = await mk('Mine');
    const blank = await request(app).put(`/api/locations/${l.id}`).send({ name: ' ' });
    expect(blank.status).toBe(400);
    expect(blank.body).toEqual({ error: 'name is required' });
    const dup = await request(app).put(`/api/locations/${l.id}`).send({ name: 'Taken' });
    expect(dup.status).toBe(409);
    expect(dup.body).toEqual({ error: 'A location with that name already exists' });
    const missing = await request(app).put('/api/locations/99999').send({ name: 'x' });
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: 'Not found' });
  });

  it('DELETE returns success, removes the row and 404s the second time', async () => {
    const l = await mk('Bin');
    const res = await request(app).delete(`/api/locations/${l.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect((await request(app).get(`/api/locations/${l.id}`)).status).toBe(404);
    const again = await request(app).delete(`/api/locations/${l.id}`);
    expect(again.status).toBe(404);
    expect(again.body).toEqual({ error: 'Not found' });
  });

  it('item_count excludes soft-deleted equipment and is 0 for an empty location', async () => {
    const l = await mk('Counted');
    const empty = await mk('Empty');
    const live = seedEquipment(testDb);
    const gone = seedEquipment(testDb);
    testDb
      .prepare('UPDATE equipment SET location_id = ? WHERE id IN (?, ?)')
      .run(l.id, live.id, gone.id);
    testDb.prepare('UPDATE equipment SET deleted = 1 WHERE id = ?').run(gone.id);
    const list = (await request(app).get('/api/locations')).body;
    expect(list.find((x) => x.id === l.id).item_count).toBe(1);
    expect(list.find((x) => x.id === empty.id).item_count).toBe(0);
  });
});
