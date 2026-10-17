import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { makeTestDb } from './helpers.js';

const uploadsDir = mkdtempSync(join(tmpdir(), 'hopstock-auth-'));
process.env.UPLOADS_DIR = uploadsDir;
writeFileSync(join(uploadsDir, 'a.txt'), 'hello');

const testDb = makeTestDb();
vi.mock('../db/index.js', () => ({ default: testDb }));

const { default: app } = await import('../app.js');
const request = (await import('supertest')).default;

const TOKEN = 'correct-horse-battery';
const MIN = 60 * 1000;
let clock = Date.parse('2026-01-01T00:00:00Z');

beforeAll(() => vi.useFakeTimers({ toFake: ['Date'] }));
afterAll(() => {
  vi.useRealTimers();
  rmSync(uploadsDir, { recursive: true, force: true });
});
beforeEach(() => {
  // Each test starts in a fresh rate-limit window (login 15 min, scan 1 h)
  clock += 3 * 60 * MIN;
  vi.setSystemTime(clock);
  delete process.env.ANTHROPIC_API_KEY;
});
afterEach(() => delete process.env.HOPSTOCK_TOKEN);

const PROTECTED = [
  ['get', '/api/equipment'],
  ['get', '/uploads/a.txt'],
  ['get', '/api/export/csv'],
  ['post', '/api/backup/now'],
  ['post', '/api/scan-receipt'],
];

describe('token unset', () => {
  it('leaves everything open and reports not required', async () => {
    expect((await request(app).get('/api/equipment')).status).toBe(200);
    const file = await request(app).get('/uploads/a.txt');
    expect(file.status).toBe(200);
    expect(file.text).toBe('hello');
    expect((await request(app).post('/api/scan-receipt')).status).toBe(501);
    expect((await request(app).get('/api/auth/status')).body).toEqual({
      required: false,
      authenticated: true,
    });
  });

  it('treats an empty token as unset', async () => {
    process.env.HOPSTOCK_TOKEN = '';
    expect((await request(app).get('/api/equipment')).status).toBe(200);
  });
});

describe('token set', () => {
  beforeEach(() => {
    process.env.HOPSTOCK_TOKEN = TOKEN;
  });

  it.each(PROTECTED)('rejects %s %s without credentials', async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Authentication required' });
  });

  it('keeps health, logout and status open', async () => {
    const health = await request(app).get('/api/health');
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: 'ok', project: 'hopstock' });
    expect((await request(app).post('/api/auth/logout')).status).toBe(200);
    expect((await request(app).get('/api/auth/status')).body).toEqual({
      required: true,
      authenticated: false,
    });
  });

  it('grants access with a Bearer token', async () => {
    const res = await request(app).get('/api/equipment').set('Authorization', `Bearer ${TOKEN}`);
    expect(res.status).toBe(200);
    const file = await request(app).get('/uploads/a.txt').set('Authorization', `Bearer ${TOKEN}`);
    expect(file.status).toBe(200);
  });

  it('grants access with the cookie, including exports and uploads', async () => {
    for (const path of [
      '/api/equipment',
      '/api/export/csv',
      '/api/export/json',
      '/uploads/a.txt',
    ]) {
      const res = await request(app).get(path).set('Cookie', `other=1; hopstock_token=${TOKEN}`);
      expect(res.status).toBe(200);
    }
    const status = await request(app)
      .get('/api/auth/status')
      .set('Cookie', `hopstock_token=${TOKEN}`);
    expect(status.body).toEqual({ required: true, authenticated: true });
  });

  it('rejects wrong credentials of any length without throwing', async () => {
    for (const bad of ['x', 'x'.repeat(5000), TOKEN + 'x', TOKEN.slice(1)]) {
      const bearer = await request(app).get('/api/equipment').set('Authorization', `Bearer ${bad}`);
      expect(bearer.status).toBe(401);
      const cookie = await request(app)
        .get('/api/equipment')
        .set('Cookie', `hopstock_token=${bad}`);
      expect(cookie.status).toBe(401);
    }
    const malformed = await request(app)
      .get('/api/equipment')
      .set('Cookie', 'hopstock_token=%E0%A4%A');
    expect(malformed.status).toBe(401);
  });

  it('never reveals the token in status or errors', async () => {
    const res = await request(app).get('/api/auth/status');
    expect(JSON.stringify(res.body)).not.toContain(TOKEN);
    const bad = await request(app).post('/api/auth/login').send({ token: 'nope' });
    expect(JSON.stringify(bad.body)).not.toContain(TOKEN);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    process.env.HOPSTOCK_TOKEN = TOKEN;
  });

  it('sets an HttpOnly SameSite=Strict cookie for 30 days on success', async () => {
    const res = await request(app).post('/api/auth/login').send({ token: TOKEN });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(res.headers['set-cookie']).toEqual([
      `hopstock_token=${TOKEN}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000`,
    ]);
  });

  it('adds Secure only over https', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-Proto', 'https')
      .send({ token: TOKEN });
    expect(res.headers['set-cookie']).toEqual([
      `hopstock_token=${TOKEN}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000; Secure`,
    ]);
  });

  it('rejects a wrong, missing or non-string token without setting a cookie', async () => {
    for (const body of [{ token: 'wrong' }, { token: 'x'.repeat(3000) }, {}, { token: 123 }]) {
      const res = await request(app).post('/api/auth/login').send(body);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Invalid token' });
      expect(res.headers['set-cookie']).toBeUndefined();
    }
  });

  it('logout expires the cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.headers['set-cookie']).toEqual([
      'hopstock_token=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0',
    ]);
  });

  it('returns 429 with Retry-After on the 11th attempt and recovers after the window', async () => {
    for (let i = 0; i < 10; i++) {
      expect((await request(app).post('/api/auth/login').send({ token: 'bad' })).status).toBe(401);
    }
    const blocked = await request(app).post('/api/auth/login').send({ token: TOKEN });
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: 'Too many requests' });
    expect(blocked.headers['retry-after']).toBe('900');

    vi.setSystemTime(clock + 14 * MIN);
    expect((await request(app).post('/api/auth/login').send({ token: TOKEN })).status).toBe(429);
    vi.setSystemTime(clock + 15 * MIN + 1);
    expect((await request(app).post('/api/auth/login').send({ token: TOKEN })).status).toBe(200);
  });
});

describe('POST /api/scan-receipt limiter', () => {
  it.each([[undefined], [TOKEN]])('returns 429 on the 21st request (token %s)', async (token) => {
    if (token) process.env.HOPSTOCK_TOKEN = token;
    const send = () => {
      const r = request(app).post('/api/scan-receipt');
      return token ? r.set('Authorization', `Bearer ${token}`) : r;
    };
    for (let i = 0; i < 20; i++) expect((await send()).status).toBe(501);
    const blocked = await send();
    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toBe('3600');
    vi.setSystemTime(clock + 60 * MIN + 1);
    expect((await send()).status).toBe(501);
  });

  it('does not let unauthenticated requests consume the owner quota', async () => {
    process.env.HOPSTOCK_TOKEN = TOKEN;
    for (let i = 0; i < 25; i++) await request(app).post('/api/scan-receipt');
    const res = await request(app)
      .post('/api/scan-receipt')
      .set('Authorization', `Bearer ${TOKEN}`);
    expect(res.status).toBe(501);
  });
});
