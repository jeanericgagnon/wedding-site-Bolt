import {
  DEFAULT_MEAL_CONFIG,
  DEMO_RSVP_MEAL_KEY,
  DEMO_RSVP_QUESTIONS_KEY,
  DEMO_RSVP_RESPONSES_KEY,
  type ExistingRSVP,
  type RSVPMealConfig,
  type RSVPQuestion,
} from './rsvpTypes';

export const RSVP_DEMO_STORAGE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_DEMO_RSVP_TEXT_LENGTH = 240;
const MAX_DEMO_RSVP_OPTIONS = 12;
const MAX_DEMO_RSVP_RESPONSES = 24;
const MAX_DEMO_RSVP_CUSTOM_ANSWERS = 24;

type RsvpDemoStorageEnvelope<T> = {
  savedAtISO: string;
  value: T;
};

function normalizeDemoText(value: unknown, maxLength = MAX_DEMO_RSVP_TEXT_LENGTH): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function isRsvpDemoStorageEnvelope<T = unknown>(value: unknown): value is RsvpDemoStorageEnvelope<T> {
  if (!value || typeof value !== 'object') return false;
  const envelope = value as Partial<RsvpDemoStorageEnvelope<T>>;
  return typeof envelope.savedAtISO === 'string' && 'value' in envelope;
}

function isFreshRsvpDemoStorage(savedAtISO: string): boolean {
  const savedAt = Date.parse(savedAtISO);
  return Number.isFinite(savedAt) && Date.now() - savedAt <= RSVP_DEMO_STORAGE_RETENTION_MS;
}

function readDemoStorageValue<T>(key: string): { value: T | null; shouldMigrate: boolean } {
  const raw = localStorage.getItem(key);
  if (!raw) return { value: null, shouldMigrate: false };

  const parsed = JSON.parse(raw) as unknown;
  if (isRsvpDemoStorageEnvelope<T>(parsed)) {
    if (!isFreshRsvpDemoStorage(parsed.savedAtISO)) {
      localStorage.removeItem(key);
      return { value: null, shouldMigrate: false };
    }
    return { value: parsed.value, shouldMigrate: false };
  }

  return { value: parsed as T, shouldMigrate: true };
}

function writeDemoStorageValue<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify({
    savedAtISO: new Date().toISOString(),
    value,
  } satisfies RsvpDemoStorageEnvelope<T>));
}

function normalizeDemoMealConfig(value: unknown): RSVPMealConfig {
  if (!value || typeof value !== 'object') return DEFAULT_MEAL_CONFIG;
  const config = value as { enabled?: unknown; options?: unknown };
  const options = Array.isArray(config.options)
    ? config.options
      .map((option) => normalizeDemoText(option, 120))
      .filter((option) => option.length > 0)
      .slice(0, MAX_DEMO_RSVP_OPTIONS)
    : DEFAULT_MEAL_CONFIG.options;

  return {
    enabled: typeof config.enabled === 'boolean' ? config.enabled : true,
    options: options.length > 0 ? options : DEFAULT_MEAL_CONFIG.options,
  };
}

function normalizeDemoQuestions(value: unknown): RSVPQuestion[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((question) => question as Partial<RSVPQuestion>)
    .filter((question) => typeof question?.id === 'string' && typeof question?.label === 'string')
    .map((question): RSVPQuestion => {
      const type: RSVPQuestion['type'] = question.type === 'long_text' || question.type === 'single_choice' || question.type === 'multi_choice'
        ? question.type
        : 'short_text';
      const appliesTo: RSVPQuestion['appliesTo'] = question.appliesTo === 'ceremony' || question.appliesTo === 'reception'
        ? question.appliesTo
        : 'all';
      const questionText = normalizeDemoText(question.question_text);

      return {
        id: normalizeDemoText(question.id, 80),
        label: normalizeDemoText(question.label, 160),
        question_text: questionText || undefined,
        type,
        required: question.required === true,
        appliesTo,
        options: Array.isArray(question.options)
          ? question.options
            .map((option) => normalizeDemoText(option, 120))
            .filter((option) => option.length > 0)
            .slice(0, MAX_DEMO_RSVP_OPTIONS)
          : [],
      };
    })
    .filter((question) => question.id.length > 0 && question.label.length > 0)
    .slice(0, MAX_DEMO_RSVP_OPTIONS);
}

function normalizeDemoCustomAnswers(value: unknown): Record<string, string | string[]> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entries: Array<readonly [string, string | string[]]> = [];

  Object.entries(value as Record<string, unknown>)
    .slice(0, MAX_DEMO_RSVP_CUSTOM_ANSWERS)
    .forEach(([rawKey, rawAnswer]) => {
      const key = normalizeDemoText(rawKey, 80);
      if (!key) return;
      if (Array.isArray(rawAnswer)) {
        const answers = rawAnswer
          .map((answer) => normalizeDemoText(answer))
          .filter((answer) => answer.length > 0)
          .slice(0, MAX_DEMO_RSVP_OPTIONS);
        if (answers.length > 0) entries.push([key, answers]);
        return;
      }
      const answer = normalizeDemoText(rawAnswer);
      if (answer) entries.push([key, answer]);
    });

  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

function normalizeExistingDemoRsvp(value: unknown): ExistingRSVP | null {
  if (!value || typeof value !== 'object') return null;
  const rsvp = value as Partial<ExistingRSVP>;
  const id = normalizeDemoText(rsvp.id, 80);
  if (!id || typeof rsvp.attending !== 'boolean') return null;

  return {
    id,
    attending: rsvp.attending,
    attending_ceremony: typeof rsvp.attending_ceremony === 'boolean' || rsvp.attending_ceremony === null ? rsvp.attending_ceremony : undefined,
    attending_reception: typeof rsvp.attending_reception === 'boolean' || rsvp.attending_reception === null ? rsvp.attending_reception : undefined,
    guest_ids: Array.isArray(rsvp.guest_ids) ? rsvp.guest_ids.map((guestId) => normalizeDemoText(guestId, 80)).filter(Boolean).slice(0, MAX_DEMO_RSVP_RESPONSES) : null,
    meal_choice: rsvp.meal_choice === null ? null : normalizeDemoText(rsvp.meal_choice, 120) || null,
    plus_one_name: rsvp.plus_one_name === null ? null : normalizeDemoText(rsvp.plus_one_name, 120) || null,
    plus_one_count: typeof rsvp.plus_one_count === 'number' && Number.isFinite(rsvp.plus_one_count) ? Math.max(0, Math.floor(rsvp.plus_one_count)) : undefined,
    children_count: typeof rsvp.children_count === 'number' && Number.isFinite(rsvp.children_count) ? Math.max(0, Math.floor(rsvp.children_count)) : undefined,
    notes: rsvp.notes === null ? null : normalizeDemoText(rsvp.notes) || null,
    custom_answers: normalizeDemoCustomAnswers(rsvp.custom_answers),
  };
}

function normalizeDemoStoredResponses(value: unknown): Record<string, ExistingRSVP> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>)
    .slice(0, MAX_DEMO_RSVP_RESPONSES)
    .map(([rawKey, rawRsvp]) => {
      const key = normalizeDemoText(rawKey, 80);
      const rsvp = normalizeExistingDemoRsvp(rawRsvp);
      return key && rsvp ? [key, rsvp] as const : null;
    })
    .filter((entry): entry is readonly [string, ExistingRSVP] => entry !== null);

  return Object.fromEntries(entries);
}

export function readDemoMealConfig(): RSVPMealConfig {
  try {
    const stored = readDemoStorageValue<unknown>(DEMO_RSVP_MEAL_KEY);
    const normalized = normalizeDemoMealConfig(stored.value);
    if (stored.shouldMigrate) writeDemoStorageValue(DEMO_RSVP_MEAL_KEY, normalized);
    return normalized;
  } catch {
    try {
      localStorage.removeItem(DEMO_RSVP_MEAL_KEY);
    } catch {}
    return DEFAULT_MEAL_CONFIG;
  }
}

export function readDemoQuestions(): RSVPQuestion[] {
  try {
    const stored = readDemoStorageValue<unknown>(DEMO_RSVP_QUESTIONS_KEY);
    const normalized = normalizeDemoQuestions(stored.value);
    if (stored.shouldMigrate && normalized.length > 0) writeDemoStorageValue(DEMO_RSVP_QUESTIONS_KEY, normalized);
    if (stored.shouldMigrate && normalized.length === 0 && localStorage.getItem(DEMO_RSVP_QUESTIONS_KEY)) {
      localStorage.removeItem(DEMO_RSVP_QUESTIONS_KEY);
    }
    return normalized;
  } catch {
    try {
      localStorage.removeItem(DEMO_RSVP_QUESTIONS_KEY);
    } catch {}
    return [];
  }
}

export function readDemoStoredResponses(): Record<string, ExistingRSVP> {
  try {
    const stored = readDemoStorageValue<unknown>(DEMO_RSVP_RESPONSES_KEY);
    const normalized = normalizeDemoStoredResponses(stored.value);
    if (stored.shouldMigrate && Object.keys(normalized).length > 0) writeDemoStorageValue(DEMO_RSVP_RESPONSES_KEY, normalized);
    if (stored.shouldMigrate && Object.keys(normalized).length === 0 && localStorage.getItem(DEMO_RSVP_RESPONSES_KEY)) {
      localStorage.removeItem(DEMO_RSVP_RESPONSES_KEY);
    }
    return normalized;
  } catch {
    try {
      localStorage.removeItem(DEMO_RSVP_RESPONSES_KEY);
    } catch {}
    return {};
  }
}

export function writeDemoStoredResponses(responses: Record<string, ExistingRSVP>): void {
  try {
    writeDemoStorageValue(DEMO_RSVP_RESPONSES_KEY, normalizeDemoStoredResponses(responses));
  } catch {}
}
