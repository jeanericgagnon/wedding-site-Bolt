import { describe, expect, it } from 'vitest';

import { formatScheduledMessageDateTime, parseScheduleInputToIso, toScheduleInputValue } from './messageScheduleTime';

describe('message schedule time guards', () => {
  it('drops invalid persisted schedule timestamps instead of hydrating NaN datetime input values', () => {
    expect(toScheduleInputValue('not-a-date')).toBe('');
    expect(toScheduleInputValue('2027-02-30')).toBe('');
  });

  it('skips malformed schedule drafts instead of throwing Invalid time value', () => {
    expect(parseScheduleInputToIso('not-a-date')).toBeUndefined();
    expect(parseScheduleInputToIso('2027-02-30T18:30')).toBeUndefined();
    expect(formatScheduledMessageDateTime('not-a-date')).toBe('Unknown time');
    expect(formatScheduledMessageDateTime('2027-02-30')).toBe('Unknown time');
  });

  it('keeps valid schedule timestamps truthful', () => {
    expect(toScheduleInputValue('2026-06-21T18:30:00.000Z')).toMatch(/^2026-06-21T/);
    expect(parseScheduleInputToIso('2026-06-21T18:30')).toBe(new Date('2026-06-21T18:30').toISOString());
    expect(formatScheduledMessageDateTime('2026-06-21T18:30:00.000Z')).toBe(new Date('2026-06-21T18:30:00.000Z').toLocaleString());
  });

  it('formats date-only schedule timestamps as the saved local calendar day', () => {
    const value = '2026-09-12';
    expect(toScheduleInputValue(value)).toBe('2026-09-12T00:00');
    expect(formatScheduledMessageDateTime(value)).toBe(new Date(2026, 8, 12).toLocaleString());
  });
});
