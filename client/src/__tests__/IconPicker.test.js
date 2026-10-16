import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import IconPicker from '../components/IconPicker.vue';

const mountPicker = (modelValue) => mount(IconPicker, { props: { modelValue } });
const byTitle = (w, t) => w.find(`button[title="${t}"]`);

describe('IconPicker', () => {
  it('renders a No icon button plus 29 icon buttons', () => {
    const w = mountPicker(null);
    expect(w.findAll('button')).toHaveLength(30);
    expect(w.findAll('button')[0].attributes('title')).toBe('No icon');
    expect(w.findAll('button')[0].text()).toBe('—');
  });

  it('shows emoji glyphs with their label as the title', () => {
    const w = mountPicker(null);
    expect(byTitle(w, 'Kettle').text()).toBe('🫕');
    expect(byTitle(w, 'Pump').text()).toBe('⚙️');
    expect(byTitle(w, 'Other').text()).toBe('📦');
  });

  it('marks only "No icon" as selected when modelValue is null', () => {
    const w = mountPicker(null);
    const selected = w.findAll('.icon-btn--selected');
    expect(selected).toHaveLength(1);
    expect(selected[0].attributes('title')).toBe('No icon');
  });

  it('marks only the matching icon as selected', () => {
    const w = mountPicker('🔥');
    const selected = w.findAll('.icon-btn--selected');
    expect(selected).toHaveLength(1);
    expect(selected[0].attributes('title')).toBe('Burner');
  });

  it('emits the emoji when an icon is clicked', async () => {
    const w = mountPicker(null);
    await byTitle(w, 'Keg').trigger('click');
    expect(w.emitted('update:modelValue')).toEqual([['🛢️']]);
  });

  it('emits null when No icon is clicked', async () => {
    const w = mountPicker('🔥');
    await byTitle(w, 'No icon').trigger('click');
    expect(w.emitted('update:modelValue')).toEqual([[null]]);
  });

  it('moves the selected class when modelValue changes', async () => {
    const w = mountPicker('🔥');
    await w.setProps({ modelValue: '🧊' });
    const selected = w.findAll('.icon-btn--selected');
    expect(selected).toHaveLength(1);
    expect(selected[0].attributes('title')).toBe('Plate Chiller');
  });
});
