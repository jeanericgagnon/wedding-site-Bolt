import { describe, expect, it } from 'vitest';

import { formatGuestEventDate, toValidGuestEventDateOrNull } from './guestEventDate';

describe('guest event date guards', () => {
  it('drops invalid persisted event dates instead of leaking Invalid Date', () => {
    expect(toValidGuestEventDateOrNull('not-a-date')).toBeNull();
    expect(formatGuestEventDate('not-a-date')).toBe('Unknown date');
  });

  it('keeps valid guest event dates truthful', () => {
    const value = '2026-06-21';
    expect(toValidGuestEventDateOrNull(value)?.getTime()).toBe(new Date(`${value}T00:00:00`).getTime());
    expect(formatGuestEventDate(value)).toBe(
      new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    );
  });
});
