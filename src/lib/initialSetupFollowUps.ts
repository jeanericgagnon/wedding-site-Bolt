export type InitialSetupFollowUpAnswers = {
  eventLocations: Record<string, string>;
  eventTimes: Record<string, string>;
  venueClarification?: string;
  rsvpClarification?: string;
  registryClarification?: string;
  storyClarification?: string;
};

export const createEmptyInitialSetupFollowUps = (): InitialSetupFollowUpAnswers => ({
  eventLocations: {},
  eventTimes: {},
  venueClarification: '',
  rsvpClarification: '',
  registryClarification: '',
  storyClarification: '',
});
