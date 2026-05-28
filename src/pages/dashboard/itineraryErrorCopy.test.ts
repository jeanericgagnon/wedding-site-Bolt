import { describe, expect, it } from 'vitest';

import {
  ITINERARY_DELETE_RETRY_ERROR,
  ITINERARY_GUEST_LIST_RETRY_ERROR,
  ITINERARY_INVITE_UPDATE_RETRY_ERROR,
  ITINERARY_SAVE_RETRY_ERROR,
  mapItineraryError,
} from './itineraryErrorCopy';

describe('itineraryErrorCopy', () => {
  it('keeps calm fallback copy for provider and backend failures', () => {
    expect(mapItineraryError(new Error('Supabase relation itinerary_events does not exist'), ITINERARY_SAVE_RETRY_ERROR))
      .toBe(ITINERARY_SAVE_RETRY_ERROR);
    expect(mapItineraryError(new Error('OAuth token expired while refreshing session'), ITINERARY_GUEST_LIST_RETRY_ERROR))
      .toBe(ITINERARY_GUEST_LIST_RETRY_ERROR);
  });

  it('falls back when the error is empty or not actionable', () => {
    expect(mapItineraryError(new Error('   '), ITINERARY_SAVE_RETRY_ERROR)).toBe(ITINERARY_SAVE_RETRY_ERROR);
    expect(mapItineraryError(null, ITINERARY_GUEST_LIST_RETRY_ERROR)).toBe(ITINERARY_GUEST_LIST_RETRY_ERROR);
  });

  it('keeps itinerary fallback copy calm and owner-safe', () => {
    expect(ITINERARY_SAVE_RETRY_ERROR).toBe('Could not save that event right now. Please try again.');
    expect(ITINERARY_DELETE_RETRY_ERROR).toBe('Could not remove that event right now. Please try again.');
    expect(ITINERARY_INVITE_UPDATE_RETRY_ERROR).toBe('Could not update that invitation right now. Please try again.');
  });
});
