import { describe, expect, it } from 'vitest';

import { formatEventRsvpDate } from './eventRsvpDate';

describe('formatEventRsvpDate', () => {
  it('guards invalid persisted event dates', () => {
    expect(formatEventRsvpDate('not-a-date')).toBe('Unknown date');
    expect(formatEventRsvpDate('')).toBe('Unknown date');
  });

  it('keeps valid event dates truthful', () => {
    const value = '2026-05-01T16:00:00.000Z';
    expect(formatEventRsvpDate(value)).toBe(new Date(value).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }));
  });

  it('formats date-only event dates as the saved local calendar day', () => {
    const value = '2026-09-12';
    expect(formatEventRsvpDate(value)).toBe(new Date(2026, 8, 12).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }));
  });

  it('rejects impossible date-only event dates', () => {
    expect(formatEventRsvpDate('2026-02-30')).toBe('Unknown date');
  });
});
