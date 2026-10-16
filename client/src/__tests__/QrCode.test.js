import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const { toCanvas } = vi.hoisted(() => ({ toCanvas: vi.fn().mockResolvedValue(undefined) }));
vi.mock('qrcode', () => ({ default: { toCanvas } }));

import QrCode from '../components/QrCode.vue';

const OPTIONS = (width) => ({
  width,
  margin: 1,
  color: { dark: '#000000', light: '#ffffff' },
  errorCorrectionLevel: 'M',
});

beforeEach(() => {
  toCanvas.mockClear();
});

describe('QrCode', () => {
  it('renders a canvas sized by the default size with the value as title', () => {
    const w = mount(QrCode, { props: { value: 'http://host/equipment/7' } });
    const canvas = w.find('canvas');
    expect(canvas.attributes('width')).toBe('160');
    expect(canvas.attributes('height')).toBe('160');
    expect(canvas.attributes('title')).toBe('http://host/equipment/7');
  });

  it('honours the size prop', () => {
    const w = mount(QrCode, { props: { value: 'x', size: 220 } });
    expect(w.find('canvas').attributes('width')).toBe('220');
    expect(w.find('canvas').attributes('height')).toBe('220');
  });

  it('calls QRCode.toCanvas on mount with the canvas, value and options', async () => {
    const w = mount(QrCode, { props: { value: 'http://host/equipment/7' } });
    await flushPromises();
    expect(toCanvas).toHaveBeenCalledOnce();
    expect(toCanvas).toHaveBeenCalledWith(
      w.find('canvas').element,
      'http://host/equipment/7',
      OPTIONS(160),
    );
  });

  it('re-renders with the new value when the value prop changes', async () => {
    const w = mount(QrCode, { props: { value: 'a', size: 100 } });
    await flushPromises();
    await w.setProps({ value: 'b' });
    await flushPromises();
    expect(toCanvas).toHaveBeenCalledTimes(2);
    expect(toCanvas).toHaveBeenLastCalledWith(w.find('canvas').element, 'b', OPTIONS(100));
  });

  it('re-renders with the new width when the size prop changes', async () => {
    const w = mount(QrCode, { props: { value: 'a', size: 100 } });
    await flushPromises();
    await w.setProps({ size: 300 });
    await flushPromises();
    expect(toCanvas).toHaveBeenCalledTimes(2);
    expect(toCanvas).toHaveBeenLastCalledWith(w.find('canvas').element, 'a', OPTIONS(300));
  });
});
