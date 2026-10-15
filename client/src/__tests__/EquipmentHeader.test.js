import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import EquipmentHeader from '../components/equipment-detail/EquipmentHeader.vue';

const item = {
  name: 'Brew Kettle',
  icon: '🍺',
  condition: 'Needs Repair',
  tags: [{ id: 1, name: 'Stainless', color: '#10b981' }],
  location: { id: 1, name: 'Brew Shed' },
  activeLoan: { borrower: 'Sam' },
};
const conditions = ['Good', 'Fair', 'Needs Repair', 'Retired'];
const mountHeader = (props = {}) =>
  mount(EquipmentHeader, { props: { item, conditions, categoryLabel: 'Kettle', ...props } });

describe('EquipmentHeader', () => {
  afterEach(() => vi.useRealTimers());

  it('renders name, icon, category, tags, location and loan badge', () => {
    const w = mountHeader();
    expect(w.find('.meta__icon').text()).toBe('🍺');
    expect(w.find('h1').text()).toBe('🍺Brew Kettle');
    expect(w.find('.badge--category').text()).toBe('Kettle');
    expect(w.find('.badge--tag').text()).toBe('Stainless');
    expect(w.find('.badge--tag').attributes('style')).toContain('--tag-color: #10b981');
    expect(w.find('.badge--location').text()).toBe('📍 Brew Shed');
    expect(w.find('.badge--loan').text()).toBe('📤 On loan — Sam');
  });

  it('omits optional badges when data is absent', () => {
    const w = mountHeader({
      item: { name: 'Plain', condition: 'Good', tags: [], location: null, activeLoan: null },
      categoryLabel: '',
    });
    for (const cls of ['.meta__icon', '.badge--category', '.badge--tag', '.badge--location']) {
      expect(w.find(cls).exists()).toBe(false);
    }
    expect(w.find('.badge--loan').exists()).toBe(false);
    expect(w.find('.badge--maint').exists()).toBe(false);
  });

  it('slugs the condition into the select class and lists options', () => {
    const w = mountHeader();
    const select = w.find('select');
    expect(select.classes()).toContain('badge--needs-repair');
    expect(select.element.value).toBe('Needs Repair');
    expect(select.findAll('option').map((o) => o.text())).toEqual(conditions);
  });

  it('emits change-condition with the chosen value', async () => {
    const w = mountHeader();
    await w.find('select').setValue('Retired');
    expect(w.emitted('change-condition')).toEqual([['Retired']]);
  });

  it('shows saved feedback and disables the select while saving', () => {
    const w = mountHeader({ conditionSaving: true, conditionSaved: true });
    expect(w.find('select').attributes('disabled')).toBeDefined();
    expect(w.find('.condition-saved').text()).toBe('Saved ✓');
  });

  it('renders maintenance chips with relative days and a dated title', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-10T12:00:00Z'));
    const w = mountHeader({
      lastCleaned: '2025-06-10T08:00:00Z',
      lastServiced: '2025-06-05T12:00:00Z',
    });
    expect(w.find('.badge--cleaned').text()).toBe('🧽 today');
    expect(w.find('.badge--serviced').text()).toBe('🔧 5d ago');
    expect(w.find('.badge--cleaned').attributes('title')).toMatch(/^Last cleaned .*2025/);
    expect(w.find('.badge--serviced').attributes('title')).toMatch(/^Last serviced .*2025/);
  });
});
