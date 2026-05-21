import { describe, expect, it } from 'vitest';

import { formatCoordinatorEventDateTime } from './coordinatorEventTime';

describe('coordinator event time guards', () => {
  it('drops invalid persisted event start times instead of leaking Invalid Date', () => {
    expect(formatCoordinatorEventDateTime('not-a-date')).toBe('Time TBD');
    expect(formatCoordinatorEventDateTime('2027-02-30')).toBe('Time TBD');
    expect(formatCoordinatorEventDateTime(undefined)).toBe('Time TBD');
  });

  it('keeps valid persisted event start times truthful', () => {
    const value = '2026-06-21T18:30:00.000Z';
    expect(formatCoordinatorEventDateTime(value)).toBe(new Date(value).toLocaleString());
  });

  it('formats date-only event start times as the saved local calendar day', () => {
    expect(formatCoordinatorEventDateTime('2026-09-12')).toBe(new Date(2026, 8, 12).toLocaleString());
  });
});
