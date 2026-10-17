import { existsSync } from 'node:fs';
import { describe, it, expect, vi } from 'vitest';
import { makeTestDb } from './helpers.js';

const testDb = makeTestDb();
vi.mock('../db/index.js', () => ({ default: testDb }));

const { default: app } = await import('../app.js');
const request = (await import('supertest')).default;

const hasClient = existsSync(new URL('../../public/index.html', import.meta.url));

describe('App routes', () => {
  it('GET /api/health returns the health body', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', project: 'hopstock' });
  });

  // server/public only exists after a client build, so in a clean checkout the SPA
  // fallback has no index.html and answers with a JSON 404.
  it.skipIf(hasClient)(
    'unknown non-API path returns JSON 404 when no built client exists',
    async () => {
      const res = await request(app).get('/no/such/page');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Not found' });
    },
  );

  it.skipIf(!hasClient)(
    'unknown non-API path serves index.html when the client is built',
    async () => {
      const res = await request(app).get('/no/such/page');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/html/);
    },
  );

  it('unknown /api path returns the JSON 404 whether or not the client is built', async () => {
    const res = await request(app).get('/api/no-such-endpoint');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  it('missing upload returns the JSON 404 whether or not the client is built', async () => {
    const res = await request(app).get('/uploads/no-such-photo.png');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });
});
