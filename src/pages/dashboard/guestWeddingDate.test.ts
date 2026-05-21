import { describe, expect, it } from 'vitest';

import { getDaysUntilGuestWedding } from './guestWeddingDate';

describe('guestWeddingDate', () => {
  it('drops invalid persisted wedding dates instead of leaking NaN day counts', () => {
    expect(getDaysUntilGuestWedding('not-a-date')).toBeNull();
    expect(getDaysUntilGuestWedding('2027-02-30')).toBeNull();
    expect(getDaysUntilGuestWedding(null)).toBeNull();
  });

  it('keeps valid wedding countdowns truthful', () => {
    expect(getDaysUntilGuestWedding('2026-06-25', new Date('2026-06-20T12:00:00.000Z').getTime())).toBe(5);
  });

  it('counts date-only wedding dates from the saved local calendar day', () => {
    expect(getDaysUntilGuestWedding('2026-09-12', new Date(2026, 8, 10, 18).getTime())).toBe(2);
  });
});
