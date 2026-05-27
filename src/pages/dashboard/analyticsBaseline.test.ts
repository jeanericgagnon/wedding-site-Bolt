import { describe, expect, it } from 'vitest';
import {
  buildAnalyticsBaseline,
  buildAnalyticsConfidenceCards,
  buildAnalyticsConfidenceSummary,
} from './analyticsBaseline';

function makeInput(overrides: Partial<Parameters<typeof buildAnalyticsBaseline>[0]> = {}) {
  return {
    totalGuests: 100,
    confirmedGuests: 62,
    declinedGuests: 18,
    pendingGuests: 20,
    contactableGuests: 93,
    registryItemCount: 12,
    photoAlbumCount: 2,
    activePhotoAlbumCount: 1,
    interactiveSuggestionCount: 4,
    ...overrides,
  };
}

describe('analyticsBaseline', () => {
  it('builds a high-confidence summary when guest and reachability signals are strong', () => {
    const summary = buildAnalyticsConfidenceSummary(makeInput({
      confirmedGuests: 70,
      declinedGuests: 20,
      pendingGuests: 10,
      contactableGuests: 96,
      registryItemCount: 10,
      activePhotoAlbumCount: 2,
    }));

    expect(summary.tone).toBe('success');
    expect(summary.statusLabel).toMatch(/high confidence/i);
  });

  it('calls out pending RSVP pressure before other polish', () => {
    const summary = buildAnalyticsConfidenceSummary(makeInput({
      pendingGuests: 24,
      confirmedGuests: 50,
      declinedGuests: 10,
    }));

    expect(summary.title).toMatch(/few more replies/i);
    expect(summary.tone).toBe('warning');
  });

  it('builds compact confidence cards from the measured baseline', () => {
    const cards = buildAnalyticsConfidenceCards(makeInput({
      contactableGuests: 72,
      registryItemCount: 0,
      activePhotoAlbumCount: 0,
      interactiveSuggestionCount: 0,
    }));

    expect(cards).toHaveLength(3);
    expect(cards[1]).toMatchObject({ label: 'Reachability trust', tone: 'error' });
    expect(cards[2].value).toBe('0/3');
  });
});
