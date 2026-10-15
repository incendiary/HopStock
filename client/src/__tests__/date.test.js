import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatDate, formatDateShort, daysAgo } from '../utils/date.js';

const iso = '2025-03-14T15:30:00';
const expectedShort = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
  new Date(iso),
);

describe('formatDate', () => {
  it('returns an em dash for empty values', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('')).toBe('—');
    expect(formatDate(undefined)).toBe('—');
  });

  it('formats date and time', () => {
    const expected = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
    expect(formatDate(iso)).toBe(expected);
    expect(formatDate(iso)).toContain('2025');
  });
});

describe('formatDateShort', () => {
  it('returns an em dash for empty values', () => {
    expect(formatDateShort(null)).toBe('—');
    expect(formatDateShort('')).toBe('—');
  });

  it('formats the date only', () => {
    expect(formatDateShort(iso)).toBe(expectedShort);
    expect(formatDateShort(iso)).not.toBe(formatDate(iso));
  });
});

describe('daysAgo', () => {
  afterEach(() => vi.useRealTimers());

  it('returns an empty string for empty values', () => {
    expect(daysAgo(null)).toBe('');
    expect(daysAgo('')).toBe('');
  });

  it('describes whole days elapsed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-10T12:00:00Z'));
    expect(daysAgo('2025-06-10T00:00:00Z')).toBe('today');
    expect(daysAgo('2025-06-09T12:00:00Z')).toBe('1d ago');
    expect(daysAgo('2025-06-09T12:00:01Z')).toBe('today');
    expect(daysAgo('2025-06-08T11:59:59Z')).toBe('2d ago');
    expect(daysAgo('2025-05-11T12:00:00Z')).toBe('30d ago');
  });
});
