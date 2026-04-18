import { describe, expect, it } from 'vitest';
import { normalizeOnboardingDraftSnapshot } from './onboardingDraftPersistence';

describe('onboardingDraftPersistence', () => {
  it('preserves follow-up review state across a saved draft round-trip', () => {
    const normalized = normalizeOnboardingDraftSnapshot({
      step: 'quick-3',
      conversationIndex: 12,
      showFollowUpReview: true,
      followUpAnswers: {
        'venue-clarity': 'At the bluff overlooking the ocean.',
        'event-location-1': 'Welcome party at the pool terrace.',
      },
      initialSetupAnswers: {
        names: 'Alex & Jordan',
        weekendEventsRaw: 'Friday welcome party, Saturday wedding',
      },
      initialSetupFollowUps: {
        venueClarification: 'Ocean bluff ceremony',
        eventLocations: {
          friday: 'Pool terrace',
        },
        eventTimes: {
          friday: '6:00 PM',
        },
      },
    });

    expect(normalized.step).toBe('quick-3');
    expect(normalized.conversationIndex).toBe(12);
    expect(normalized.showFollowUpReview).toBe(true);
    expect(normalized.followUpAnswers['venue-clarity']).toBe('At the bluff overlooking the ocean.');
    expect(normalized.initialSetupAnswers.names).toBe('Alex & Jordan');
    expect(normalized.initialSetupFollowUps.venueClarification).toBe('Ocean bluff ceremony');
    expect(normalized.initialSetupFollowUps.eventLocations.friday).toBe('Pool terrace');
    expect(normalized.initialSetupFollowUps.eventTimes.friday).toBe('6:00 PM');
  });

  it('drops malformed records instead of crashing hydration', () => {
    const normalized = normalizeOnboardingDraftSnapshot({
      followUpAnswers: ['bad'],
      initialSetupFollowUps: {
        eventLocations: ['wrong'],
        eventTimes: null,
      },
    });

    expect(normalized.followUpAnswers).toEqual({});
    expect(normalized.initialSetupFollowUps.eventLocations).toEqual({});
    expect(normalized.initialSetupFollowUps.eventTimes).toEqual({});
  });
});
