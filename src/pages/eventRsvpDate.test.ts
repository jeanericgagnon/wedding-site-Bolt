import { describe, expect, it } from 'vitest';

import { formatEventRsvpDate } from './eventRsvpDate';

describe('formatEventRsvpDate', () => {
  it('guards invalid persisted event dates', () => {
    expect(formatEventRsvpDate('not-a-date')).toBe('Unknown date');
    expect(formatEventRsvpDate('')).toBe('Unknown date');
  });

  it('keeps valid event dates truthful', () => {
    const value = '2026-05-01';
    expect(formatEventRsvpDate(value)).toBe(new Date(value).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }));
  });
});
