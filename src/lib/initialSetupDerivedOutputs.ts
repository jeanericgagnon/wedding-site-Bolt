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
    if (followUps.rsvpClarification) weddingProfile.event.rsvpDeadline = followUps.rsvpClarification || weddingProfile.event.rsvpDeadline;
    if (followUps.venueClarification) weddingProfile.event.venueName = followUps.venueClarification;
  }
  return {
    weddingProfile,
    itinerarySeeds: buildItinerarySeedFromStructuredEvents(weddingProfile),
    rsvpEventSeeds: buildRsvpEventSeedFromStructuredEvents(weddingProfile),
    interpreted,
  };
};
