import { describe, expect, it } from 'vitest';

import { formatSeatingEventDate, formatSeatingEventLabel } from './seatingEventDate';

describe('seating event date guards', () => {
  it('drops invalid persisted event dates instead of leaking Invalid Date into seating labels', () => {
    expect(formatSeatingEventDate('not-a-date')).toBe('Unknown date');
    expect(formatSeatingEventDate('2027-02-30')).toBe('Unknown date');
    expect(formatSeatingEventLabel('Ceremony', 'not-a-date')).toBe('Ceremony — Unknown date');
    expect(formatSeatingEventLabel('Ceremony', '2027-02-30')).toBe('Ceremony — Unknown date');
  });

  it('keeps valid seating event labels truthful', () => {
    expect(formatSeatingEventLabel('Ceremony', '2026-09-12')).toBe(
      `Ceremony — ${new Date(2026, 8, 12).toLocaleDateString()}`,
    );
  });

  it('formats date-only seating event labels as the saved local calendar day', () => {
    expect(formatSeatingEventDate('2026-09-15')).toBe(new Date(2026, 8, 15).toLocaleDateString());
    expect(formatSeatingEventLabel('Reception', '2026-09-15')).toBe(
      `Reception — ${new Date(2026, 8, 15).toLocaleDateString()}`,
    );
  });
});
