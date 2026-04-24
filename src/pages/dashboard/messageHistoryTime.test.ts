import { describe, expect, it } from 'vitest';

import { formatMessageHistoryDate, formatMessageHistoryDateTime } from './messageHistoryTime';

describe('message history time guards', () => {
  it('drops invalid persisted message history timestamps instead of leaking Invalid Date', () => {
    expect(formatMessageHistoryDateTime('not-a-date')).toBe('Unknown time');
    expect(formatMessageHistoryDate('not-a-date')).toBe('Unknown date');
  });

  it('keeps valid message history timestamps truthful', () => {
    expect(formatMessageHistoryDateTime('2026-06-21T18:30:00.000Z')).toBe(
      new Date('2026-06-21T18:30:00.000Z').toLocaleString(),
    );
    expect(formatMessageHistoryDate('2026-06-21T18:30:00.000Z')).toBe(
      new Date('2026-06-21T18:30:00.000Z').toLocaleDateString(),
    );
  });
});
