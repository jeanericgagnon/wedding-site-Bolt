import type { InitialSetupFollowUpAnswers } from './initialSetupFollowUps';
import type { InitialSetupAnswers } from './initialSetupAnswers';
import { type initialSetupAnswersToOnboardingFormShape } from './initialSetupAnswers';
import { applyQuickStartAnswer, type ConciergeQuestion } from './quickStartFlow';
import { applyInitialSetupAnswersToWeddingProfile } from './weddingProfile';

const resolveStructuredEventId = (answers: InitialSetupAnswers, key: string, prefix: 'event-location-' | 'event-time-') => {
  const rawEventKey = key.slice(prefix.length);
  if (!rawEventKey) return key;

  const profile = applyInitialSetupAnswersToWeddingProfile(answers);
  const events = profile.event.structuredWeekendEvents;
  const indexedMatch = /^\d+$/.test(rawEventKey) ? events[Number.parseInt(rawEventKey, 10) - 1]?.id : null;

  return indexedMatch || rawEventKey;
};

const append = (current: string, next: string) => [current, next].filter(Boolean).join(current && next ? '\n\n' : '');

const isQuestionKey = (value: string): value is ConciergeQuestion => (
  [
    'partnerNames',
    'partnerLabels',
    'venueLocation',
    'venueName',
    'theme',
    'guestFeel',
    'weekendEvents',
    'ceremonyTime',
    'guestCount',
    'plusOnePolicy',
    'childrenAllowed',
    'rsvpDeadline',
    'mealChoice',
    'story',
  ] as string[]
).includes(value);

export type OnboardingFollowUpMergeResult = {
  initialSetupAnswers: InitialSetupAnswers;
  initialSetupFollowUps: InitialSetupFollowUpAnswers;
  weddingProfile: ReturnType<typeof applyInitialSetupAnswersToWeddingProfile>;
};

export const mergeOnboardingFollowUpAnswers = ({
  initialSetupAnswers,
  initialSetupFollowUps,
  followUpAnswers,
  formData,
}: {
  initialSetupAnswers: InitialSetupAnswers;
  initialSetupFollowUps: InitialSetupFollowUpAnswers;
  followUpAnswers: Record<string, string>;
  formData: ReturnType<typeof initialSetupAnswersToOnboardingFormShape>;
}): OnboardingFollowUpMergeResult => {
  let nextAnswers = { ...initialSetupAnswers };
  const nextFollowUps: InitialSetupFollowUpAnswers = {
    ...initialSetupFollowUps,
    eventLocations: { ...initialSetupFollowUps.eventLocations },
    eventTimes: { ...initialSetupFollowUps.eventTimes },
  };

  for (const [key, rawValue] of Object.entries(followUpAnswers)) {
    const value = rawValue.trim();
    if (!value) continue;

    if (isQuestionKey(key)) {
      nextAnswers = applyQuickStartAnswer(nextAnswers, key, value);
      continue;
    }

    if (key === 'meeting-city' || key === 'first-detail') {
      nextAnswers.optionalStory = append(nextAnswers.optionalStory || formData.story || '', value);
      continue;
    }

    if (key === 'location-why') {
      nextFollowUps.venueClarification = append(nextFollowUps.venueClarification || '', value);
      continue;
    }

    if (key === 'venue-clarity') {
      nextFollowUps.venueClarification = value;
      continue;
    }

    if (key === 'rsvp-config') {
      nextFollowUps.rsvpClarification = value;
      continue;
    }

    if (key === 'story-detail') {
      nextFollowUps.storyClarification = value;
      continue;
    }

    if (key.startsWith('event-location-')) {
      const eventId = resolveStructuredEventId(nextAnswers, key, 'event-location-');
      nextFollowUps.eventLocations[eventId] = value;
      continue;
    }

    if (key.startsWith('event-time-')) {
      const eventId = resolveStructuredEventId(nextAnswers, key, 'event-time-');
      nextFollowUps.eventTimes[eventId] = value;
      continue;
    }
  }

  return {
    initialSetupAnswers: nextAnswers,
    initialSetupFollowUps: nextFollowUps,
    weddingProfile: applyInitialSetupAnswersToWeddingProfile(nextAnswers),
  };
};
