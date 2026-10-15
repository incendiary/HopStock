import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import EquipmentLoans from '../components/equipment-detail/EquipmentLoans.vue';
import { formatDateShort } from '../utils/date.js';

const loans = [
  {
    id: 1,
    borrower: 'Sam',
    loaned_at: '2025-01-02',
    expected_return: '2025-01-20',
    returned_at: null,
    notes: 'urgent',
  },
  {
    id: 2,
    borrower: 'Alex',
    loaned_at: '2025-03-02',
    expected_return: null,
    returned_at: '2025-03-09',
    notes: null,
  },
  {
    id: 3,
    borrower: 'Pat',
    loaned_at: '2025-05-01',
    expected_return: '2099-01-01',
    returned_at: null,
    notes: null,
  },
];
const mountLoans = (props = {}) => mount(EquipmentLoans, { props: { loans: [], ...props } });

describe('EquipmentLoans', () => {
  afterEach(() => vi.useRealTimers());

  it('shows the empty state and the record button', () => {
    const w = mountLoans();
    expect(w.find('.loans-empty').text()).toBe('No loan history.');
    expect(w.find('button').text()).toBe('+ Record loan');
  });

  it('renders loan rows with status, dates and notes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-01T00:00:00Z'));
    const w = mountLoans({ loans });
    const rows = w.findAll('.loan-row');
    expect(rows).toHaveLength(3);
    expect(rows[0].find('.loan-row__borrower').text()).toBe('Sam');
    expect(rows[0].find('.loan-row__overdue').text()).toBe('— OVERDUE');
    expect(rows[0].find('.loan-row__dates').text()).toContain(
      `${formatDateShort('2025-01-02')} → due ${formatDateShort('2025-01-20')}`,
    );
    expect(rows[0].find('.loan-row__notes').text()).toBe('urgent');
    expect(rows[0].classes()).toContain('loan-row--active');
    expect(rows[1].find('.loan-row__returned').text()).toBe(
      `— returned ${formatDateShort('2025-03-09')}`,
    );
    expect(rows[1].classes()).not.toContain('loan-row--active');
    expect(rows[1].find('.btn--accent').exists()).toBe(false);
    expect(rows[2].find('.loan-row__overdue').exists()).toBe(false);
    expect(w.find('.loans-empty').exists()).toBe(false);
  });

  it('emits return and remove with the loan', async () => {
    const w = mountLoans({ loans });
    const rows = w.findAll('.loan-row');
    await rows[0].find('.btn--accent').trigger('click');
    await rows[1].find('[title="Delete loan record"]').trigger('click');
    expect(w.emitted('return')).toEqual([[loans[0]]]);
    expect(w.emitted('remove')).toEqual([[loans[1]]]);
  });

  it('asks the parent to open the form', async () => {
    const w = mountLoans();
    await w.find('button').trigger('click');
    expect(w.emitted('update:showForm')).toEqual([[true]]);
  });

  it('hides the empty message while the form is open and cancels via event', async () => {
    const w = mountLoans({ showForm: true });
    expect(w.find('.loans-empty').exists()).toBe(false);
    await w
      .findAll('button')
      .find((b) => b.text() === 'Cancel')
      .trigger('click');
    expect(w.emitted('update:showForm')).toEqual([[false]]);
  });

  it('requires a borrower before enabling submit', async () => {
    const w = mountLoans({ showForm: true });
    const submit = w.find('button[type="submit"]');
    expect(submit.attributes('disabled')).toBeDefined();
    await w.find('#loan-borrower').setValue('   ');
    expect(submit.attributes('disabled')).toBeDefined();
    await w.find('form').trigger('submit');
    expect(w.emitted('record')).toBeUndefined();
  });

  it('emits record with trimmed and null-normalised fields', async () => {
    const w = mountLoans({ showForm: true });
    await w.find('#loan-borrower').setValue('  Sam  ');
    await w.find('#loan-return').setValue('2025-02-01');
    await w.find('form').trigger('submit');
    expect(w.emitted('record')).toEqual([
      [{ borrower: 'Sam', loaned_at: null, expected_return: '2025-02-01', notes: null }],
    ]);
  });

  it('shows saving state and disables inputs', () => {
    const w = mountLoans({ showForm: true, saving: true });
    expect(w.find('button[type="submit"]').text()).toBe('Saving…');
    expect(w.find('#loan-borrower').attributes('disabled')).toBeDefined();
  });
});
