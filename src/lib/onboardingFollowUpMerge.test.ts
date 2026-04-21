import { describe, expect, it } from 'vitest';
import { createEmptyInitialSetupAnswers, initialSetupAnswersToOnboardingFormShape } from './initialSetupAnswers';
import { createEmptyInitialSetupFollowUps } from './initialSetupFollowUps';
import { mergeOnboardingFollowUpAnswers } from './onboardingFollowUpMerge';

describe('onboardingFollowUpMerge', () => {
  it('maps final follow-up answers into deterministic answer and follow-up snapshots', () => {
    const initialSetupAnswers = {
      ...createEmptyInitialSetupAnswers(),
      names: 'Alex & Jordan',
      optionalStory: 'We met online.',
      weekendEventsRaw: 'Friday welcome drinks, Saturday wedding',
    };
    const formData = initialSetupAnswersToOnboardingFormShape(initialSetupAnswers);

    const merged = mergeOnboardingFollowUpAnswers({
      initialSetupAnswers,
      initialSetupFollowUps: createEmptyInitialSetupFollowUps(),
      formData,
      followUpAnswers: {
        'plusOnePolicy': 'all',
        'story-detail': 'We kept choosing each other after that first trip.',
        'event-location-welcome-drinks-1': 'Pool terrace',
        'event-time-1': '6:00 PM',
        'venue-clarity': 'Ocean bluff ceremony lawn',
      },
    });

    expect(merged.initialSetupAnswers.plusOnePolicy).toBe('all');
    expect(merged.initialSetupFollowUps.storyClarification).toBe('We kept choosing each other after that first trip.');
    expect(merged.initialSetupFollowUps.eventLocations['welcome-drinks-1']).toBe('Pool terrace');
    expect(merged.initialSetupFollowUps.eventTimes['welcome-drinks-1']).toBe('6:00 PM');
    expect(merged.weddingProfile.event.structuredWeekendEvents[0]).toMatchObject({
      id: 'welcome-drinks-1',
      title: 'welcome drinks',
    });
    expect(merged.initialSetupFollowUps.venueClarification).toBe('Ocean bluff ceremony lawn');
  });

  it('appends legacy story prompts instead of clobbering the draft story', () => {
    const initialSetupAnswers = {
      ...createEmptyInitialSetupAnswers(),
      optionalStory: 'We met online.',
    };

    const merged = mergeOnboardingFollowUpAnswers({
      initialSetupAnswers,
      initialSetupFollowUps: createEmptyInitialSetupFollowUps(),
      formData: initialSetupAnswersToOnboardingFormShape(initialSetupAnswers),
      followUpAnswers: {
        'meeting-city': 'Our first real date was in Seattle.',
      },
    });

    expect(merged.initialSetupAnswers.optionalStory).toContain('We met online.');
    expect(merged.initialSetupAnswers.optionalStory).toContain('Our first real date was in Seattle.');
  });
});
