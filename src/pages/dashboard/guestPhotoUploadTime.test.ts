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
    expect(toGuestPhotoCsvTimestamp('not-a-date')).toBe('');
    expect(formatGuestPhotoDate('not-a-date')).toBe('Unknown date');
    expect(formatGuestPhotoDateTime('not-a-date')).toBe('Unknown date');
  });

  it('sends invalid upload timestamps to the end of time-based ordering', () => {
    expect(getGuestPhotoSortTime('not-a-date')).toBe(Number.NEGATIVE_INFINITY);
  });

  it('keeps valid upload timestamps truthful', () => {
    expect(toGuestPhotoCsvTimestamp('2026-06-21T18:30:00.000Z')).toBe('2026-06-21T18:30:00.000Z');
    expect(getGuestPhotoSortTime('2026-06-21T18:30:00.000Z')).toBe(new Date('2026-06-21T18:30:00.000Z').getTime());
  });
});
