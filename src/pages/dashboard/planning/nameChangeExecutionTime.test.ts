import { describe, expect, it } from 'vitest';

import { formatNameChangeExecutionDateTime, getNameChangeExecutionTimestamp, sortNameChangeExecutionActivity } from './nameChangeExecutionTime';

describe('name change execution time guards', () => {
  it('treats invalid persisted execution timestamps as oldest activity', () => {
    expect(getNameChangeExecutionTimestamp('not-a-date')).toBe(Number.NEGATIVE_INFINITY);
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
    expect(formatNameChangeExecutionDateTime(undefined)).toBe('Unknown time');
  });

  it('formats valid execution timestamps truthfully', () => {
    const value = '2026-04-18T20:00:00.000Z';
    expect(formatNameChangeExecutionDateTime(value)).toBe(new Date(value).toLocaleString());
  });
});
