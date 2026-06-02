import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import EquipmentForm from '../components/EquipmentForm.vue';

// Stub all API calls the form makes on mount
vi.mock('../api.js', () => ({
  getCategories:      vi.fn().mockResolvedValue([
    { id: 'kettle', label: 'Kettle', group: 'Vessels' },
    { id: 'fermenter', label: 'Fermenter', group: 'Vessels' },
  ]),
  getConditions:      vi.fn().mockResolvedValue(['Good', 'Fair', 'Needs Repair', 'Retired']),
  getTags:            vi.fn().mockResolvedValue([]),
  checkScanAvailable: vi.fn().mockResolvedValue({ available: false }),
  getLocations:       vi.fn().mockResolvedValue([]),
  getEquipmentItem:   vi.fn().mockResolvedValue({
    id: 42,
    name: 'Existing Kettle',
    category: 'kettle',
    condition: 'Fair',
    notes: 'Old notes',
    icon: null,
    tags: [],
    quantity: 2,
    location_id: null,
    purchase_date: null,
    purchase_price: null,
    purchase_currency: 'GBP',
    retailer: null,
    serial_number: null,
    model_number: null,
    warranty_expires: null,
    photos: [],
  }),
  createEquipment: vi.fn().mockResolvedValue({ id: 99, name: 'New Item' }),
  updateEquipment: vi.fn().mockResolvedValue({ id: 42, name: 'Existing Kettle' }),
  uploadPhotos:    vi.fn().mockResolvedValue([]),
}));

describe('EquipmentForm', () => {
  describe('create mode (no itemId)', () => {
    it('renders with empty name field', async () => {
      const wrapper = mount(EquipmentForm);
      await flushPromises();

      const nameInput = wrapper.find('#ef-name');
      expect(nameInput.element.value).toBe('');
    });

    it('defaults condition to Good', async () => {
      const wrapper = mount(EquipmentForm);
      await flushPromises();

      const condSelect = wrapper.find('#ef-condition');
      expect(condSelect.element.value).toBe('Good');
    });

    it('defaults quantity to 1', async () => {
      const wrapper = mount(EquipmentForm);
      await flushPromises();

      const qtyInput = wrapper.find('#ef-quantity');
      expect(Number(qtyInput.element.value)).toBe(1);
    });
  });

  describe('edit mode (itemId provided)', () => {
    it('pre-fills name from loaded item', async () => {
      const wrapper = mount(EquipmentForm, { props: { itemId: 42 } });
      await flushPromises();

      const nameInput = wrapper.find('#ef-name');
      expect(nameInput.element.value).toBe('Existing Kettle');
    });

    it('pre-fills condition from loaded item', async () => {
      const wrapper = mount(EquipmentForm, { props: { itemId: 42 } });
      await flushPromises();

      const condSelect = wrapper.find('#ef-condition');
      expect(condSelect.element.value).toBe('Fair');
    });

    it('pre-fills quantity from loaded item', async () => {
      const wrapper = mount(EquipmentForm, { props: { itemId: 42 } });
      await flushPromises();

      const qtyInput = wrapper.find('#ef-quantity');
      expect(Number(qtyInput.element.value)).toBe(2);
    });
  });

  describe('cancel button', () => {
    it('emits cancel event', async () => {
      const wrapper = mount(EquipmentForm);
      await flushPromises();

      const cancelBtn = wrapper.find('.btn--secondary');
      await cancelBtn.trigger('click');

      expect(wrapper.emitted('cancel')).toBeTruthy();
    });
  });
});
