import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

vi.mock('../api.js', () => ({ createTag: vi.fn() }));

import { createTag } from '../api.js';
import TagInput from '../components/TagInput.vue';

const MALT = { id: 1, name: 'Malt', color: '#111111' };
const HOPS = { id: 2, name: 'Hops', color: '#222222' };
const YEAST = { id: 3, name: 'Yeast', color: '#333333' };
const ALL = [MALT, HOPS, YEAST];

const mountInput = (modelValue = [], allTags = ALL) =>
  mount(TagInput, { props: { modelValue, allTags } });

async function type(w, text) {
  const input = w.find('input');
  await input.setValue(text);
  return input;
}

const optionTexts = (w) => w.findAll('.tag-input__option').map((o) => o.text());

beforeEach(() => {
  createTag.mockReset();
});

describe('TagInput rendering', () => {
  it('shows no pills and no dropdown when empty', () => {
    const w = mountInput();
    expect(w.find('.tag-input__selected').exists()).toBe(false);
    expect(w.find('.tag-input__dropdown').exists()).toBe(false);
    expect(w.find('input').attributes('placeholder')).toBe('Add tag…');
  });

  it('renders a pill per selected tag with its colour variable', () => {
    const w = mountInput([MALT, HOPS]);
    const pills = w.findAll('.tag-pill');
    expect(pills.map((p) => p.text().replace('×', '').trim())).toEqual(['Malt', 'Hops']);
    expect(pills[0].attributes('style')).toContain('--tag-color: #111111');
  });

  it('opens the dropdown on focus listing only unselected tags', async () => {
    const w = mountInput([MALT]);
    await w.find('input').trigger('focus');
    expect(optionTexts(w)).toEqual(['Hops', 'Yeast']);
  });

  it('filters options case-insensitively by substring', async () => {
    const w = mountInput();
    await type(w, 'ye');
    expect(optionTexts(w)).toEqual(['Yeast', 'Create "ye"']);
  });

  it('offers no Create option when the query exactly matches a tag (any case)', async () => {
    const w = mountInput();
    await type(w, 'HOPS');
    expect(optionTexts(w)).toEqual(['Hops']);
  });

  it('closes and clears the query on Escape', async () => {
    const w = mountInput();
    const input = await type(w, 'ye');
    await input.trigger('keydown', { key: 'Escape' });
    expect(w.find('.tag-input__dropdown').exists()).toBe(false);
    expect(input.element.value).toBe('');
  });
});

describe('TagInput removing', () => {
  it('emits the list without the removed tag', async () => {
    const w = mountInput([MALT, HOPS]);
    await w.findAll('.tag-pill__remove')[0].trigger('click');
    expect(w.emitted('update:modelValue')).toEqual([[[HOPS]]]);
  });
});

describe('TagInput selecting existing tags', () => {
  it('appends the clicked option (mousedown) and clears the query', async () => {
    const w = mountInput([MALT]);
    const input = await type(w, 'ho');
    await w.find('.tag-input__option').trigger('mousedown');
    expect(w.emitted('update:modelValue')).toEqual([[[MALT, HOPS]]]);
    expect(input.element.value).toBe('');
    expect(w.find('.tag-input__dropdown').exists()).toBe(false);
    expect(createTag).not.toHaveBeenCalled();
  });

  it('Enter selects the sole filtered tag even on a partial match', async () => {
    const w = mountInput();
    const input = await type(w, 'yea');
    await input.trigger('keydown', { key: 'Enter' });
    expect(w.emitted('update:modelValue')).toEqual([[[YEAST]]]);
    expect(createTag).not.toHaveBeenCalled();
  });

  it('Enter with several matches and an exact name selects the exact one', async () => {
    const tags = [...ALL, { id: 4, name: 'Hops Pellets', color: '#444444' }];
    const w = mountInput([], tags);
    const input = await type(w, 'hops');
    await input.trigger('keydown', { key: 'Enter' });
    expect(w.emitted('update:modelValue')).toEqual([[[HOPS]]]);
  });

  it('Enter on an already-selected exact name emits nothing (no duplicate)', async () => {
    const w = mountInput([HOPS]);
    const input = await type(w, 'hops');
    await input.trigger('keydown', { key: 'Enter' });
    expect(w.emitted('update:modelValue')).toBeUndefined();
    expect(createTag).not.toHaveBeenCalled();
  });

  it('does not list an already-selected tag as an option', async () => {
    const w = mountInput([HOPS]);
    await type(w, 'hops');
    expect(optionTexts(w)).toEqual([]);
  });
});

describe('TagInput creating tags', () => {
  it('Enter on an unknown name creates the tag, selects it and emits tag-created', async () => {
    const created = { id: 9, name: 'Barley', color: '#999999' };
    createTag.mockResolvedValue(created);
    const w = mountInput([MALT]);
    const input = await type(w, '  Barley  ');
    await input.trigger('keydown', { key: 'Enter' });
    await flushPromises();
    expect(createTag).toHaveBeenCalledExactlyOnceWith({ name: 'Barley' });
    expect(w.emitted('update:modelValue')).toEqual([[[MALT, created]]]);
    expect(w.emitted('tag-created')).toEqual([[created]]);
    expect(input.element.value).toBe('');
    expect(w.find('.tag-input__dropdown').exists()).toBe(false);
  });

  it('clicking the Create option creates the trimmed name', async () => {
    const created = { id: 9, name: 'Barley', color: '#999999' };
    createTag.mockResolvedValue(created);
    const w = mountInput();
    await type(w, 'Barley ');
    await w.find('.tag-input__option--create').trigger('mousedown');
    await flushPromises();
    expect(createTag).toHaveBeenCalledExactlyOnceWith({ name: 'Barley' });
    expect(w.emitted('tag-created')).toEqual([[created]]);
  });

  it('emits nothing and keeps the dropdown open when creation fails', async () => {
    createTag.mockImplementation(() => Promise.reject(new Error('exists')));
    const w = mountInput();
    const input = await type(w, 'Barley');
    await input.trigger('keydown', { key: 'Enter' });
    await flushPromises();
    expect(w.emitted('update:modelValue')).toBeUndefined();
    expect(w.emitted('tag-created')).toBeUndefined();
    expect(input.element.value).toBe('Barley');
    expect(w.find('.tag-input__dropdown').exists()).toBe(true);
  });

  it('Enter on blank input creates nothing', async () => {
    const w = mountInput([], []);
    const input = await type(w, '   ');
    await input.trigger('keydown', { key: 'Enter' });
    await flushPromises();
    expect(createTag).not.toHaveBeenCalled();
    expect(w.emitted('update:modelValue')).toBeUndefined();
  });
});
