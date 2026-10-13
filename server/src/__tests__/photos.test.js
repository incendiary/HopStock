import { describe, it, expect, vi, afterAll } from 'vitest';
import { mkdtempSync, readdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { makeTestDb, seedEquipment } from './helpers.js';

const uploadsDir = mkdtempSync(join(tmpdir(), 'hopstock-uploads-'));
process.env.UPLOADS_DIR = uploadsDir;

const testDb = makeTestDb();
vi.mock('../db/index.js', () => ({ default: testDb }));

const { default: app } = await import('../app.js');
const request = (await import('supertest')).default;

afterAll(() => rmSync(uploadsDir, { recursive: true, force: true }));

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

const upload = (id, buf, filename, contentType) =>
  request(app)
    .post(`/api/equipment/${id}/photos`)
    .attach('photos', buf, { filename, contentType });

describe('Photos API', () => {
  it('stores a valid PNG, serves it with hardening headers', async () => {
    const item = seedEquipment(testDb);
    const res = await upload(item.id, PNG, 'a.png', 'image/png');
    expect(res.status).toBe(201);

    const file = await request(app).get(res.body[0].url);
    expect(file.status).toBe(200);
    expect(file.headers['x-content-type-options']).toBe('nosniff');
    expect(file.headers['content-security-policy']).toBe(
      "default-src 'none'; img-src 'self'; sandbox"
    );
  });

  it('ignores the client extension: .html as image/png is stored as .png', async () => {
    const item = seedEquipment(testDb);
    const res = await upload(item.id, PNG, 'evil.html', 'image/png');
    expect(res.status).toBe(201);
    expect(res.body[0].filename).toMatch(/\.png$/);
  });

  it('rejects SVG and other non-allowlisted types', async () => {
    const item = seedEquipment(testDb);
    const before = readdirSync(uploadsDir).length;
    for (const [name, type] of [['x.svg', 'image/svg+xml'], ['x.bmp', 'image/bmp'], ['x.html', 'text/html']]) {
      const res = await upload(item.id, Buffer.from('<svg/>'), name, type);
      expect(res.status).toBe(400);
    }
    expect(readdirSync(uploadsDir).length).toBe(before);
  });

  it('sets primary and deletes a photo', async () => {
    const item = seedEquipment(testDb);
    const [a, b] = (await upload(item.id, PNG, 'a.png', 'image/png')).body.concat(
      (await upload(item.id, PNG, 'b.png', 'image/png')).body
    );

    const patch = await request(app)
      .patch(`/api/equipment/${item.id}/photos/${b.id}`)
      .send({ set_primary: true });
    expect(patch.body.sort_order).toBe(0);

    const del = await request(app).delete(`/api/equipment/${item.id}/photos/${a.id}`);
    expect(del.body).toEqual({ success: true });
    expect((await request(app).get(a.url)).status).not.toBe(200);
  });
});
