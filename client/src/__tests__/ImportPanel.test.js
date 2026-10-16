import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ImportPanel from '../components/dashboard/ImportPanel.vue';

const mountPanel = (props = {}) =>
  mount(ImportPanel, {
    props,
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  });

describe('ImportPanel', () => {
  it('starts with a placeholder label and a disabled Import button', () => {
    const w = mountPanel();
    expect(w.find('.file-pick__label').text()).toBe('Choose CSV or JSON…');
    expect(w.find('button[type=submit]').attributes('disabled')).toBeDefined();
    expect(w.find('.import-result').exists()).toBe(false);
  });

  it('shows the chosen file name and enables Import', () => {
    const file = new File(['x'], 'items.csv', { type: 'text/csv' });
    const w = mountPanel({ file });
    expect(w.find('.file-pick__label').text()).toBe('items.csv');
    expect(w.find('button[type=submit]').attributes('disabled')).toBeUndefined();
  });

  it('emits select with the picked File, or null when cleared', async () => {
    const w = mountPanel();
    const input = w.find('input[type=file]');
    expect(input.attributes('accept')).toBe('.csv,.json,text/csv,application/json');
    const file = new File(['x'], 'a.json', { type: 'application/json' });
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true });
    await input.trigger('change');
    Object.defineProperty(input.element, 'files', { value: [], configurable: true });
    await input.trigger('change');
    expect(w.emitted('select')).toEqual([[file], [null]]);
  });

  it('emits submit when the form is submitted', async () => {
    const file = new File(['x'], 'a.csv');
    const w = mountPanel({ file });
    await w.find('form').trigger('submit');
    expect(w.emitted('submit')).toEqual([[]]);
  });

  it('disables the input and button and relabels while importing', () => {
    const w = mountPanel({ file: new File(['x'], 'a.csv'), importing: true });
    expect(w.find('button[type=submit]').text()).toBe('Importing…');
    expect(w.find('button[type=submit]').attributes('disabled')).toBeDefined();
    expect(w.find('input[type=file]').attributes('disabled')).toBeDefined();
  });

  it('shows imported, skipped and per-row errors with the inventory link', () => {
    const w = mountPanel({
      result: {
        imported: 2,
        skipped: 1,
        errors: [{ row: 3, message: 'unknown category "x"' }],
      },
    });
    expect(w.find('.import-result__ok').text()).toBe('✓ Imported 2 items');
    expect(w.find('.import-result__warn').text()).toBe('⚠ Skipped 1 row');
    expect(w.findAll('.import-result__errors li').map((l) => l.text())).toEqual([
      'Row 3: unknown category "x"',
    ]);
    expect(w.find('.import-result__hint').text()).toBe('View inventory →');
  });

  it('uses singular and plural wording and ignores a duplicates count', () => {
    const w = mountPanel({ result: { imported: 1, skipped: 2, duplicates: 4, errors: [] } });
    expect(w.find('.import-result__ok').text()).toBe('✓ Imported 1 item');
    expect(w.find('.import-result__warn').text()).toBe('⚠ Skipped 2 rows');
    expect(w.find('.import-result__errors').exists()).toBe(false);
    expect(w.text()).not.toContain('uplicate');
  });

  it('renders an empty result box when nothing was imported or skipped', () => {
    const w = mountPanel({ result: { imported: 0, skipped: 0, duplicates: 1, errors: [] } });
    expect(w.find('.import-result').text()).toBe('');
  });

  it('shows an import error message', () => {
    const w = mountPanel({ error: 'File contains no records.' });
    expect(w.find('.import-result__error-msg').text()).toBe('File contains no records.');
  });
});
