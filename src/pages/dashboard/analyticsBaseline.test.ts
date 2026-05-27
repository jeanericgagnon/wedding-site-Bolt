import { describe, expect, it } from 'vitest';
import {
  buildAnalyticsBaseline,
  buildAnalyticsConfidenceCards,
  buildAnalyticsNextMove,
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

  it('recommends guest follow-up first when RSVP pressure is still high', () => {
    const nextMove = buildAnalyticsNextMove(makeInput({
      pendingGuests: 24,
      confirmedGuests: 50,
      declinedGuests: 10,
    }));

    expect(nextMove.target).toBe('guests');
    expect(nextMove.ctaLabel).toMatch(/review guests/i);
  });

  it('recommends a builder polish pass once the baseline is strong', () => {
    const nextMove = buildAnalyticsNextMove(makeInput({
      confirmedGuests: 70,
      declinedGuests: 20,
      pendingGuests: 10,
      contactableGuests: 96,
      registryItemCount: 10,
      activePhotoAlbumCount: 2,
    }));

    expect(nextMove.target).toBe('builder');
  });

  it('calls out access handoff when the site is restricted even if the measured baseline is otherwise strong', () => {
    const summary = buildAnalyticsConfidenceSummary(makeInput({
      confirmedGuests: 70,
      declinedGuests: 20,
      pendingGuests: 10,
      contactableGuests: 96,
      registryItemCount: 10,
      activePhotoAlbumCount: 2,
      privacyMode: 'password_protected',
    }));

    const nextMove = buildAnalyticsNextMove(makeInput({
      confirmedGuests: 70,
      declinedGuests: 20,
      pendingGuests: 10,
      contactableGuests: 96,
      registryItemCount: 10,
      activePhotoAlbumCount: 2,
      privacyMode: 'password_protected',
    }));

    expect(summary.title).toMatch(/access handoff/i);
    expect(nextMove.ctaLabel).toMatch(/preview guest access/i);
    expect(nextMove.target).toBe('builder');
  });
});
