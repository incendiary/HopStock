import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EquipmentResults from '../components/equipment-list/EquipmentResults.vue';

const items = [
  { id: 1, name: 'Kettle One', category: 'kettle', condition: 'Good', photos: [], tags: [] },
  { id: 2, name: 'Keg Two', category: 'kettle', condition: 'Fair', photos: [], tags: [] },
];
const EquipmentCardStub = {
  props: ['item', 'categoryMap', 'conditions'],
  emits: ['select', 'updated'],
  template: '<div class="card-stub">{{ item.name }}</div>',
};
const mountResults = (props = {}) =>
  mount(EquipmentResults, {
    props: { items, categoryMap: { kettle: 'Kettle' }, conditions: ['Good', 'Fair'], ...props },
    global: { stubs: { EquipmentCard: EquipmentCardStub } },
  });

describe('EquipmentResults', () => {
  it('shows loading and error states', () => {
    expect(mountResults({ loading: true }).text()).toBe('Loading…');
    const w = mountResults({ error: 'Boom' });
    expect(w.text()).toBe('Boom');
    expect(w.find('.state-message--error').exists()).toBe(true);
  });

  it('shows the empty state with the right hint', () => {
    expect(mountResults({ items: [] }).text()).toBe(
      'No equipment found.Add your first item to get started.',
    );
    expect(mountResults({ items: [], filtered: true }).text()).toBe(
      'No equipment found.Try clearing the filters.',
    );
  });

  it('renders one card per item and passes props through', () => {
    const w = mountResults();
    const cards = w.findAllComponents(EquipmentCardStub);
    expect(cards.map((c) => c.text())).toEqual(['Kettle One', 'Keg Two']);
    expect(cards[0].props('categoryMap')).toEqual({ kettle: 'Kettle' });
    expect(cards[0].props('conditions')).toEqual(['Good', 'Fair']);
    expect(w.find('.card-checkbox').exists()).toBe(false);
  });

  it('emits open when a card is selected outside select mode', async () => {
    const w = mountResults();
    w.findAllComponents(EquipmentCardStub)[1].vm.$emit('select');
    await w.vm.$nextTick();
    expect(w.emitted('open')).toEqual([[2]]);
    expect(w.emitted('toggle-select')).toBeUndefined();
  });

  it('re-emits card updates unchanged', () => {
    const w = mountResults();
    const updated = { ...items[0], condition: 'Fair' };
    w.findAllComponents(EquipmentCardStub)[0].vm.$emit('updated', updated);
    expect(w.emitted('updated')).toEqual([[updated]]);
  });

  it('toggles selection by wrapper click, checkbox and card select in select mode', async () => {
    const w = mountResults({ selectMode: true, selected: new Set([1]) });
    const wrappers = w.findAll('.card-wrapper');
    expect(wrappers[0].classes()).toContain('card-wrapper--selected');
    expect(wrappers[1].classes()).not.toContain('card-wrapper--selected');
    const boxes = w.findAll('.card-checkbox input');
    expect(boxes[0].element.checked).toBe(true);
    expect(boxes[1].element.checked).toBe(false);

    await wrappers[1].trigger('click');
    await boxes[0].trigger('change');
    w.findAllComponents(EquipmentCardStub)[0].vm.$emit('select');
    expect(w.emitted('toggle-select')).toEqual([[2], [1], [1]]);
    expect(w.emitted('open')).toBeUndefined();
  });

  it('does not bubble a checkbox label click to the wrapper', async () => {
    const w = mountResults({ selectMode: true });
    await w.find('.card-checkbox').trigger('click');
    expect(w.emitted('toggle-select')).toBeUndefined();
  });
});
