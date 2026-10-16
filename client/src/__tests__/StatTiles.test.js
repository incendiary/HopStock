import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import StatTiles from '../components/dashboard/StatTiles.vue';

const tiles = (w) => w.findAll('.stat-tile').map((t) => t.findAll('span').map((s) => s.text()));

describe('StatTiles', () => {
  it('shows items, units and photos, with plurals and no loan tile', () => {
    const w = mount(StatTiles, { props: { total: 24, totalUnits: 32, photos: 5, onLoan: 0 } });
    expect(tiles(w)).toEqual([
      ['24', 'items', '32 units'],
      ['5', 'photos'],
    ]);
    expect(w.find('.stat-tile--warning').exists()).toBe(false);
  });

  it('uses singular labels and hides units when they equal the item count', () => {
    const w = mount(StatTiles, { props: { total: 1, totalUnits: 1, photos: 1 } });
    expect(tiles(w)).toEqual([
      ['1', 'item'],
      ['1', 'photo'],
    ]);
    expect(w.find('.stat-tile__sub').exists()).toBe(false);
  });

  it('shows the on-loan tile only when something is on loan', () => {
    const w = mount(StatTiles, { props: { total: 3, photos: 0, onLoan: 2 } });
    expect(tiles(w)[2]).toEqual(['2', 'on loan']);
    expect(w.find('.stat-tile--warning').exists()).toBe(true);
  });
});
