import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BarSection from '../components/dashboard/BarSection.vue';

const mountBars = (props) => mount(BarSection, { props });

describe('BarSection', () => {
  it('renders the title and a row per entry with label, width and count', () => {
    const w = mountBars({
      title: 'By condition',
      total: 8,
      rows: [
        { key: 'Good', label: 'Good', variant: 'good', count: 4 },
        { key: 'Needs Repair', label: 'Needs Repair', variant: 'needs-repair', count: 1 },
      ],
    });
    expect(w.find('.section__title').text()).toBe('By condition');
    const rows = w.findAll('.bar-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].find('.bar-row__label').text()).toBe('Good');
    expect(rows[0].find('.bar-row__label').classes()).toContain('bar-row__label--good');
    expect(rows[0].find('.bar-row__fill').classes()).toContain('bar-row__fill--good');
    expect(rows[0].find('.bar-row__fill').attributes('style')).toContain('width: 50%');
    expect(rows[0].find('.bar-row__count').text()).toBe('4');
    expect(rows[1].find('.bar-row__fill').attributes('style')).toContain('width: 13%');
    expect(rows[1].find('.bar-row__label').classes()).toContain('bar-row__label--needs-repair');
  });

  it('renders the group after the label only when one is given', () => {
    const w = mountBars({
      title: 'By category',
      total: 2,
      rows: [
        { key: 'keg', label: 'Keg', group: 'Vessels', variant: 'category', count: 1 },
        { key: 'x', label: 'Plain', variant: 'location', count: 1 },
      ],
    });
    const [grouped, plain] = w.findAll('.bar-row__label');
    expect(grouped.text()).toBe('Keg Vessels');
    expect(grouped.find('.bar-row__group').text()).toBe('Vessels');
    expect(plain.find('.bar-row__group').exists()).toBe(false);
    expect(plain.element.textContent).toBe('Plain');
  });

  it('uses a 0% width when the total is zero', () => {
    const w = mountBars({
      title: 'T',
      total: 0,
      rows: [{ key: 'a', label: 'A', variant: 'location', count: 0 }],
    });
    expect(w.find('.bar-row__fill').attributes('style')).toContain('width: 0%');
  });
});
