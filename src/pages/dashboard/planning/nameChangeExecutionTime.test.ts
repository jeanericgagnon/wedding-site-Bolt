import { describe, expect, it } from 'vitest';

import { formatNameChangeExecutionDateTime, getNameChangeExecutionTimestamp, sortNameChangeExecutionActivity } from './nameChangeExecutionTime';

describe('name change execution time guards', () => {
  it('treats invalid persisted execution timestamps as oldest activity', () => {
    expect(getNameChangeExecutionTimestamp('not-a-date')).toBe(Number.NEGATIVE_INFINITY);
    expect(getNameChangeExecutionTimestamp('2027-02-30')).toBe(Number.NEGATIVE_INFINITY);
    expect(
      sortNameChangeExecutionActivity([
        { id: 'bad', timestamp: 'not-a-date' },
        { id: 'good', timestamp: '2026-04-18T20:00:00.000Z' },
      ]).map((item) => item.id),
    ).toEqual(['good', 'bad']);
  });

  it('keeps valid execution timestamps truthful', () => {
    const value = '2026-04-18T20:00:00.000Z';
    expect(getNameChangeExecutionTimestamp(value)).toBe(new Date(value).getTime());
  });

  it('formats invalid execution timestamps as unknown time', () => {
    expect(formatNameChangeExecutionDateTime('not-a-date')).toBe('Unknown time');
    expect(formatNameChangeExecutionDateTime('2027-02-30')).toBe('Unknown time');
    expect(formatNameChangeExecutionDateTime(undefined)).toBe('Unknown time');
  });

  it('formats valid execution timestamps truthfully', () => {
    const value = '2026-04-18T20:00:00.000Z';
    expect(formatNameChangeExecutionDateTime(value)).toBe(new Date(value).toLocaleString());
  });

  it('formats date-only execution timestamps as the saved local calendar day', () => {
    expect(getNameChangeExecutionTimestamp('2026-09-12')).toBe(new Date(2026, 8, 12).getTime());
    expect(formatNameChangeExecutionDateTime('2026-09-12')).toBe(new Date(2026, 8, 12).toLocaleString());
  });
});
