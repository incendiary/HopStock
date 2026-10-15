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
    testDb.prepare(`
      UPDATE equipment SET purchase_price = ?, purchase_currency = ? WHERE id = ?
    `).run(15.99, 'GBP', item1.id);

    // Fixture 2: item with comma, quote, newline in name (and add purchase info separately)
    const item2 = seedEquipment(testDb, {
      name: 'Blender, "deluxe"\nmodel',
      category: 'appliance',
      condition: 'Fair',
      notes: null,
    });
    // Manually add purchase info since seedEquipment doesn't support those columns
    testDb.prepare(`
      UPDATE equipment SET purchase_price = ?, purchase_currency = ? WHERE id = ?
    `).run(45.50, 'USD', item2.id);

    // Add a photo to item2 to test photo data doesn't appear in CSV
    testDb.prepare(`
      INSERT INTO photos (equipment_id, filename, created_at)
      VALUES (?, ?, datetime('now'))
    `).run(item2.id, 'photo1.jpg');

    // Fixture 3: item with unknown category value (not in CATEGORIES) and purchase info
    const item3 = seedEquipment(testDb, {
      name: 'Mystery Box',
      category: 'unknown_cat',
      condition: 'Good',
      notes: null,
    });
    testDb.prepare(`
      UPDATE equipment SET purchase_price = ?, purchase_currency = ?, purchase_date = ? WHERE id = ?
    `).run(99.00, 'EUR', '2024-01-15', item3.id);
  });

  describe('GET /api/export/csv', () => {
    it('exports items as CSV with exact format', async () => {
      const res = await request(app).get('/api/export/csv');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/attachment.*hopstock-export\.csv/);

      const lines = res.text.trim().split('\r\n');
      expect(lines.length).toBe(4); // header + 3 items
      expect(lines[0]).toBe('name,category,category_label,condition,notes,icon,created_at');

      // Items sorted by name COLLATE NOCASE: Blender, Kettle, Mystery Box
      // Check Blender row with special chars — should be quoted
      const blenderRow = lines[1];
      expect(blenderRow).toMatch(/"Blender, ""deluxe""\nmodel"/);

      // Check Kettle row
      const kettleRow = lines[2];
      expect(kettleRow).toContain('Kettle');
      expect(kettleRow).toContain('kettle');

      // Check Mystery Box with unknown category
      const mysteryRow = lines[3];
      expect(mysteryRow).toContain('Mystery Box');
    });
  });

  describe('GET /api/export/insurance-csv', () => {
    it('exports insurance report with exact format', async () => {
      const res = await request(app).get('/api/export/insurance-csv');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/attachment.*hopstock-insurance-report\.csv/);

      const lines = res.text.trim().split('\r\n');
      expect(lines.length).toBe(4); // header + 3 items
      expect(lines[0]).toBe('name,category,condition,purchase_date,purchase_price,purchase_currency,retailer,serial_number,model_number,warranty_expires,quantity');

      // Items sorted by name COLLATE NOCASE: Blender, Kettle, Mystery Box
      // Check Blender row — special chars should be quoted
      const blenderRow = lines[1];
      expect(blenderRow).toMatch(/"Blender, ""deluxe""\nmodel"/);
      expect(blenderRow).toContain('45.5');

      // Check Kettle row includes purchase info
      const kettleRow = lines[2];
      expect(kettleRow).toContain('Kettle');
      expect(kettleRow).toContain('15.99');
      expect(kettleRow).toContain('GBP');

      // Check Mystery Box row
      const mysteryRow = lines[3];
      expect(mysteryRow).toContain('Mystery Box');
      expect(mysteryRow).toContain('99');
    });
  });

  describe('GET /api/export/json', () => {
    it('exports items as JSON with correct headers and structure', async () => {
      const res = await request(app).get('/api/export/json');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.headers['content-disposition']).toMatch(/attachment.*hopstock-export\.json/);

      const items = res.body;
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBe(3);

      // Items sorted by name COLLATE NOCASE: Blender, Kettle, Mystery Box
      // Blender with photo
      const blender = items[0];
      expect(blender.name).toBe('Blender, "deluxe"\nmodel');
      expect(blender.purchase_price).toBe(45.50);
      expect(Array.isArray(blender.photos)).toBe(true);
      expect(blender.photos.length).toBe(1);
      expect(blender.photos[0]).toHaveProperty('url', expect.stringContaining('/uploads/'));

      // Kettle
      const kettle = items[1];
      expect(kettle.name).toBe('Kettle');
      expect(kettle.purchase_price).toBe(15.99);
      expect(Array.isArray(kettle.photos)).toBe(true);

      // Mystery Box with unknown category
      const mystery = items[2];
      expect(mystery.name).toBe('Mystery Box');
      expect(mystery.category).toBe('unknown_cat');
      expect(mystery.purchase_price).toBe(99);
    });
  });
});
