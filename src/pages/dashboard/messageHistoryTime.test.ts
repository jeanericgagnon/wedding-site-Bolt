import { describe, expect, it } from 'vitest';

import { formatMessageHistoryDate, formatMessageHistoryDateTime, getMessageHistoryTimestamp } from './messageHistoryTime';

describe('message history time guards', () => {
  it('drops invalid persisted message history timestamps instead of leaking Invalid Date', () => {
    expect(getMessageHistoryTimestamp('not-a-date')).toBe(Number.NEGATIVE_INFINITY);
    expect(getMessageHistoryTimestamp('2027-02-30')).toBe(Number.NEGATIVE_INFINITY);
    expect(formatMessageHistoryDateTime('not-a-date')).toBe('Unknown time');
    expect(formatMessageHistoryDateTime('2027-02-30')).toBe('Unknown time');
    expect(formatMessageHistoryDate('not-a-date')).toBe('Unknown date');
    expect(formatMessageHistoryDate('2027-02-30')).toBe('Unknown date');
  });

  it('keeps valid message history timestamps truthful', () => {
    expect(getMessageHistoryTimestamp('2026-06-21T18:30:00.000Z')).toBe(
      new Date('2026-06-21T18:30:00.000Z').getTime(),
    );
    expect(formatMessageHistoryDateTime('2026-06-21T18:30:00.000Z')).toBe(
      new Date('2026-06-21T18:30:00.000Z').toLocaleString('en-US'),
    );
    expect(formatMessageHistoryDate('2026-06-21T18:30:00.000Z')).toBe(
      new Date('2026-06-21T18:30:00.000Z').toLocaleDateString('en-US'),
    );
  });

  it('supports guarded owner-facing date and time formats', () => {
    const value = '2026-06-21T18:30:00.000Z';
    expect(
      formatMessageHistoryDateTime(value, { dateStyle: 'long', timeStyle: 'short' }),
    ).toBe(new Date(value).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }));
    expect(
      formatMessageHistoryDate(value, { month: 'short', day: 'numeric' }),
    ).toBe(new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  });

  it('formats date-only message history timestamps as the saved local calendar day', () => {
    expect(formatMessageHistoryDate('2026-09-12')).toBe(new Date(2026, 8, 12).toLocaleDateString('en-US'));
    expect(formatMessageHistoryDateTime('2026-09-12')).toBe(new Date(2026, 8, 12).toLocaleString('en-US'));
    expect(getMessageHistoryTimestamp('2026-09-12')).toBe(new Date(2026, 8, 12).getTime());
  });
});
