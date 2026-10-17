import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AppModal from '../components/AppModal.vue';

let w;
afterEach(() => w?.unmount());

const mountModal = (opts = {}) =>
  mount(AppModal, { props: { title: 'Delete item' }, attachTo: document.body, ...opts });

describe('AppModal', () => {
  it('teleports the dialog to document.body with the title and slot content', () => {
    w = mountModal({ slots: { default: '<p class="slotted">Are you sure?</p>' } });
    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.querySelector('.modal-title').textContent.trim()).toBe('Delete item');
    expect(dialog.querySelector('.modal-body .slotted').textContent).toBe('Are you sure?');
  });

  it('links aria-labelledby to the heading id', () => {
    w = mountModal();
    const dialog = document.body.querySelector('[role="dialog"]');
    const id = dialog.getAttribute('aria-labelledby');
    expect(id).toMatch(/^modal-title-/);
    expect(document.getElementById(id).textContent.trim()).toBe('Delete item');
  });

  it('emits close with no payload when the × button is clicked', () => {
    w = mountModal();
    document.body.querySelector('button[aria-label="Close"]').click();
    expect(w.emitted('close')).toEqual([[]]);
  });

  it('emits close when the backdrop itself is clicked', () => {
    w = mountModal();
    document.body.querySelector('.modal-backdrop').click();
    expect(w.emitted('close')).toEqual([[]]);
  });

  it('does not emit close when the panel or slot content is clicked', () => {
    w = mountModal({ slots: { default: '<span class="inner">x</span>' } });
    document.body.querySelector('.modal-panel').click();
    document.body.querySelector('.inner').click();
    expect(w.emitted('close')).toBeUndefined();
  });

  // AppModal has no Escape handler: nothing to test (see PR description).
});
