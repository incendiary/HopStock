import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EquipmentTopbar from '../components/equipment-detail/EquipmentTopbar.vue';

const stubs = { RouterLink: { template: '<a><slot /></a>' } };
const mountBar = (props = {}) => mount(EquipmentTopbar, { props, global: { stubs } });
const buttonByText = (w, text) => w.findAll('button').find((b) => b.text() === text);

describe('EquipmentTopbar', () => {
  it('renders the actions and emits toggle-qr and edit', async () => {
    const w = mountBar();
    expect(w.text()).toContain('← Inventory');
    await buttonByText(w, '📷 QR').trigger('click');
    await buttonByText(w, 'Edit').trigger('click');
    expect(w.emitted('toggle-qr')).toHaveLength(1);
    expect(w.emitted('edit')).toHaveLength(1);
  });

  it('asks to confirm before deleting', async () => {
    const w = mountBar();
    await buttonByText(w, 'Delete').trigger('click');
    expect(w.emitted('update:confirming')).toEqual([[true]]);
    expect(w.emitted('delete')).toBeUndefined();
  });

  it('shows the confirmation step and emits delete or cancel', async () => {
    const w = mountBar({ confirming: true });
    expect(w.text()).toContain('Delete this item?');
    await buttonByText(w, 'Yes, delete').trigger('click');
    await buttonByText(w, 'Cancel').trigger('click');
    expect(w.emitted('delete')).toHaveLength(1);
    expect(w.emitted('update:confirming')).toEqual([[false]]);
  });

  it('shows progress and disables buttons while deleting', () => {
    const w = mountBar({ confirming: true, deleting: true });
    expect(buttonByText(w, 'Deleting…').attributes('disabled')).toBeDefined();
    expect(buttonByText(w, 'Cancel').attributes('disabled')).toBeDefined();
  });
});
