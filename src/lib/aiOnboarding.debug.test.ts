import { describe, expect, it } from 'vitest';
import { applyOnboardingInput, createOnboardingSessionStateFromInitialSetup } from './aiOnboarding';
import type { InitialSetupAnswers } from './initialSetupAnswers';

describe('aiOnboarding follow-up gating', () => {
  const draftReadyAnswers: InitialSetupAnswers = {
    names: 'Eric & Kara',
    labelPreference: 'names-only',
    whenWhere: '2027-01-17 — Sayulita, Mexico',
    venueNameOrTbd: 'Amor Boutique Hotel',
    style: 'Tropical, relaxed',
    weekendEventsRaw: 'Friday welcome drinks, Saturday wedding, Sunday brunch',
    ceremonyArrivalTime: '4:30 PM',
    guestCountBand: '100-150',
    plusOnePolicy: 'some',
    childrenAllowed: 'unsure',
    rsvpDeadline: '2026-12-01',
    mealChoice: 'yes',
    registryIntent: 'cash',
    optionalStory: 'We met online and hit it off instantly.',
  };

  it('does not suggest new follow-ups once the profile is already draft-ready', () => {
    const session = createOnboardingSessionStateFromInitialSetup(draftReadyAnswers, []);

    expect(session.readiness.hasEnoughToDraft).toBe(true);
    expect(session.currentIntent).toBe('offer-draft');
    expect(session.suggestedFollowUps).toEqual([]);
  });

  it('keeps follow-ups empty after additional input when the profile remains draft-ready', async () => {
    const initial = createOnboardingSessionStateFromInitialSetup(draftReadyAnswers, []);
    const next = await applyOnboardingInput(initial, 'Eric & Kara');

    expect(next.readiness.hasEnoughToDraft).toBe(true);
    expect(next.currentIntent).toBe('offer-draft');
    expect(next.suggestedFollowUps).toEqual([]);
  });
});
