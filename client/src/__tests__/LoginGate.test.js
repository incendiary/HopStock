import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import LoginGate from '../components/LoginGate.vue';

const mockFetch = vi.fn();
beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

const reply = (status, body) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

describe('LoginGate', () => {
  it('renders a password input and a disabled submit button', () => {
    const w = mount(LoginGate);
    expect(w.find('input').attributes('type')).toBe('password');
    expect(w.find('button[type=submit]').attributes('disabled')).toBeDefined();
    expect(w.find('[role=alert]').exists()).toBe(false);
  });

  it('posts the token and emits authenticated on success', async () => {
    mockFetch.mockReturnValue(reply(200, { ok: true }));
    const w = mount(LoginGate);
    await w.find('input').setValue('s3cret');
    await w.find('form').trigger('submit');
    await flushPromises();
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 's3cret' }),
    });
    expect(w.emitted('authenticated')).toHaveLength(1);
    expect(w.find('input').element.value).toBe('');
  });

  it('shows the server error and does not emit on a wrong token', async () => {
    mockFetch.mockReturnValue(reply(401, { error: 'Invalid token' }));
    const w = mount(LoginGate);
    await w.find('input').setValue('nope');
    await w.find('form').trigger('submit');
    await flushPromises();
    expect(w.find('[role=alert]').text()).toBe('Invalid token');
    expect(w.emitted('authenticated')).toBeUndefined();
  });

  it('explains rate limiting on 429', async () => {
    mockFetch.mockReturnValue(reply(429, { error: 'Too many requests' }));
    const w = mount(LoginGate);
    await w.find('input').setValue('x');
    await w.find('form').trigger('submit');
    await flushPromises();
    expect(w.find('[role=alert]').text()).toBe('Too many attempts. Try again later.');
  });
});
