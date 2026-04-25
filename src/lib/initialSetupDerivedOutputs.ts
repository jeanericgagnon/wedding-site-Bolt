import type { InitialSetupAnswers } from './initialSetupAnswers';
import type { InitialSetupFollowUpAnswers } from './initialSetupFollowUps';
import { interpretInitialSetupAnswers } from './initialSetupInterpreter';
import { buildItinerarySeedFromStructuredEvents, buildRsvpEventSeedFromStructuredEvents, applyInitialSetupAnswersToWeddingProfile } from './weddingProfile';

export type InitialSetupDerivedOutputs = {
  weddingProfile: ReturnType<typeof applyInitialSetupAnswersToWeddingProfile>;
  itinerarySeeds: ReturnType<typeof buildItinerarySeedFromStructuredEvents>;
  rsvpEventSeeds: ReturnType<typeof buildRsvpEventSeedFromStructuredEvents>;
  interpreted: ReturnType<typeof interpretInitialSetupAnswers>;
};

const normalizeFollowUpDateInput = (value?: string): string => {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return '';

  const date = new Date(`${trimmed}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().slice(0, 10) === trimmed ? trimmed : '';
};

export const buildInitialSetupDerivedOutputs = (answers: InitialSetupAnswers, followUps?: InitialSetupFollowUpAnswers): InitialSetupDerivedOutputs => {
  const weddingProfile = applyInitialSetupAnswersToWeddingProfile(answers);
  const interpreted = interpretInitialSetupAnswers(answers);
  if (followUps) {
    weddingProfile.event.structuredWeekendEvents = weddingProfile.event.structuredWeekendEvents.map((event) => ({
      ...event,
      locationName: followUps.eventLocations[event.id] || event.locationName,
      timeLabel: followUps.eventTimes[event.id] || event.timeLabel,
    }));
    if (followUps.storyClarification) weddingProfile.story.summary = followUps.storyClarification;
    if (followUps.registryClarification) { weddingProfile.registry.url = followUps.registryClarification; weddingProfile.registry.status = 'linked'; }
    const normalizedRsvpClarification = normalizeFollowUpDateInput(followUps.rsvpClarification);
    if (normalizedRsvpClarification) weddingProfile.event.rsvpDeadline = normalizedRsvpClarification;
    if (followUps.venueClarification) weddingProfile.event.venueName = followUps.venueClarification;
  }
  return {
    weddingProfile,
    itinerarySeeds: buildItinerarySeedFromStructuredEvents(weddingProfile),
    rsvpEventSeeds: buildRsvpEventSeedFromStructuredEvents(weddingProfile),
    interpreted,
  };
};
