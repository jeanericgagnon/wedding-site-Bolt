import { describe, expect, it } from 'vitest';

import { formatSeatingEventDate, formatSeatingEventLabel } from './seatingEventDate';

describe('seating event date guards', () => {
  it('drops invalid persisted event dates instead of leaking Invalid Date into seating labels', () => {
    expect(formatSeatingEventDate('not-a-date')).toBe('Unknown date');
    expect(formatSeatingEventLabel('Ceremony', 'not-a-date')).toBe('Ceremony — Unknown date');
  });

  it('keeps valid seating event labels truthful', () => {
    expect(formatSeatingEventLabel('Ceremony', '2026-09-12')).toBe(
      `Ceremony — ${new Date('2026-09-12').toLocaleDateString()}`,
    );
  });
});
