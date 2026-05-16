import { describe, expect, it } from 'vitest';

import { formatMessageEventDate, formatMessageEventOptionLabel } from './messageEventDate';

describe('message event date guards', () => {
  it('drops invalid persisted event dates instead of leaking Invalid Date into audience labels', () => {
    expect(formatMessageEventDate('not-a-date')).toBe('');
    expect(formatMessageEventDate('2027-02-30')).toBe('');
    expect(formatMessageEventOptionLabel('Ceremony', 'not-a-date')).toBe('Ceremony');
    expect(formatMessageEventOptionLabel('Ceremony', '2027-02-30')).toBe('Ceremony');
  });

  it('keeps valid event-date labels truthful', () => {
    expect(formatMessageEventOptionLabel('Ceremony', '2026-09-12')).toBe(
      `Ceremony — ${new Date('2026-09-12T12:00:00Z').toLocaleDateString()}`,
    );
  });
});
