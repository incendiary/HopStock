import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EquipmentBatchBar from '../components/equipment-list/EquipmentBatchBar.vue';

const base = {
  visible: true,
  selectedCount: 3,
  conditions: ['Good', 'Fair'],
  tags: [{ id: 5, name: 'Brewing' }],
  locations: [{ id: 9, name: 'Cellar' }],
};
const mountBar = (props = {}) =>
  mount(EquipmentBatchBar, {
    props: { ...base, ...props },
    global: { stubs: { transition: false } },
  });
const buttonByText = (w, text) => w.findAll('button').find((b) => b.text() === text);
const selects = (w) => w.findAll('select.batch-select');

describe('EquipmentBatchBar', () => {
  it('renders nothing when not visible', () => {
    expect(mountBar({ visible: false }).find('.batch-bar').exists()).toBe(false);
  });

  it('renders counts and the select-all label', async () => {
    const w = mountBar();
    expect(w.text()).toContain('3 selected');
    expect(w.text()).toContain('🗑 Delete (3)');
    expect(buttonByText(w, 'Select all')).toBeDefined();
    await w.setProps({ allSelected: true });
    await buttonByText(w, 'Deselect all').trigger('click');
    expect(w.emitted('toggle-all')).toHaveLength(1);
  });

  it('lists the options for each action select', () => {
    const w = mountBar();
    const opts = (i) =>
      selects(w)
        [i].findAll('option')
        .map((o) => o.text());
    expect(opts(0)).toEqual(['Set condition…', 'Good', 'Fair']);
    expect(opts(1)).toEqual(['Add tag…', 'Brewing']);
    expect(opts(2)).toEqual(['Move to location…', '— None (unassign) —', 'Cellar']);
  });

  it('hides the location select when there are no locations', () => {
    expect(selects(mountBar({ locations: [] }))).toHaveLength(2);
  });

  it('emits action and value together for each select', async () => {
    const w = mountBar();
    await selects(w)[0].setValue('Fair');
    await selects(w)[1].setValue(5);
    await selects(w)[2].setValue(9);
    await selects(w)[2].setValue('__none__');
    expect(w.emitted('update:batchValue')).toEqual([['Fair'], [5], [9], ['__none__']]);
    // the repeated 'location' is not re-emitted: the model value is unchanged
    expect(w.emitted('update:batchAction')).toEqual([['condition'], ['tag'], ['location']]);
  });

  it.each([
    ['condition', 'Good', 'Set condition → Good'],
    ['tag', 5, 'Add tag → Brewing'],
    ['location', 9, 'Move to → Cellar'],
    ['location', '__none__', 'Remove location'],
  ])('shows the pending summary for %s=%s', (batchAction, batchValue, text) => {
    const w = mountBar({ batchAction, batchValue });
    expect(w.find('.batch-bar__pending').text()).toBe(text);
  });

  it('hides the summary for no value, an unknown id, or the delete action', async () => {
    const w = mountBar({ batchAction: 'condition', batchValue: null });
    expect(w.find('.batch-bar__pending').exists()).toBe(false);
    await w.setProps({ batchAction: 'tag', batchValue: 999 });
    expect(w.find('.batch-bar__pending').exists()).toBe(false);
    await w.setProps({ batchAction: 'location', batchValue: 999 });
    expect(w.find('.batch-bar__pending').exists()).toBe(false);
    await w.setProps({ batchAction: 'delete', batchValue: 'Good' });
    expect(w.find('.batch-bar__pending').exists()).toBe(false);
  });

  it('clears the summary and disables Apply when the placeholder is reselected', async () => {
    const w = mountBar({ batchAction: 'condition', batchValue: 'Good' });
    expect(w.find('.batch-bar__pending').exists()).toBe(true);
    expect(buttonByText(w, 'Apply').attributes('disabled')).toBeUndefined();
    selects(w)[0].element.selectedIndex = 0;
    await selects(w)[0].trigger('change');
    expect(w.emitted('update:batchValue').at(-1)).toEqual([null]);
    await w.setProps({ batchValue: null });
    expect(w.find('.batch-bar__pending').exists()).toBe(false);
    expect(buttonByText(w, 'Apply').attributes('disabled')).toBeDefined();
  });

  it('disables Apply without an action and emits apply otherwise', async () => {
    const w = mountBar({ batchAction: '', batchValue: 'Good' });
    expect(buttonByText(w, 'Apply').attributes('disabled')).toBeDefined();
    await w.setProps({ batchAction: 'condition' });
    await buttonByText(w, 'Apply').trigger('click');
    expect(w.emitted('apply')).toHaveLength(1);
  });

  it('emits delete from the delete button', async () => {
    const w = mountBar();
    await buttonByText(w, '🗑 Delete (3)').trigger('click');
    expect(w.emitted('delete')).toHaveLength(1);
  });

  it('disables everything while batching', () => {
    const w = mountBar({ batching: true, batchAction: 'condition', batchValue: 'Good' });
    selects(w).forEach((s) => expect(s.attributes('disabled')).toBeDefined());
    expect(buttonByText(w, 'Working…').attributes('disabled')).toBeDefined();
    expect(buttonByText(w, '🗑 Delete (3)').attributes('disabled')).toBeDefined();
  });
});
