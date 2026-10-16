import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EquipmentFormPhotos from '../components/equipment-form/EquipmentFormPhotos.vue';

const existing = [
  { id: 1, url: '/uploads/a.png' },
  { id: 2, url: '/uploads/b.png' },
];
const file = new File(['x'], 'new.png', { type: 'image/png' });
const mountPhotos = (props = {}) =>
  mount(EquipmentFormPhotos, { props: { name: 'Kettle', ...props } });

describe('EquipmentFormPhotos', () => {
  it('labels the upload field by mode and hides empty grids', () => {
    expect(mountPhotos().find('.field__label').text()).toBe('Photos');
    expect(mountPhotos({ isEditing: true }).find('.field__label').text()).toBe('Add photos');
    expect(mountPhotos().find('.photo-grid').exists()).toBe(false);
  });

  it('renders existing photos with the item name as alt text', () => {
    const w = mountPhotos({ existingPhotos: existing, isEditing: true });
    const imgs = w.findAll('.photo-thumb__img');
    expect(imgs.map((i) => i.attributes('src'))).toEqual(['/uploads/a.png', '/uploads/b.png']);
    expect(imgs[0].attributes('alt')).toBe('Kettle');
  });

  it('marks staged removals and emits stage-remove with the photo id', async () => {
    const w = mountPhotos({
      existingPhotos: existing,
      isEditing: true,
      photosToDelete: new Set([2]),
    });
    const thumbs = w.findAll('.photo-thumb');
    expect(thumbs[0].find('.photo-thumb__deleted-overlay').exists()).toBe(false);
    expect(thumbs[1].find('.photo-thumb__deleted-overlay').text()).toBe('Removing');
    await thumbs[1].find('.photo-thumb__remove').trigger('click');
    expect(w.emitted('stage-remove')).toEqual([[2]]);
  });

  it('renders new files and emits remove-new-file with the index', async () => {
    const w = mountPhotos({ newFiles: [{ file, preview: 'blob:one' }] });
    const img = w.find('.photo-thumb__img');
    expect(img.attributes('src')).toBe('blob:one');
    expect(img.attributes('alt')).toBe('new.png');
    await w.find('.photo-thumb__remove').trigger('click');
    expect(w.emitted('remove-new-file')).toEqual([[0]]);
  });

  it('emits files-selected with the chosen files', async () => {
    const w = mountPhotos();
    const input = w.find('.file-pick__input');
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true });
    await input.trigger('change');
    expect(w.emitted('files-selected')).toEqual([[[file]]]);
  });

  it('disables the controls while saving', () => {
    const w = mountPhotos({
      existingPhotos: existing,
      newFiles: [{ file, preview: 'blob:one' }],
      saving: true,
    });
    expect(w.find('.file-pick__input').attributes('disabled')).toBeDefined();
    for (const b of w.findAll('.photo-thumb__remove')) {
      expect(b.attributes('disabled')).toBeDefined();
    }
  });
});
