import { describe, expect, it } from 'vitest';

import { combineDateAndTimeISO } from './itineraryDateTime';

describe('combineDateAndTimeISO', () => {
  it('returns undefined for invalid persisted dates instead of throwing', () => {
    expect(combineDateAndTimeISO('not-a-date', '18:00')).toBeUndefined();
  });

  it('returns undefined for invalid persisted times instead of throwing', () => {
    expect(combineDateAndTimeISO('2026-06-21', 'bad-time')).toBeUndefined();
  });

  it('keeps valid itinerary schedule timestamps truthful', () => {
    expect(combineDateAndTimeISO('2026-06-21', '18:00')).toBe(new Date('2026-06-21T18:00:00').toISOString());
  });
});
