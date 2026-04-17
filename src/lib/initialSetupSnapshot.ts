import type { InitialSetupAnswers } from './initialSetupAnswers';
import { interpretInitialSetupAnswers } from './initialSetupInterpreter';

export type InitialSetupSnapshot = {
  howWeMet?: string;
  storyDetail?: string;
  city?: string;
  venue?: string;
  guestFeel?: string;
  rsvpDeadline?: string;
  travelNotes?: string;
  eventLocationGaps?: string[];
};

export const buildInitialSetupSnapshot = (answers: InitialSetupAnswers): InitialSetupSnapshot => {
  const interpreted = interpretInitialSetupAnswers(answers);
  return {
    howWeMet: answers.optionalStory,
    storyDetail: answers.optionalStory,
    city: interpreted.weddingLocation,
    venue: answers.venueNameOrTbd,
    guestFeel: answers.style,
    rsvpDeadline: answers.rsvpDeadline,
    travelNotes: answers.whenWhere,
    eventLocationGaps: interpreted.structuredWeekendEvents
      .filter((event) => !event.locationName?.trim())
      .map((event) => `${event.dateLabel ? `${event.dateLabel} ` : ''}${event.title}`.trim()),
  };
};
