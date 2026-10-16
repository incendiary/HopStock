import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import DashboardSection from '../components/dashboard/DashboardSection.vue';

describe('DashboardSection', () => {
  it('renders the title and slot content', () => {
    const w = mount(DashboardSection, {
      props: { title: 'Export' },
      slots: { default: '<p class="inner">body</p>' },
    });
    expect(w.find('h3.section__title').text()).toBe('Export');
    expect(w.find('section.section .inner').text()).toBe('body');
  });
});
