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

  const isoMatch = trimmed.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  const normalizedIso = isoMatch ? `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}` : '';
  if (normalizedIso) {
    const date = new Date(`${normalizedIso}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10) === normalizedIso ? normalizedIso : '';
  }

  const monthLookup: Record<string, string> = {
    january: '01',
    jan: '01',
    february: '02',
    feb: '02',
    march: '03',
    mar: '03',
    april: '04',
    apr: '04',
    may: '05',
    june: '06',
    jun: '06',
    july: '07',
    jul: '07',
    august: '08',
    aug: '08',
    september: '09',
    sept: '09',
    sep: '09',
    october: '10',
    oct: '10',
    november: '11',
    nov: '11',
    december: '12',
    dec: '12',
  };
  const monthMatch = trimmed.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,)?\s+(\d{4})\b/i);
  if (!monthMatch) return '';

  const month = monthLookup[monthMatch[1].toLowerCase().replace(/\.$/, '')];
  const day = monthMatch[2].padStart(2, '0');
  const normalized = `${monthMatch[3]}-${month}-${day}`;
  const date = new Date(`${normalized}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().slice(0, 10) === normalized ? normalized : '';
};

const stripDateFromWhenWhere = (rawValue: string, normalizedDate: string): string => {
  const trimmed = rawValue.trim();
  if (!trimmed || !normalizedDate) return '';

  const isoRemoved = trimmed
    .replace(/\b\d{4}-\d{2}-\d{2}\b/, '')
    .trim();

  const dateRemoved = isoRemoved
    .replace(/\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,)?\s+\d{4}\b/i, '')
    .replace(/^\s*(?:in|at|near|around)\s+/i, '')
    .replace(/^[\s,;:—-]+/, '')
    .replace(/\s+/g, ' ')
    .trim();

  return dateRemoved;
};

const parseWhenWhere = (value: string): { weddingDate: string; weddingLocation: string } => {
  const trimmed = value.trim();
  if (!trimmed) return { weddingDate: '', weddingLocation: '' };

  const date = normalizeInitialSetupDateInput(trimmed);
  const parts = trimmed.split(/\s+[—-]\s+/);
  if (parts.length > 1) {
    const firstPartDate = normalizeInitialSetupDateInput(parts[0]);
    return {
      weddingDate: firstPartDate || date,
      weddingLocation: parts.slice(1).join(' — ').trim(),
    };
  }

  return {
    weddingDate: date,
    weddingLocation: stripDateFromWhenWhere(trimmed, date),
  };
};

export const interpretInitialSetupAnswers = (answers: InitialSetupAnswers): InterpretedInitialSetup => {
  const names = answers.names.split('&').map((value) => value.trim()).filter(Boolean);
  const parsedWhenWhere = parseWhenWhere(answers.whenWhere);
  return {
    names,
    labelPreference: answers.labelPreference,
    whenWhereRaw: answers.whenWhere,
    weddingDate: parsedWhenWhere.weddingDate,
    weddingLocation: parsedWhenWhere.weddingLocation,
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
