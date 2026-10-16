import { describe, it, expect, vi } from 'vitest';

// Route components are irrelevant to the title hook; avoid loading the real views.
vi.mock('../views/EquipmentList.vue', () => ({ default: { template: '<div />' } }));
vi.mock('../views/EquipmentDetail.vue', () => ({ default: { template: '<div />' } }));
vi.mock('../views/Dashboard.vue', () => ({ default: { template: '<div />' } }));
vi.mock('../views/Routines.vue', () => ({ default: { template: '<div />' } }));
vi.mock('../views/Locations.vue', () => ({ default: { template: '<div />' } }));
vi.mock('../views/PrintLabels.vue', () => ({ default: { template: '<div />' } }));

import router from '../router.js';

describe('router document.title', () => {
  it.each([
    ['/', 'Inventory — HopStock'],
    ['/dashboard', 'Dashboard — HopStock'],
    ['/routines', 'Routines — HopStock'],
    ['/locations', 'Locations — HopStock'],
    ['/print-labels', 'Print Labels — HopStock'],
  ])('sets the title for %s', async (path, title) => {
    document.title = 'stale';
    // Navigating to the current path is a no-op, so leave a different page first.
    await router.push(path === '/dashboard' ? '/routines' : '/dashboard');
    document.title = 'stale';
    await router.push(path);
    expect(document.title).toBe(title);
  });

  it('uses the bare app name for routes without a title entry', async () => {
    await router.push('/equipment/12');
    expect(document.title).toBe('HopStock');
  });

  it('redirects unknown paths to / and titles them as Inventory', async () => {
    await router.push('/nope');
    expect(router.currentRoute.value.path).toBe('/');
    expect(document.title).toBe('Inventory — HopStock');
  });
});
