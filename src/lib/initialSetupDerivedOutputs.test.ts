import { describe, expect, it } from 'vitest';
import { buildInitialSetupDerivedOutputs } from './initialSetupDerivedOutputs';
import type { InitialSetupAnswers } from './initialSetupAnswers';
import type { InitialSetupFollowUpAnswers } from './initialSetupFollowUps';

const baseAnswers: InitialSetupAnswers = {
  names: 'Alex & Jordan',
  labelPreference: 'names-only',
  whenWhere: '2026-06-20 — Puerto Vallarta, Mexico',
  venueNameOrTbd: 'Narwhal Pickleball Club',
  style: 'playful, tropical',
  guestFeel: '',
  weekendEventsRaw: 'Welcome drinks and pool time.',
  ceremonyArrivalTime: '5:00 PM',
  guestCountBand: 'under-50',
  plusOnePolicy: 'all',
  childrenAllowed: 'yes',
  rsvpDeadline: '2026-04-15',
  mealChoice: 'no',
  registryIntent: 'none-for-now',
  optionalStory: 'We met online. First date was chaotic in the best way.',
};

const baseFollowUps: InitialSetupFollowUpAnswers = {
  eventLocations: {},
  eventTimes: {},
  venueClarification: '',
  rsvpClarification: '',
  registryClarification: '',
  storyClarification: '',
};

describe('buildInitialSetupDerivedOutputs', () => {
  it('ignores invalid RSVP follow-up clarifications instead of overwriting a valid profile deadline', () => {
    const outputs = buildInitialSetupDerivedOutputs(baseAnswers, {
      ...baseFollowUps,
      rsvpClarification: 'not-a-date',
    });

    expect(outputs.weddingProfile.event.rsvpDeadline).toBe('2026-04-15');
  });

  it('accepts valid RSVP follow-up clarifications', () => {
    const outputs = buildInitialSetupDerivedOutputs(baseAnswers, {
      ...baseFollowUps,
      rsvpClarification: '2026-04-20',
    });

    expect(outputs.weddingProfile.event.rsvpDeadline).toBe('2026-04-20');
  });
});
