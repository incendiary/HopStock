import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as api from '../api.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function mockFetch(data = {}, { ok = true, status = 200 } = {}) {
  const fn = vi.fn().mockResolvedValue({ ok, status, json: () => Promise.resolve(data) });
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(() => {
  mockFetch({ ok: true });
});
afterEach(() => vi.unstubAllGlobals());

describe('request()', () => {
  it('returns the parsed JSON body on success', async () => {
    mockFetch({ id: 5, name: 'Kettle' });
    await expect(api.getEquipmentItem(5)).resolves.toEqual({ id: 5, name: 'Kettle' });
  });

  it('prefixes the path with /api and passes no options for GETs', async () => {
    const f = mockFetch({});
    await api.getTags();
    expect(f).toHaveBeenCalledExactlyOnceWith('/api/tags', {});
  });

  it('throws body.error with err.status on a non-ok response', async () => {
    mockFetch({ error: 'Name is required' }, { ok: false, status: 400 });
    const err = await api.getTags().catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Name is required');
    expect(err.status).toBe(400);
  });

  it('falls back to "HTTP <status>" when the error body has no error field', async () => {
    mockFetch({}, { ok: false, status: 404 });
    const err = await api.getTags().catch((e) => e);
    expect(err.message).toBe('HTTP 404');
    expect(err.status).toBe(404);
  });

  it('falls back to "HTTP <status>" when the error body is not JSON', async () => {
    const f = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new SyntaxError('Unexpected token <')),
    });
    vi.stubGlobal('fetch', f);
    const err = await api.getTags().catch((e) => e);
    expect(err.message).toBe('HTTP 502');
    expect(err.status).toBe(502);
  });
});

describe('JSON body helpers', () => {
  const body = { name: 'Pump', n: 2 };
  const cases = [
    ['createEquipment', () => api.createEquipment(body), 'POST', '/api/equipment'],
    ['updateEquipment', () => api.updateEquipment(3, body), 'PUT', '/api/equipment/3'],
    ['batchEquipment', () => api.batchEquipment(body), 'POST', '/api/equipment/batch'],
    ['createTag', () => api.createTag(body), 'POST', '/api/tags'],
    ['updateTag', () => api.updateTag(4, body), 'PUT', '/api/tags/4'],
    ['createRoutine', () => api.createRoutine(body), 'POST', '/api/routines'],
    ['runRoutine', () => api.runRoutine(9, body), 'POST', '/api/routines/9/run'],
  ];

  it.each(cases)('%s sends a JSON string body with Content-Type', async (_n, call, method, url) => {
    const f = mockFetch({});
    await call();
    expect(f).toHaveBeenCalledExactlyOnceWith(url, {
      method,
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    });
  });
});

describe('multipart calls', () => {
  it.each([
    ['uploadPhotos', (fd) => api.uploadPhotos(7, fd), '/api/equipment/7/photos'],
    ['scanReceipt', (fd) => api.scanReceipt(fd), '/api/scan-receipt'],
  ])('%s sends the FormData untouched with no Content-Type', async (_n, call, url) => {
    const f = mockFetch({});
    const fd = new FormData();
    fd.append('file', new Blob(['x']), 'a.png');
    await call(fd);
    const [calledUrl, opts] = f.mock.calls[0];
    expect(calledUrl).toBe(url);
    expect(opts.method).toBe('POST');
    expect(opts.body).toBe(fd);
    expect(opts.headers).toBeUndefined();
  });
});

describe('getEquipment', () => {
  it('returns the items array from the response', async () => {
    mockFetch({ items: [{ id: 1 }, { id: 2 }], total: 2 });
    await expect(api.getEquipment()).resolves.toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('requests /api/equipment with no query string when there are no params', async () => {
    const f = mockFetch({ items: [] });
    await api.getEquipment();
    expect(f.mock.calls[0][0]).toBe('/api/equipment');
  });

  it('drops falsy params from the query string', async () => {
    const f = mockFetch({ items: [] });
    await api.getEquipment({
      search: 'kettle',
      category: '',
      tag: 0,
      loc: null,
      q: undefined,
      cond: 'good',
    });
    expect(f.mock.calls[0][0]).toBe('/api/equipment?search=kettle&cond=good');
  });

  it('omits the "?" when every param is falsy', async () => {
    const f = mockFetch({ items: [] });
    await api.getEquipment({ search: '', tag: null });
    expect(f.mock.calls[0][0]).toBe('/api/equipment');
  });
});

describe('DELETE calls', () => {
  it.each([
    ['deleteEquipment', () => api.deleteEquipment(1), '/api/equipment/1'],
    ['deleteTag', () => api.deleteTag(2), '/api/tags/2'],
    ['deleteRoutine', () => api.deleteRoutine(3), '/api/routines/3'],
    ['deleteLocation', () => api.deleteLocation(4), '/api/locations/4'],
    ['deletePhoto', () => api.deletePhoto(5, 6), '/api/equipment/5/photos/6'],
    ['deleteLoan', () => api.deleteLoan(5, 8), '/api/equipment/5/loans/8'],
    ['detachEquipment', () => api.detachEquipment(3, 5), '/api/routines/3/equipment/5'],
    [
      'deleteMaintenanceEvent',
      () => api.deleteMaintenanceEvent(5, 9),
      '/api/equipment/5/maintenance/9',
    ],
  ])('%s sends only { method: DELETE }', async (_n, call, url) => {
    const f = mockFetch({});
    await call();
    expect(f).toHaveBeenCalledExactlyOnceWith(url, { method: 'DELETE' });
  });
});
