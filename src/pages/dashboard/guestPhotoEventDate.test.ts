import { describe, expect, it } from 'vitest';

import {
  formatGuestPhotoEventDate,
  getSuggestedGuestPhotoWindowStart,
  toValidGuestPhotoEventDateOrNull,
} from './guestPhotoEventDate';

describe('guest photo event date guards', () => {
  it('drops invalid persisted event dates instead of rendering Invalid Date', () => {
    const fallback = new Date('2026-06-01T12:00:00.000Z');

    expect(toValidGuestPhotoEventDateOrNull('not-a-date')).toBeNull();
    expect(toValidGuestPhotoEventDateOrNull('2027-02-30')).toBeNull();
    expect(formatGuestPhotoEventDate('not-a-date')).toBe('Unknown date');
    expect(formatGuestPhotoEventDate('2027-02-30')).toBe('Unknown date');
    expect(getSuggestedGuestPhotoWindowStart('not-a-date', fallback)).toBe(fallback);
    expect(getSuggestedGuestPhotoWindowStart('2027-02-30', fallback)).toBe(fallback);
  });

  it('keeps valid event dates truthful for suggested windows', () => {
    expect(formatGuestPhotoEventDate('2026-09-12')).toBe(new Date('2026-09-12T00:00:00').toLocaleDateString());
    expect(getSuggestedGuestPhotoWindowStart('2026-09-12').toISOString()).toBe(new Date('2026-09-12T00:00:00').toISOString());
  });
});
