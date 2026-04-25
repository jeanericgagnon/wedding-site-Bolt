import type { InitialSetupAnswers } from './initialSetupAnswers';
import { parseWeekendEvents } from './weddingProfile';

export type InterpretedInitialSetup = {
  names: string[];
  labelPreference: InitialSetupAnswers['labelPreference'];
  whenWhereRaw: string;
  weddingDate: string;
  weddingLocation: string;
  venueNameOrTbd: string;
  style: string;
  structuredWeekendEvents: ReturnType<typeof parseWeekendEvents>;
  ceremonyArrivalTime: string;
  guestCountBand: InitialSetupAnswers['guestCountBand'];
  plusOnePolicy: InitialSetupAnswers['plusOnePolicy'];
  rsvpDeadline: string;
  mealChoice: InitialSetupAnswers['mealChoice'];
  registryIntent: InitialSetupAnswers['registryIntent'];
  optionalStory: string;
};

const normalizeInitialSetupDateInput = (value?: string): string => {
  const trimmed = value?.trim() || '';
  if (!trimmed) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return '';

  const date = new Date(`${trimmed}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().slice(0, 10) === trimmed ? trimmed : '';
};

export const interpretInitialSetupAnswers = (answers: InitialSetupAnswers): InterpretedInitialSetup => {
  const names = answers.names.split('&').map((value) => value.trim()).filter(Boolean);
  const whenWhereParts = answers.whenWhere.split(/\s+[—-]\s+/);
  return {
    names,
    labelPreference: answers.labelPreference,
    whenWhereRaw: answers.whenWhere,
    weddingDate: normalizeInitialSetupDateInput(whenWhereParts[0]),
    weddingLocation: whenWhereParts.slice(1).join(' — ').trim(),
    venueNameOrTbd: answers.venueNameOrTbd,
    style: answers.style,
    structuredWeekendEvents: parseWeekendEvents(answers.weekendEventsRaw),
    ceremonyArrivalTime: answers.ceremonyArrivalTime,
    guestCountBand: answers.guestCountBand,
    plusOnePolicy: answers.plusOnePolicy,
    rsvpDeadline: normalizeInitialSetupDateInput(answers.rsvpDeadline),
    mealChoice: answers.mealChoice,
    registryIntent: answers.registryIntent,
    optionalStory: answers.optionalStory,
  };
};
