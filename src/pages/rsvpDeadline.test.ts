import { describe, expect, it } from 'vitest';

import { formatRsvpDeadline, isRsvpDeadlinePassed } from './rsvpDeadline';

describe('rsvpDeadline', () => {
  it('treats invalid persisted deadlines as passed so guest submits stay blocked', () => {
    expect(isRsvpDeadlinePassed('not-a-date', new Date('2026-04-24T22:00:00.000Z'))).toBe(true);
  });

  it('formats invalid persisted deadlines with a clean fallback', () => {
    expect(formatRsvpDeadline('not-a-date')).toBe('Unknown date');
  });

  it('keeps valid persisted deadlines truthful', () => {
    const value = '2026-04-22T16:00:00.000Z';
    expect(isRsvpDeadlinePassed(value, new Date('2026-04-24T22:00:00.000Z'))).toBe(true);
    expect(formatRsvpDeadline(value)).toBe(
      new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    );
  });
});
