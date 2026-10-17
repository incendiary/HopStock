import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import App from '../App.vue';
import { getEquipment } from '../api.js';

const mockFetch = vi.fn();
const reply = (status, body) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

// A view that fetches on mount, like the real ones
const View = defineComponent({
  setup() {
    getEquipment().catch(() => {});
    return () => h('div', { class: 'view' }, 'inventory');
  },
});

const mountApp = () =>
  mount(App, {
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' }, RouterView: View } },
  });

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

describe('App auth gate', () => {
  it('shows the view and no gate or log out button when no token is required', async () => {
    mockFetch.mockImplementation((url) =>
      url === '/api/auth/status'
        ? reply(200, { required: false, authenticated: true })
        : reply(200, { items: [] }),
    );
    const w = mountApp();
    await flushPromises();
    expect(w.find('.login-gate').exists()).toBe(false);
    expect(w.find('.view').exists()).toBe(true);
    expect(w.text()).not.toContain('Log out');
  });

  it('shows the gate when the status says required and not authenticated', async () => {
    mockFetch.mockImplementation(() => reply(200, { required: true, authenticated: false }));
    const w = mountApp();
    await flushPromises();
    expect(w.find('.login-gate').exists()).toBe(true);
    expect(w.find('.view').exists()).toBe(false);
  });

  it('shows the gate when any request returns 401', async () => {
    mockFetch.mockImplementation((url) =>
      url === '/api/auth/status'
        ? reply(200, { required: true, authenticated: true })
        : reply(401, { error: 'Authentication required' }),
    );
    const w = mountApp();
    await flushPromises();
    expect(w.find('.login-gate').exists()).toBe(true);
  });

  it('returns to the view after a successful login', async () => {
    mockFetch.mockImplementation((url) =>
      url === '/api/auth/login'
        ? reply(200, { ok: true })
        : reply(200, { required: true, authenticated: false }),
    );
    const w = mountApp();
    await flushPromises();
    await w.find('input').setValue('tok');
    await w.find('form').trigger('submit');
    await flushPromises();
    expect(w.find('.login-gate').exists()).toBe(false);
    expect(w.find('.view').exists()).toBe(true);
    expect(w.text()).toContain('Log out');
  });
});
