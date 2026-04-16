import type { InitialSetupAnswers } from './initialSetupAnswers';
import { interpretInitialSetupAnswers } from './initialSetupInterpreter';
import { buildItinerarySeedFromStructuredEvents, buildRsvpEventSeedFromStructuredEvents, applyInitialSetupAnswersToWeddingProfile } from './weddingProfile';

export type InitialSetupDerivedOutputs = {
  weddingProfile: ReturnType<typeof applyInitialSetupAnswersToWeddingProfile>;
  itinerarySeeds: ReturnType<typeof buildItinerarySeedFromStructuredEvents>;
  rsvpEventSeeds: ReturnType<typeof buildRsvpEventSeedFromStructuredEvents>;
  interpreted: ReturnType<typeof interpretInitialSetupAnswers>;
};

export const buildInitialSetupDerivedOutputs = (answers: InitialSetupAnswers): InitialSetupDerivedOutputs => {
  const weddingProfile = applyInitialSetupAnswersToWeddingProfile(answers);
  const interpreted = interpretInitialSetupAnswers(answers);
  return {
    weddingProfile,
    itinerarySeeds: buildItinerarySeedFromStructuredEvents(weddingProfile),
    rsvpEventSeeds: buildRsvpEventSeedFromStructuredEvents(weddingProfile),
    interpreted,
  };
};
