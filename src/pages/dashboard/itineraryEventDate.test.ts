import { describe, expect, it } from 'vitest';

import { formatItineraryEventDate, toValidItineraryEventDateOrNull } from './itineraryEventDate';

describe('itineraryEventDate', () => {
  it('drops invalid persisted itinerary dates instead of leaking Invalid Date', () => {
    expect(toValidItineraryEventDateOrNull('not-a-date')).toBeNull();
    expect(toValidItineraryEventDateOrNull('2027-02-30')).toBeNull();
    expect(formatItineraryEventDate('not-a-date')).toBe('Unknown date');
    expect(formatItineraryEventDate('2027-02-30')).toBe('Unknown date');
  });

  it('keeps valid persisted itinerary dates truthful', () => {
    const value = '2026-06-21';
    expect(toValidItineraryEventDateOrNull(value)?.toISOString()).toBe(new Date(`${value}T12:00:00Z`).toISOString());
    expect(formatItineraryEventDate(value)).toBe(
      new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
    );
  });
});
