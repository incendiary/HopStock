import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EquipmentFormOrganise from '../components/equipment-form/EquipmentFormOrganise.vue';

const locations = [
  { id: 1, name: 'Garage' },
  { id: 2, name: 'Shed' },
];
const tag = { id: 7, name: 'steel', color: '#111111' };
const mountOrg = (props = {}) =>
  mount(EquipmentFormOrganise, {
    props: {
      quantity: 3,
      locationId: 2,
      tags: [tag],
      icon: null,
      locations,
      allTags: [tag],
      ...props,
    },
  });

describe('EquipmentFormOrganise', () => {
  it('renders quantity, location options and selected tags', () => {
    const w = mountOrg();
    expect(Number(w.find('#ef-quantity').element.value)).toBe(3);
    expect(w.find('#ef-location').element.value).toBe('2');
    expect(w.findAll('#ef-location option').map((o) => o.text())).toEqual([
      '— none —',
      'Garage',
      'Shed',
    ]);
    expect(w.find('.tag-pill').text()).toContain('steel');
  });

  it('hides the location field when there are no locations', () => {
    expect(mountOrg({ locations: [] }).find('#ef-location').exists()).toBe(false);
  });

  it('steps the quantity with exact payloads and floors it at 1', async () => {
    const w = mountOrg({ quantity: 1 });
    const [minus, plus] = w.findAll('.quantity-stepper__btn');
    expect(minus.attributes('disabled')).toBeDefined();
    await plus.trigger('click');
    expect(w.emitted('update:quantity')).toEqual([[2]]);
    await w.find('#ef-quantity').setValue('5');
    expect(w.emitted('update:quantity').at(-1)).toEqual([5]);
  });

  it('decrements from above 1', async () => {
    const w = mountOrg({ quantity: 4 });
    await w.findAll('.quantity-stepper__btn')[0].trigger('click');
    expect(w.emitted('update:quantity')).toEqual([[3]]);
  });

  it('emits update:locationId with a number, or null for none', async () => {
    const w = mountOrg();
    await w.find('#ef-location').setValue('1');
    w.find('#ef-location').element.selectedIndex = 0;
    await w.find('#ef-location').trigger('change');
    expect(w.emitted('update:locationId')).toEqual([[1], [null]]);
  });

  it('emits update:tags when a tag is removed', async () => {
    const w = mountOrg();
    await w.find('.tag-pill__remove').trigger('click');
    expect(w.emitted('update:tags')).toEqual([[[]]]);
  });

  it('disables the quantity controls while saving', () => {
    const w = mountOrg({ saving: true });
    expect(w.find('#ef-quantity').attributes('disabled')).toBeDefined();
    for (const b of w.findAll('.quantity-stepper__btn')) {
      expect(b.attributes('disabled')).toBeDefined();
    }
  });
});
