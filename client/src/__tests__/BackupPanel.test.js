import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BackupPanel from '../components/dashboard/BackupPanel.vue';

describe('BackupPanel', () => {
  it('emits backup with no payload when the button is clicked', async () => {
    const w = mount(BackupPanel);
    expect(w.find('button').text()).toBe('💾 Backup now');
    await w.find('button').trigger('click');
    expect(w.emitted('backup')).toEqual([[]]);
    expect(w.find('.backup-message').exists()).toBe(false);
  });

  it('disables the button and changes its label while backing up', () => {
    const w = mount(BackupPanel, { props: { backingUp: true } });
    expect(w.find('button').text()).toBe('Backing up…');
    expect(w.find('button').attributes('disabled')).toBeDefined();
  });

  it('shows a success message and flags an error message', async () => {
    const w = mount(BackupPanel, { props: { message: 'Backup created ✓' } });
    expect(w.find('.backup-message').text()).toBe('Backup created ✓');
    expect(w.find('.backup-message--error').exists()).toBe(false);
    await w.setProps({ message: 'Backup failed', error: true });
    expect(w.find('.backup-message--error').text()).toBe('Backup failed');
  });
});
