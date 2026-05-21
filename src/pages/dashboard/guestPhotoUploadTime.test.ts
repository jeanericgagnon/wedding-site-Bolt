import { describe, expect, it } from 'vitest';

import {
  formatGuestPhotoDate,
  formatGuestPhotoDateTime,
  getGuestPhotoSortTime,
  toGuestPhotoCsvTimestamp,
  toValidGuestPhotoDateOrNull,
} from './guestPhotoUploadTime';

describe('guest photo upload timestamp guards', () => {
  it('drops invalid persisted upload timestamps instead of crashing csv export or rendering Invalid Date', () => {
    expect(toValidGuestPhotoDateOrNull('not-a-date')).toBeNull();
    expect(toValidGuestPhotoDateOrNull('2027-02-30')).toBeNull();
    expect(toGuestPhotoCsvTimestamp('not-a-date')).toBe('');
    expect(toGuestPhotoCsvTimestamp('2027-02-30')).toBe('');
    expect(formatGuestPhotoDate('not-a-date')).toBe('Unknown date');
    expect(formatGuestPhotoDate('2027-02-30')).toBe('Unknown date');
    expect(formatGuestPhotoDateTime('not-a-date')).toBe('Unknown date');
    expect(formatGuestPhotoDateTime('2027-02-30')).toBe('Unknown date');
  });

  it('sends invalid upload timestamps to the end of time-based ordering', () => {
    expect(getGuestPhotoSortTime('not-a-date')).toBe(Number.NEGATIVE_INFINITY);
    expect(getGuestPhotoSortTime('2027-02-30')).toBe(Number.NEGATIVE_INFINITY);
  });

  it('keeps valid upload timestamps truthful', () => {
    expect(toGuestPhotoCsvTimestamp('2026-06-21T18:30:00.000Z')).toBe('2026-06-21T18:30:00.000Z');
    expect(getGuestPhotoSortTime('2026-06-21T18:30:00.000Z')).toBe(new Date('2026-06-21T18:30:00.000Z').getTime());
  });

  it('formats date-only upload timestamps as the saved local calendar day', () => {
    expect(formatGuestPhotoDate('2026-09-12')).toBe(new Date(2026, 8, 12).toLocaleDateString());
    expect(formatGuestPhotoDateTime('2026-09-12')).toBe(new Date(2026, 8, 12).toLocaleString());
    expect(toGuestPhotoCsvTimestamp('2026-09-12')).toBe(new Date(2026, 8, 12).toISOString());
  });
});
