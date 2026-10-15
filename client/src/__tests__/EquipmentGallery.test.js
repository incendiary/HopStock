import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EquipmentGallery from '../components/equipment-detail/EquipmentGallery.vue';

const photos = [
  { id: 1, url: '/uploads/a.png', caption: null },
  { id: 2, url: '/uploads/b.png', caption: 'Side view' },
  { id: 3, url: '/uploads/c.png', caption: null },
];
const mountGallery = (props = {}) =>
  mount(EquipmentGallery, { props: { name: 'Kettle', photos, activePhotoId: 1, ...props } });

describe('EquipmentGallery', () => {
  it('shows the icon placeholder when there are no photos', () => {
    const w = mountGallery({ photos: [], icon: '🍺' });
    expect(w.find('.gallery__placeholder').text()).toBe('🍺');
    expect(w.find('.gallery__manage').exists()).toBe(false);
  });

  it('falls back to the box emoji without an icon', () => {
    const w = mountGallery({ photos: [] });
    expect(w.find('.gallery__placeholder').text()).toBe('📦');
  });

  it('shows the active photo and its caption', () => {
    const w = mountGallery({ activePhotoId: 2 });
    expect(w.find('.gallery__featured').attributes('src')).toBe('/uploads/b.png');
    expect(w.find('.gallery__featured').attributes('alt')).toBe('Kettle');
    expect(w.find('.gallery__caption').text()).toBe('Side view');
  });

  it('defaults to the first photo when the active id is unknown', () => {
    const w = mountGallery({ activePhotoId: 99 });
    expect(w.find('.gallery__featured').attributes('src')).toBe('/uploads/a.png');
  });

  it('emits update:activePhotoId when a thumbnail is clicked', async () => {
    const w = mountGallery();
    await w.findAll('.gallery__thumb-btn')[2].trigger('click');
    expect(w.emitted('update:activePhotoId')).toEqual([[3]]);
  });

  it('hides thumbnails for a single photo', () => {
    expect(
      mountGallery({ photos: [photos[0]] })
        .find('.gallery__thumbs')
        .exists(),
    ).toBe(false);
  });

  it('emits move with exact payloads and disables the end buttons', async () => {
    const w = mountGallery();
    const rows = w.findAll('.photo-manage-row');
    expect(rows[0].findAll('.btn-icon')[0].attributes('disabled')).toBeDefined();
    expect(rows[2].findAll('.btn-icon')[1].attributes('disabled')).toBeDefined();
    await rows[1].find('[title="Move up"]').trigger('click');
    await rows[1].find('[title="Move down"]').trigger('click');
    expect(w.emitted('move')).toEqual([
      [{ photo: photos[1], idx: 1, direction: -1 }],
      [{ photo: photos[1], idx: 1, direction: 1 }],
    ]);
  });

  it('marks the first photo as primary and emits set-primary for the others', async () => {
    const w = mountGallery();
    const rows = w.findAll('.photo-manage-row');
    expect(rows[0].find('.photo-manage-row__primary').text()).toBe('Primary');
    expect(rows[0].find('[title="Set as primary"]').exists()).toBe(false);
    await rows[2].find('[title="Set as primary"]').trigger('click');
    expect(w.emitted('set-primary')).toEqual([[photos[2]]]);
  });

  it('emits save-caption with the typed value', async () => {
    const w = mountGallery();
    const input = w.findAll('.photo-manage-row__caption')[1];
    expect(input.element.value).toBe('Side view');
    await input.setValue('Front view');
    expect(w.emitted('save-caption')).toEqual([[{ photo: photos[1], caption: 'Front view' }]]);
  });
});
