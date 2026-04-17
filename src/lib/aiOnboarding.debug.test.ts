import { describe, expect, it } from 'vitest';
import { applyOnboardingInput, createOnboardingSessionStateFromInitialSetup } from './aiOnboarding';
import type { InitialSetupAnswers } from './initialSetupAnswers';

describe('aiOnboarding debug', () => {
  it('shows what follow-ups the seeded quick start state still wants', async () => {
    const answers: InitialSetupAnswers = {
      names: 'Eric & Kara',
      labelPreference: 'names-only',
      whenWhere: 'January 17, 2027 — Sayulita, Mexico',
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

    const initial = createOnboardingSessionStateFromInitialSetup(answers, []);
    console.log('INITIAL_INTENT', initial.currentIntent);
    console.log('INITIAL_NEXT', initial.nextQuestionKey);
    console.log('INITIAL_FOLLOWUPS', initial.suggestedFollowUps.map((q) => q.key));
    console.log('INITIAL_READINESS', initial.readiness);

    const next = await applyOnboardingInput(initial, 'Eric & Kara');
    console.log('NEXT_INTENT', next.currentIntent);
    console.log('NEXT_QUESTION', next.nextQuestionKey);
    console.log('NEXT_FOLLOWUPS', next.suggestedFollowUps.map((q) => q.key));
    console.log('NEXT_READINESS', next.readiness);

    expect(initial).toBeTruthy();
    expect(next).toBeTruthy();
  });
});
