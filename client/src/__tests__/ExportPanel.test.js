import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ExportPanel from '../components/dashboard/ExportPanel.vue';
import { BASE } from '../api.js';

describe('ExportPanel', () => {
  it('links the CSV and JSON exports through BASE with download names', () => {
    const w = mount(ExportPanel);
    expect(w.find('.section__title').text()).toBe('Export');
    const links = w
      .findAll('a')
      .map((a) => [a.text(), a.attributes('href'), a.attributes('download')]);
    expect(links).toEqual([
      ['↓ CSV', `${BASE}/export/csv`, 'hopstock-export.csv'],
      ['↓ JSON', `${BASE}/export/json`, 'hopstock-export.json'],
    ]);
  });
});
