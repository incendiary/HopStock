import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EquipmentFormBasics from '../components/equipment-form/EquipmentFormBasics.vue';

const mountBasics = (props = {}) =>
  mount(EquipmentFormBasics, {
    props: {
      name: 'Kettle',
      category: 'kettle',
      condition: 'Fair',
      notes: 'Some notes',
      categories: [
        { id: 'kettle', label: 'Kettle' },
        { id: 'keg', label: 'Keg' },
      ],
      conditions: ['Good', 'Fair'],
      ...props,
    },
  });

describe('EquipmentFormBasics', () => {
  it('renders values and options from props', () => {
    const w = mountBasics();
    expect(w.find('#ef-name').element.value).toBe('Kettle');
    expect(w.find('#ef-category').element.value).toBe('kettle');
    expect(w.find('#ef-condition').element.value).toBe('Fair');
    expect(w.find('#ef-notes').element.value).toBe('Some notes');
    expect(w.findAll('#ef-category option').map((o) => o.text())).toEqual([
      '— select —',
      'Kettle',
      'Keg',
    ]);
    expect(w.findAll('#ef-condition option').map((o) => o.text())).toEqual(['Good', 'Fair']);
  });

  it('emits update:* with the new value for each field', async () => {
    const w = mountBasics();
    await w.find('#ef-name').setValue('Keg 2');
    await w.find('#ef-category').setValue('keg');
    await w.find('#ef-condition').setValue('Good');
    await w.find('#ef-notes').setValue('New');
    expect(w.emitted('update:name')).toEqual([['Keg 2']]);
    expect(w.emitted('update:category')).toEqual([['keg']]);
    expect(w.emitted('update:condition')).toEqual([['Good']]);
    expect(w.emitted('update:notes')).toEqual([['New']]);
  });

  it('disables every control while saving', () => {
    const w = mountBasics({ saving: true });
    for (const el of w.findAll('input, select, textarea')) {
      expect(el.attributes('disabled')).toBeDefined();
    }
  });
});
