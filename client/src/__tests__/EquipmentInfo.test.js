import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import EquipmentInfo from '../components/equipment-detail/EquipmentInfo.vue';
import { formatDate, formatDateShort } from '../utils/date.js';

const base = {
  notes: null,
  created_at: '2025-01-02T10:00:00Z',
  updated_at: '2025-01-02T10:00:00Z',
};
const mountInfo = (over = {}) => mount(EquipmentInfo, { props: { item: { ...base, ...over } } });

describe('EquipmentInfo', () => {
  afterEach(() => vi.useRealTimers());

  it('shows only the Added row when nothing else is set', () => {
    const w = mountInfo();
    expect(w.find('.meta__notes').exists()).toBe(false);
    expect(w.find('.meta__acquisition').exists()).toBe(false);
    const rows = w.findAll('.meta__date-row');
    expect(rows).toHaveLength(1);
    expect(rows[0].text()).toBe(`Added${formatDate(base.created_at)}`);
  });

  it('shows Updated when it differs from created', () => {
    const w = mountInfo({ updated_at: '2025-02-03T10:00:00Z' });
    const rows = w.findAll('.meta__date-row');
    expect(rows[1].text()).toBe(`Updated${formatDate('2025-02-03T10:00:00Z')}`);
  });

  it('renders notes', () => {
    const w = mountInfo({ notes: 'Line one\nLine two' });
    expect(w.find('.meta__notes-label').text()).toBe('Notes');
    expect(w.find('.meta__notes-body').text()).toBe('Line one\nLine two');
  });

  it('renders every acquisition row from props', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-01T00:00:00Z'));
    const w = mountInfo({
      retailer: 'Brew Co',
      purchase_price: 249.99,
      purchase_currency: 'GBP',
      purchase_date: '2025-03-14',
      model_number: 'K-40',
      serial_number: 'SN-123',
      warranty_expires: '2026-03-14',
    });
    const rows = w.findAll('.meta__acquisition .meta__date-row').map((r) => r.text());
    const price = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'GBP' }).format(
      249.99,
    );
    expect(rows).toEqual([
      'FromBrew Co',
      `Paid${price}`,
      `Bought${formatDateShort('2025-03-14')}`,
      'ModelK-40',
      'SerialSN-123',
      `Warranty${formatDateShort('2026-03-14')}`,
    ]);
    expect(w.find('.meta__warranty--expired').exists()).toBe(false);
  });

  it('flags an expired warranty', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-01T00:00:00Z'));
    const w = mountInfo({ warranty_expires: '2024-03-14' });
    expect(w.find('.meta__warranty--expired').text().replace(/\s+/g, ' ')).toBe(
      `${formatDateShort('2024-03-14')} (expired)`,
    );
  });

  it('shows a zero price and falls back to GBP', () => {
    const w = mountInfo({ purchase_price: 0 });
    const price = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'GBP' }).format(
      0,
    );
    expect(w.find('.meta__acquisition .meta__date-row').text()).toBe(`Paid${price}`);
  });

  it('falls back to a plain string for an invalid currency', () => {
    const w = mountInfo({ purchase_price: 5, purchase_currency: 'nope!' });
    expect(w.find('.meta__acquisition .meta__date-row').text()).toBe('Paid5 nope!');
  });
});
