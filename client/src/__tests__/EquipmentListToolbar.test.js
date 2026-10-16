import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EquipmentListToolbar from '../components/equipment-list/EquipmentToolbar.vue';

const props = {
  categories: [{ id: 'kettle', label: 'Kettle' }],
  conditions: ['Good', 'Fair'],
  tags: [{ id: 3, name: 'Brewing' }],
  locations: [{ id: 7, name: 'Garage' }],
};
const mountBar = (extra = {}) => mount(EquipmentListToolbar, { props: { ...props, ...extra } });
const buttonByText = (w, text) => w.findAll('button').find((b) => b.text() === text);

describe('EquipmentList toolbar', () => {
  it('renders the filter options from props', () => {
    const w = mountBar();
    expect(w.text()).toContain('Inventory');
    const opts = (label) =>
      w
        .find(`select[aria-label="${label}"]`)
        .findAll('option')
        .map((o) => o.text());
    expect(opts('Filter by category')).toEqual(['All categories', 'Kettle']);
    expect(opts('Filter by condition')).toEqual(['All conditions', 'Good', 'Fair']);
    expect(opts('Filter by tag')).toEqual(['All tags', 'Brewing']);
    expect(opts('Filter by location')).toEqual(['All locations', 'No location', 'Garage']);
  });

  it('hides the location filter when there are no locations', () => {
    const w = mountBar({ locations: [] });
    expect(w.find('select[aria-label="Filter by location"]').exists()).toBe(false);
  });

  it('emits model updates with exact payloads', async () => {
    const w = mountBar();
    await w.find('input[type="search"]').setValue('keg');
    await w.find('select[aria-label="Filter by category"]').setValue('kettle');
    await w.find('select[aria-label="Filter by condition"]').setValue('Fair');
    await w.find('select[aria-label="Filter by tag"]').setValue('Brewing');
    await w.find('select[aria-label="Filter by location"]').setValue(7);
    await buttonByText(w, '📤 On loan').trigger('click');
    expect(w.emitted('update:searchQuery')).toEqual([['keg']]);
    expect(w.emitted('update:filterCategory')).toEqual([['kettle']]);
    expect(w.emitted('update:filterCondition')).toEqual([['Fair']]);
    expect(w.emitted('update:filterTag')).toEqual([['Brewing']]);
    expect(w.emitted('update:filterLocation')).toEqual([[7]]);
    expect(w.emitted('update:filterOnLoan')).toEqual([[true]]);
  });

  it('shows the clear button only with a query and clears it', async () => {
    expect(mountBar().find('.search-box__clear').exists()).toBe(false);
    const w = mountBar({ searchQuery: 'keg' });
    await w.find('.search-box__clear').trigger('click');
    expect(w.emitted('update:searchQuery')).toEqual([['']]);
  });

  it('reflects active toggles and emits select-mode and add', async () => {
    const w = mountBar({ filterOnLoan: true, selectMode: true });
    expect(buttonByText(w, '📤 On loan').classes()).toContain('filter-toggle--active');
    expect(buttonByText(w, '☑ Select').classes()).toContain('filter-toggle--active');
    await buttonByText(w, '☑ Select').trigger('click');
    await buttonByText(w, '+ Add item').trigger('click');
    expect(w.emitted('toggle-select-mode')).toHaveLength(1);
    expect(w.emitted('add')).toHaveLength(1);
  });
});
