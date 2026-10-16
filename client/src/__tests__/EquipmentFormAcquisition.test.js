import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EquipmentFormAcquisition from '../components/equipment-form/EquipmentFormAcquisition.vue';

const mountAcq = (props = {}) =>
  mount(EquipmentFormAcquisition, {
    props: {
      purchaseDate: '2025-03-01',
      purchasePrice: 199.5,
      purchaseCurrency: 'EUR',
      retailer: 'Brew UK',
      warrantyExpires: '2027-03-01',
      modelNumber: 'M1',
      serialNumber: 'SN1',
      ...props,
    },
  });

describe('EquipmentFormAcquisition', () => {
  it('renders values from props', () => {
    const w = mountAcq();
    expect(w.find('#ef-purchase-date').element.value).toBe('2025-03-01');
    expect(w.find('#ef-purchase-price').element.value).toBe('199.5');
    expect(w.find('.field__input--currency').element.value).toBe('EUR');
    expect(w.find('#ef-retailer').element.value).toBe('Brew UK');
    expect(w.find('#ef-warranty').element.value).toBe('2027-03-01');
    expect(w.find('#ef-model').element.value).toBe('M1');
    expect(w.find('#ef-serial').element.value).toBe('SN1');
  });

  it('emits update:* with exact payloads (price as a number)', async () => {
    const w = mountAcq();
    await w.find('#ef-purchase-price').setValue('12.5');
    await w.find('.field__input--currency').setValue('USD');
    await w.find('#ef-retailer').setValue('Shop');
    await w.find('#ef-serial').setValue('S2');
    expect(w.emitted('update:purchasePrice')).toEqual([[12.5]]);
    expect(w.emitted('update:purchaseCurrency')).toEqual([['USD']]);
    expect(w.emitted('update:retailer')).toEqual([['Shop']]);
    expect(w.emitted('update:serialNumber')).toEqual([['S2']]);
  });

  it('hides the scan link unless scanning is available', () => {
    expect(mountAcq().find('.btn-scan-link').exists()).toBe(false);
  });

  it('shows the scan link, and its busy state', () => {
    expect(mountAcq({ scanAvailable: true }).find('.btn-scan-link').text()).toBe('scan a receipt');
    const busy = mountAcq({ scanAvailable: true, scanning: true }).find('.btn-scan-link');
    expect(busy.text()).toBe('Scanning…');
    expect(busy.attributes('disabled')).toBeDefined();
  });

  it('renders the scan error', () => {
    expect(mountAcq({ scanError: 'Boom' }).find('.scan-error').text()).toBe('Boom');
    expect(mountAcq().find('.scan-error').exists()).toBe(false);
  });

  it('emits scan with the chosen file and ignores an empty selection', async () => {
    const w = mountAcq({ scanAvailable: true });
    const input = w.find('input[type="file"]');
    const file = new File(['x'], 'receipt.png', { type: 'image/png' });
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true });
    await input.trigger('change');
    expect(w.emitted('scan')).toEqual([[file]]);
    Object.defineProperty(input.element, 'files', { value: [], configurable: true });
    await input.trigger('change');
    expect(w.emitted('scan')).toHaveLength(1);
  });

  it('open() expands the details element', () => {
    const w = mountAcq();
    expect(w.find('details').element.open).toBe(false);
    w.vm.open();
    expect(w.find('details').element.open).toBe(true);
  });
});
