import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ValueSummary from '../components/dashboard/ValueSummary.vue';
import { BASE } from '../api.js';

describe('ValueSummary', () => {
  it('shows the formatted total, counts and the insurance export link', () => {
    const w = mount(ValueSummary, {
      props: { summary: { total_value: 2817, priced_count: 18, unpriced_count: 6 } },
    });
    expect(w.find('.section__title').text()).toBe('Inventory value');
    expect(
      w
        .findAll('.value-tile')
        .map((t) => [t.find('.value-tile__val').text(), t.find('.value-tile__label').text()]),
    ).toEqual([
      ['£2,817', 'total recorded value'],
      ['18', 'items with price'],
      ['6', 'items without price'],
    ]);
    const link = w.find('a');
    expect(link.attributes('href')).toBe(`${BASE}/export/insurance-csv`);
    expect(link.attributes('download')).toBe('hopstock-insurance.csv');
    expect(link.text()).toBe('↓ Insurance report (CSV)');
  });

  it('hides the unpriced tile when every item has a price', () => {
    const w = mount(ValueSummary, {
      props: { summary: { total_value: 50, priced_count: 1, unpriced_count: 0 } },
    });
    expect(w.findAll('.value-tile')).toHaveLength(2);
  });

  it('shows a dash for a missing total', () => {
    const w = mount(ValueSummary, {
      props: { summary: { total_value: null, priced_count: 1, unpriced_count: 0 } },
    });
    expect(w.find('.value-tile__val').text()).toBe('—');
  });
});
