import { describe, it, expect, beforeAll, vi } from 'vitest';
import { makeTestDb, seedEquipment } from './helpers.js';

const testDb = makeTestDb();
vi.mock('../db/index.js', () => ({ default: testDb }));

const { default: app } = await import('../app.js');
const request = (await import('supertest')).default;

describe('Export API', () => {
  beforeAll(() => {
    // Fixture 1: normal item with purchase info
    const item1 = seedEquipment(testDb, {
      name: 'Kettle',
      category: 'kettle',
      condition: 'Good',
      notes: 'Works well',
    });
    testDb
      .prepare(
        `
      UPDATE equipment SET purchase_price = ?, purchase_currency = ? WHERE id = ?
    `,
      )
      .run(15.99, 'GBP', item1.id);

    // Tag and location on the kettle, to cover the tags/location keys in the JSON export
    const loc = testDb
      .prepare("INSERT INTO locations (name) VALUES ('Shed')")
      .run().lastInsertRowid;
    testDb.prepare('UPDATE equipment SET location_id = ? WHERE id = ?').run(loc, item1.id);
    const tag = testDb
      .prepare("INSERT INTO tags (name, color) VALUES ('steel', '#112233')")
      .run().lastInsertRowid;
    testDb
      .prepare('INSERT INTO equipment_tags (equipment_id, tag_id) VALUES (?, ?)')
      .run(item1.id, tag);

    // Fixture 2: item with comma, quote, newline in name (and add purchase info separately)
    const item2 = seedEquipment(testDb, {
      name: 'Blender, "deluxe"\nmodel',
      category: 'appliance',
      condition: 'Fair',
      notes: null,
    });
    // Manually add purchase info since seedEquipment doesn't support those columns
    testDb
      .prepare(
        `
      UPDATE equipment SET purchase_price = ?, purchase_currency = ? WHERE id = ?
    `,
      )
      .run(45.5, 'USD', item2.id);

    // Add a photo to item2 to test photo data doesn't appear in CSV
    testDb
      .prepare(
        `
      INSERT INTO photos (equipment_id, filename, created_at)
      VALUES (?, ?, datetime('now'))
    `,
      )
      .run(item2.id, 'photo1.jpg');

    // Fixture 3: item with unknown category value (not in CATEGORIES) and purchase info
    const item3 = seedEquipment(testDb, {
      name: 'Mystery Box',
      category: 'unknown_cat',
      condition: 'Good',
      notes: null,
    });
    testDb
      .prepare(
        `
      UPDATE equipment SET purchase_price = ?, purchase_currency = ?, purchase_date = ? WHERE id = ?
    `,
      )
      .run(99.0, 'EUR', '2024-01-15', item3.id);
  });

  // Timestamps are the only non-deterministic content; ids depend on insertion order.
  const stripTs = (text) => text.replace(/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ/g, '<ts>');

  describe('GET /api/export/csv', () => {
    it('exports the exact CSV text', async () => {
      const res = await request(app).get('/api/export/csv');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toBe('attachment; filename="hopstock-export.csv"');
      expect(stripTs(res.text)).toBe(
        [
          'name,category,category_label,condition,notes,icon,created_at',
          '"Blender, ""deluxe""\nmodel",appliance,appliance,Fair,,,<ts>',
          'Kettle,kettle,Kettle,Good,Works well,,<ts>',
          'Mystery Box,unknown_cat,unknown_cat,Good,,,<ts>',
          '',
        ].join('\r\n'),
      );
    });
  });

  describe('GET /api/export/insurance-csv', () => {
    it('exports the exact insurance CSV text', async () => {
      const res = await request(app).get('/api/export/insurance-csv');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toBe(
        'attachment; filename="hopstock-insurance-report.csv"',
      );
      expect(res.text).toBe(
        [
          'name,category,condition,purchase_date,purchase_price,purchase_currency,retailer,serial_number,model_number,warranty_expires,quantity',
          '"Blender, ""deluxe""\nmodel",appliance,Fair,,45.5,USD,,,,,1',
          'Kettle,Kettle,Good,,15.99,GBP,,,,,1',
          'Mystery Box,unknown_cat,Good,2024-01-15,99,EUR,,,,,1',
          '',
        ].join('\r\n'),
      );
    });
  });

  describe('GET /api/export/json', () => {
    it('exports every item with all fields, tags, location and photos', async () => {
      const res = await request(app).get('/api/export/json');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.headers['content-disposition']).toBe(
        'attachment; filename="hopstock-export.json"',
      );

      const normalised = res.body.map(
        // eslint-disable-next-line no-unused-vars
        ({ id, created_at, updated_at, location_id, photos, ...rest }) => ({
          ...rest,
          // eslint-disable-next-line no-unused-vars
          photos: photos.map(({ id: _id, created_at: _c, ...p }) => p),
        }),
      );
      const base = {
        icon: null,
        deleted: 0,
        purchase_date: null,
        retailer: null,
        serial_number: null,
        model_number: null,
        warranty_expires: null,
        quantity: 1,
        tags: [],
        location: null,
        photos: [],
      };
      expect(normalised).toEqual([
        {
          ...base,
          name: 'Blender, "deluxe"\nmodel',
          category: 'appliance',
          condition: 'Fair',
          notes: null,
          purchase_price: 45.5,
          purchase_currency: 'USD',
          category_label: 'appliance',
          photos: [{ filename: 'photo1.jpg', url: '/uploads/photo1.jpg' }],
        },
        {
          ...base,
          name: 'Kettle',
          category: 'kettle',
          condition: 'Good',
          notes: 'Works well',
          purchase_price: 15.99,
          purchase_currency: 'GBP',
          category_label: 'Kettle',
          tags: [{ name: 'steel', color: '#112233' }],
          location: 'Shed',
        },
        {
          ...base,
          name: 'Mystery Box',
          category: 'unknown_cat',
          condition: 'Good',
          notes: null,
          purchase_price: 99,
          purchase_currency: 'EUR',
          purchase_date: '2024-01-15',
          category_label: 'unknown_cat',
        },
      ]);
      expect(res.body[1].location_id).toEqual(expect.any(Number));
    });
  });
});
