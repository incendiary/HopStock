import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EquipmentQrPanel from '../components/equipment-detail/EquipmentQrPanel.vue';

describe('EquipmentQrPanel', () => {
  it('shows the item name, URL and print link', () => {
    const w = mount(EquipmentQrPanel, {
      props: { name: 'Brew Kettle', url: 'http://host/equipment/7' },
      global: {
        stubs: { QrCode: true, RouterLink: { template: '<a><slot /></a>' } },
      },
    });
    expect(w.find('strong').text()).toBe('Brew Kettle');
    expect(w.find('.qr-panel__url').text()).toBe('http://host/equipment/7');
    expect(w.text()).toContain('Print all labels →');
    expect(w.findComponent({ name: 'QrCode' }).props()).toEqual({
      value: 'http://host/equipment/7',
      size: 200,
    });
  });
});
