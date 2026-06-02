import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import EquipmentCard from '../components/EquipmentCard.vue';

// Mock the API module — we don't want real HTTP calls in unit tests
vi.mock('../api.js', () => ({
  updateEquipment: vi.fn().mockResolvedValue({ condition: 'Retired' }),
}));

const baseItem = {
  id: 1,
  name: 'Brew Kettle',
  category: 'kettle',
  condition: 'Good',
  icon: null,
  quantity: 1,
  photos: [],
  tags: [],
  location: null,
  activeLoan: null,
};

const categoryMap = { kettle: 'Kettle' };
const conditions  = ['Good', 'Fair', 'Needs Repair', 'Retired'];

function mountCard(itemOverrides = {}) {
  return mount(EquipmentCard, {
    props: { item: { ...baseItem, ...itemOverrides }, categoryMap, conditions },
  });
}

describe('EquipmentCard', () => {
  it('renders the item name', () => {
    const wrapper = mountCard();
    expect(wrapper.text()).toContain('Brew Kettle');
  });

  it('renders the category label from categoryMap', () => {
    const wrapper = mountCard();
    expect(wrapper.text()).toContain('Kettle');
  });

  it('shows quantity badge when quantity > 1', () => {
    const wrapper = mountCard({ quantity: 3 });
    expect(wrapper.text()).toContain('×3');
  });

  it('does not show quantity badge when quantity is 1', () => {
    const wrapper = mountCard({ quantity: 1 });
    expect(wrapper.text()).not.toContain('×1');
  });

  it('shows loan badge when activeLoan is set', () => {
    const wrapper = mountCard({ activeLoan: { id: 1, borrower: 'Alice' } });
    expect(wrapper.text()).toContain('On loan');
    expect(wrapper.text()).toContain('Alice');
  });

  it('does not show loan badge when no active loan', () => {
    const wrapper = mountCard({ activeLoan: null });
    expect(wrapper.text()).not.toContain('On loan');
  });

  it('shows icon emoji as placeholder when no photo', () => {
    const wrapper = mountCard({ icon: '🛢️', photos: [] });
    expect(wrapper.text()).toContain('🛢️');
  });

  it('shows condition in the condition select', () => {
    const wrapper = mountCard({ condition: 'Fair' });
    const select = wrapper.find('select');
    expect(select.element.value).toBe('Fair');
  });

  it('emits select event on card click', async () => {
    const wrapper = mountCard();
    await wrapper.trigger('click');
    expect(wrapper.emitted('select')).toBeTruthy();
    expect(wrapper.emitted('select')[0]).toEqual([1]);
  });

  it('calls updateEquipment and emits updated on condition change', async () => {
    const { updateEquipment } = await import('../api.js');
    const wrapper = mountCard();
    const select = wrapper.find('select');

    await select.setValue('Retired');
    await select.trigger('change');

    expect(updateEquipment).toHaveBeenCalledWith(1, { condition: 'Retired' });
  });
});
