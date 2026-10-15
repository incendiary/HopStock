import { describe, it, expect, beforeEach, vi } from 'vitest';
import { makeTestDb, seedEquipment } from './helpers.js';

const testDb = makeTestDb();
vi.mock('../db/index.js', () => ({ default: testDb }));

const { default: app } = await import('../app.js');
const request = (await import('supertest')).default;

const upload = (content, filename) =>
  request(app).post('/api/import').attach('file', Buffer.from(content), filename);

const exportJson = async () => (await request(app).get('/api/export/json')).body;

// Ids and timestamps legitimately differ between databases; everything else must match.
const normalise = (items) => items.map((it) => {
  const { id, created_at, updated_at, location_id, photos, ...rest } = it;
  return { ...rest, photos: photos.map(({ id: _i, created_at: _c, ...p }) => p) };
});

function clearAll() {
  testDb.exec(`
    DELETE FROM equipment_tags; DELETE FROM photos; DELETE FROM equipment;
    DELETE FROM tags; DELETE FROM locations;
  `);
}

function seedFixture() {
  const loc = testDb.prepare("INSERT INTO locations (name) VALUES ('Brew shed')").run().lastInsertRowid;
  const a = seedEquipment(testDb, { name: 'Boil Kettle', category: 'kettle', notes: 'Stainless', icon: 'kettle', quantity: 3 });
  testDb.prepare(`
    UPDATE equipment SET purchase_date = '2024-03-01', purchase_price = 129.5, purchase_currency = 'USD',
      retailer = 'Brew Co', serial_number = 'SN-1', model_number = 'M-9', warranty_expires = '2027-03-01',
      location_id = ? WHERE id = ?
  `).run(loc, a.id);
  const t1 = testDb.prepare("INSERT INTO tags (name, color) VALUES ('stainless', '#112233')").run().lastInsertRowid;
  const t2 = testDb.prepare("INSERT INTO tags (name, color) VALUES ('brew-day', '#aabbcc')").run().lastInsertRowid;
  testDb.prepare('INSERT INTO equipment_tags VALUES (?, ?)').run(a.id, t1);
  testDb.prepare('INSERT INTO equipment_tags VALUES (?, ?)').run(a.id, t2);
  seedEquipment(testDb, { name: 'Spare Pump', category: 'pump', condition: 'Fair' });
}

describe('Import API', () => {
  beforeEach(clearAll);

  it('round-trips every exported field through JSON and de-duplicates a second import', async () => {
    seedFixture();
    const first = await exportJson();
    expect(first).toHaveLength(2);
    expect(first[0].tags).toEqual([{ name: 'brew-day', color: '#aabbcc' }, { name: 'stainless', color: '#112233' }]);
    expect(first[0].location).toBe('Brew shed');
    expect(first[1].location).toBeNull();

    clearAll();
    const file = JSON.stringify(first);
    const res = await upload(file, 'x.json');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ imported: 2, duplicates: 0, skipped: 0, errors: [] });

    expect(normalise(await exportJson())).toEqual(normalise(first));

    const again = await upload(file, 'x.json');
    expect(again.status).toBe(200);
    expect(again.body).toEqual({ imported: 0, duplicates: 2, skipped: 0, errors: [] });
    expect(testDb.prepare('SELECT COUNT(*) n FROM equipment').get().n).toBe(2);
    expect(testDb.prepare('SELECT COUNT(*) n FROM tags').get().n).toBe(2);
    expect(testDb.prepare('SELECT COUNT(*) n FROM locations').get().n).toBe(1);
  });

  it('reuses existing tags and locations case-insensitively, keeping the existing colour', async () => {
    testDb.prepare("INSERT INTO tags (name, color) VALUES ('Steel', '#000000')").run();
    testDb.prepare("INSERT INTO locations (name) VALUES ('Shed')").run();
    const res = await upload(JSON.stringify([
      { name: 'A', category: 'pump', tags: ['steel', { name: 'new', color: '#ff0000' }], location: 'shed' },
    ]), 'x.json');
    expect(res.body.imported).toBe(1);
    expect(testDb.prepare('SELECT name, color FROM tags ORDER BY id').all())
      .toEqual([{ name: 'Steel', color: '#000000' }, { name: 'new', color: '#ff0000' }]);
    expect(testDb.prepare('SELECT COUNT(*) n FROM locations').get().n).toBe(1);
  });

  it('imports the good row and reports exact row errors for a mixed file', async () => {
    const res = await upload(JSON.stringify([
      null,
      { name: 'Bad cat', category: 'spaceship' },
      { name: 'Bad price', category: 'pump', purchase_price: 'lots' },
      { name: 'Bad qty', category: 'pump', quantity: 0 },
      { name: 'Bad tags', category: 'pump', tags: 'a,b' },
      { name: 'Good', category: 'pump', quantity: 2 },
    ]), 'mixed.json');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      imported: 1,
      duplicates: 0,
      skipped: 5,
      errors: [
        { row: 1, message: 'record must be an object' },
        { row: 2, message: 'unknown category "spaceship"' },
        { row: 3, message: 'invalid purchase_price "lots"' },
        { row: 4, message: 'quantity must be a positive integer, got "0"' },
        { row: 5, message: 'tags must be an array of tag names (or {name, color} objects)' },
      ],
    });
    const rows = testDb.prepare('SELECT name, quantity FROM equipment').all();
    expect(rows).toEqual([{ name: 'Good', quantity: 2 }]);
  });

  it('returns 422 when nothing imported and there were errors', async () => {
    const res = await upload('[null]', 'bad.json');
    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      imported: 0, duplicates: 0, skipped: 1, errors: [{ row: 1, message: 'record must be an object' }],
    });
  });

  it('skips in-file duplicates (name case-insensitive, same serial) but keeps different serials', async () => {
    const res = await upload(JSON.stringify([
      { name: 'Pump', category: 'pump' },
      { name: ' pump ', category: 'pump' },
      { name: 'Pump', category: 'pump', serial_number: 'S2' },
      { name: 'PUMP', category: 'pump', serial_number: 'S2' },
    ]), 'dupes.json');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ imported: 2, duplicates: 2, skipped: 0, errors: [] });
  });

  it('does not treat soft-deleted items as duplicates', async () => {
    const item = seedEquipment(testDb, { name: 'Gone' });
    testDb.prepare('UPDATE equipment SET deleted = 1 WHERE id = ?').run(item.id);
    const res = await upload(JSON.stringify([{ name: 'Gone', category: 'kettle' }]), 'x.json');
    expect(res.body).toEqual({ imported: 1, duplicates: 0, skipped: 0, errors: [] });
  });

  it('rolls back all rows if the database rejects one', async () => {
    // Force a database error on the second row with a trigger that aborts on a sentinel name.
    testDb.exec(`CREATE TRIGGER boom BEFORE INSERT ON equipment WHEN new.name = 'BOOM'
      BEGIN SELECT RAISE(ABORT, 'boom'); END`);
    try {
      const res = await upload(JSON.stringify([
        { name: 'Fine', category: 'pump' },
        { name: 'BOOM', category: 'pump' },
      ]), 'x.json');
      expect(res.status).toBe(500);
      expect(testDb.prepare('SELECT COUNT(*) n FROM equipment').get().n).toBe(0);
    } finally {
      testDb.exec('DROP TRIGGER boom');
    }
  });

  it('still imports CSV with its four columns', async () => {
    const csv = 'name,category,condition,notes\r\nKettle,Kettle,Fair,"has, comma"\r\nPump,pump,Good,\r\n';
    const res = await upload(csv, 'x.csv');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ imported: 2, duplicates: 0, skipped: 0, errors: [] });
    expect(testDb.prepare('SELECT name, category, condition, notes, quantity, purchase_currency FROM equipment ORDER BY id').all())
      .toEqual([
        { name: 'Kettle', category: 'kettle', condition: 'Fair', notes: 'has, comma', quantity: 1, purchase_currency: 'GBP' },
        { name: 'Pump', category: 'pump', condition: 'Good', notes: null, quantity: 1, purchase_currency: 'GBP' },
      ]);
  });

  it('reports CSV row numbers for errors', async () => {
    const res = await upload('name,category\r\nA,pump\r\nB,nope\r\n', 'x.csv');
    expect(res.body.errors).toEqual([{ row: 3, message: 'unknown category "nope"' }]);
  });

  it('reads any CSV column matching a field name, but tags are JSON-only', async () => {
    const csv = 'name,category,serial_number,purchase_price,quantity,location\r\nDrum,keg,K-1,42.5,4,Cellar\r\n';
    const res = await upload(csv, 'x.csv');
    expect(res.body).toEqual({ imported: 1, duplicates: 0, skipped: 0, errors: [] });
    expect(testDb.prepare(`
      SELECT e.name, e.category, e.serial_number, e.purchase_price, e.quantity, l.name AS location
      FROM equipment e JOIN locations l ON l.id = e.location_id
    `).all()).toEqual([
      { name: 'Drum', category: 'keg', serial_number: 'K-1', purchase_price: 42.5, quantity: 4, location: 'Cellar' },
    ]);

    const bad = await upload('name,category,tags\r\nHose,tubing,steel\r\n', 'y.csv');
    expect(bad.status).toBe(422);
    expect(bad.body.errors).toEqual([
      { row: 2, message: 'tags must be an array of tag names (or {name, color} objects)' },
    ]);
  });
});
