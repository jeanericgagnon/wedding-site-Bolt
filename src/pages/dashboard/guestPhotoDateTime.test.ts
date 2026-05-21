import { describe, expect, it } from 'vitest';

import { parseDatetimeLocalToIso, toDatetimeLocalOrEmpty } from './guestPhotoDateTime';

describe('guest photo date time guards', () => {
  it('drops invalid persisted upload-window timestamps instead of rendering NaN draft values', () => {
    expect(toDatetimeLocalOrEmpty('not-a-date')).toBe('');
  });

  it('flags malformed local datetime drafts instead of throwing Invalid time value', () => {
    expect(parseDatetimeLocalToIso('not-a-date')).toBeUndefined();
    expect(parseDatetimeLocalToIso('2027-02-30T18:30')).toBeUndefined();
  });

  it('keeps valid upload-window datetimes truthful', () => {
    expect(parseDatetimeLocalToIso('2026-06-21T18:30')).toBe(new Date('2026-06-21T18:30').toISOString());
    expect(toDatetimeLocalOrEmpty('2026-06-21T18:30:00.000Z')).toBeTruthy();
  });
});
