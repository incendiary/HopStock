import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { makeTestDb } from './helpers.js';

const testDb = makeTestDb();
vi.mock('../db/index.js', () => ({ default: testDb }));

// Mock fetch before importing the app
const mockFetch = vi.fn();
global.fetch = mockFetch;

const { default: app } = await import('../app.js');
const request = (await import('supertest')).default;

describe('POST /api/scan-receipt', () => {
  const dummyPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);

  beforeEach(() => {
    mockFetch.mockClear();
    process.env.ANTHROPIC_API_KEY = 'test-key-123';
    delete process.env.RECEIPT_MODEL;
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.RECEIPT_MODEL;
  });

  it('returns 501 when ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const res = await request(app)
      .post('/api/scan-receipt')
      .attach('receipt', dummyPngBuffer, { filename: 'r.png', contentType: 'image/png' });

    expect(res.status).toBe(501);
    expect(res.body).toMatchObject({
      error: expect.stringContaining('ANTHROPIC_API_KEY'),
    });
  });

  it('returns 400 when no file is uploaded', async () => {
    const res = await request(app).post('/api/scan-receipt');

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: 'No file uploaded.',
    });
  });

  it('parses plain JSON and returns sanitised keys', async () => {
    const testJson = {
      purchase_date: '2026-10-01',
      purchase_price: 29.99,
      purchase_currency: 'GBP',
      retailer: 'Test Store',
      serial_number: 'ABC123',
      model_number: 'MODEL-X',
      warranty_expires: '2027-10-01',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ text: JSON.stringify(testJson) }],
      }),
    });

    const res = await request(app)
      .post('/api/scan-receipt')
      .attach('receipt', dummyPngBuffer, { filename: 'r.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      purchase_date: '2026-10-01',
      purchase_price: 29.99,
      purchase_currency: 'GBP',
      retailer: 'Test Store',
      serial_number: 'ABC123',
      model_number: 'MODEL-X',
      warranty_expires: '2027-10-01',
    });
  });

  it('parses fenced JSON', async () => {
    const testJson = {
      purchase_date: '2026-10-01',
      purchase_price: null,
      purchase_currency: null,
      retailer: null,
      serial_number: null,
      model_number: null,
      warranty_expires: null,
    };
    const fencedJson = `\`\`\`json\n${JSON.stringify(testJson)}\n\`\`\``;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ text: fencedJson }],
      }),
    });

    const res = await request(app)
      .post('/api/scan-receipt')
      .attach('receipt', dummyPngBuffer, { filename: 'r.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.purchase_date).toBe('2026-10-01');
  });

  it('strips leading prose before JSON', async () => {
    const testJson = {
      purchase_date: '2026-10-01',
      purchase_price: 50,
      purchase_currency: 'USD',
      retailer: 'Store',
      serial_number: null,
      model_number: null,
      warranty_expires: null,
    };
    const proseJson = `Here is the receipt data:\n\n${JSON.stringify(testJson)}\n\nEnd of data`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ text: proseJson }],
      }),
    });

    const res = await request(app)
      .post('/api/scan-receipt')
      .attach('receipt', dummyPngBuffer, { filename: 'r.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.purchase_date).toBe('2026-10-01');
    expect(res.body.purchase_price).toBe(50);
  });

  it('returns 502 when upstream returns non-200', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      json: async () => ({ error: { message: 'Rate limit exceeded' } }),
    });

    const res = await request(app)
      .post('/api/scan-receipt')
      .attach('receipt', dummyPngBuffer, { filename: 'r.png', contentType: 'image/png' });

    expect(res.status).toBe(502);
    expect(res.body.error).toContain('Receipt scan failed');
    expect(res.body.error).toContain('Rate limit exceeded');
  });

  it('returns 502 when JSON parsing fails', async () => {
    const badJson = 'not valid json at all {{{';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ text: badJson }],
      }),
    });

    const res = await request(app)
      .post('/api/scan-receipt')
      .attach('receipt', dummyPngBuffer, { filename: 'r.png', contentType: 'image/png' });

    expect(res.status).toBe(502);
    expect(res.body.error).toContain('invalid JSON');
  });

  it('returns 504 on request timeout (TimeoutError)', async () => {
    const timeoutErr = new DOMException('aborted', 'TimeoutError');
    mockFetch.mockRejectedValueOnce(timeoutErr);

    const res = await request(app)
      .post('/api/scan-receipt')
      .attach('receipt', dummyPngBuffer, { filename: 'r.png', contentType: 'image/png' });

    expect(res.status).toBe(504);
    expect(res.body.error).toContain('timed out');
  });

  it('returns 504 on request timeout (AbortError)', async () => {
    const abortErr = new DOMException('aborted', 'AbortError');
    mockFetch.mockRejectedValueOnce(abortErr);

    const res = await request(app)
      .post('/api/scan-receipt')
      .attach('receipt', dummyPngBuffer, { filename: 'r.png', contentType: 'image/png' });

    expect(res.status).toBe(504);
    expect(res.body.error).toContain('timed out');
  });

  it('uses RECEIPT_MODEL when set', async () => {
    process.env.RECEIPT_MODEL = 'claude-custom-model';
    const testJson = {
      purchase_date: null,
      purchase_price: null,
      purchase_currency: null,
      retailer: null,
      serial_number: null,
      model_number: null,
      warranty_expires: null,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ text: JSON.stringify(testJson) }],
      }),
    });

    const res = await request(app)
      .post('/api/scan-receipt')
      .attach('receipt', dummyPngBuffer, { filename: 'r.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledOnce();
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.model).toBe('claude-custom-model');
  });

  it('defaults to claude-sonnet-5-5 when RECEIPT_MODEL not set', async () => {
    const testJson = {
      purchase_date: null,
      purchase_price: null,
      purchase_currency: null,
      retailer: null,
      serial_number: null,
      model_number: null,
      warranty_expires: null,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ text: JSON.stringify(testJson) }],
      }),
    });

    const res = await request(app)
      .post('/api/scan-receipt')
      .attach('receipt', dummyPngBuffer, { filename: 'r.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledOnce();
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.model).toBe('claude-sonnet-5-5');
  });

  it('sanitises response to only known keys', async () => {
    const fullResponse = {
      purchase_date: '2026-10-01',
      purchase_price: 29.99,
      purchase_currency: 'GBP',
      retailer: 'Store',
      serial_number: 'SN123',
      model_number: 'MDL-X',
      warranty_expires: '2027-10-01',
      extra_field: 'should not be in result',
      another_field: 'also removed',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ text: JSON.stringify(fullResponse) }],
      }),
    });

    const res = await request(app)
      .post('/api/scan-receipt')
      .attach('receipt', dummyPngBuffer, { filename: 'r.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('extra_field');
    expect(res.body).not.toHaveProperty('another_field');
    expect(Object.keys(res.body)).toEqual([
      'purchase_date',
      'purchase_price',
      'purchase_currency',
      'retailer',
      'serial_number',
      'model_number',
      'warranty_expires',
    ]);
  });

  it('handles null fields in parsed JSON', async () => {
    const jsonWithNulls = {
      purchase_date: null,
      purchase_price: null,
      purchase_currency: null,
      retailer: null,
      serial_number: null,
      model_number: null,
      warranty_expires: null,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ text: JSON.stringify(jsonWithNulls) }],
      }),
    });

    const res = await request(app)
      .post('/api/scan-receipt')
      .attach('receipt', dummyPngBuffer, { filename: 'r.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.purchase_date).toBeNull();
    expect(res.body.purchase_price).toBeNull();
  });

  it('sends request with AbortSignal.timeout(30000)', async () => {
    const testJson = {
      purchase_date: null,
      purchase_price: null,
      purchase_currency: null,
      retailer: null,
      serial_number: null,
      model_number: null,
      warranty_expires: null,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ text: JSON.stringify(testJson) }],
      }),
    });

    const res = await request(app)
      .post('/api/scan-receipt')
      .attach('receipt', dummyPngBuffer, { filename: 'r.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledOnce();
    const fetchOptions = mockFetch.mock.calls[0][1];
    expect(fetchOptions.signal).toBeDefined();
  });
});
