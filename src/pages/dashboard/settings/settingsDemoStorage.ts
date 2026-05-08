import {
  LOCAL_RSVP_MEAL_KEY,
  LOCAL_RSVP_QUESTIONS_KEY,
  type RSVPQuestionSetting,
} from './settingsDashboardTypes';
import { normalizeMealOptions, normalizeRsvpQuestions } from './settingsDashboardUtils';

export type DemoRsvpSettings = {
  questions: RSVPQuestionSetting[];
  mealEnabled: boolean;
  mealOptions: string[];
};

export const SETTINGS_DEMO_RSVP_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

type DemoRsvpStorageEnvelope<T> = {
  savedAtISO: string;
  value: T;
};

function isDemoRsvpStorageEnvelope<T = unknown>(value: unknown): value is DemoRsvpStorageEnvelope<T> {
  if (!value || typeof value !== 'object') return false;
  const envelope = value as Partial<DemoRsvpStorageEnvelope<T>>;
  return typeof envelope.savedAtISO === 'string' && 'value' in envelope;
}

function isFreshDemoRsvpStorage(savedAtISO: string): boolean {
  const savedAt = Date.parse(savedAtISO);
  return Number.isFinite(savedAt) && Date.now() - savedAt <= SETTINGS_DEMO_RSVP_RETENTION_MS;
}

function readDemoRsvpStorageValue<T>(key: string): { value: T | null; shouldMigrate: boolean } {
  const raw = localStorage.getItem(key);
  if (!raw) return { value: null, shouldMigrate: false };

  const parsed = JSON.parse(raw) as unknown;
  if (isDemoRsvpStorageEnvelope<T>(parsed)) {
    if (!isFreshDemoRsvpStorage(parsed.savedAtISO)) {
      localStorage.removeItem(key);
      return { value: null, shouldMigrate: false };
    }
    return { value: parsed.value, shouldMigrate: false };
  }

  return { value: parsed as T, shouldMigrate: true };
}

function writeDemoRsvpStorageValue<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify({
    savedAtISO: new Date().toISOString(),
    value,
  } satisfies DemoRsvpStorageEnvelope<T>));
}

export function readDemoRsvpSettings(): Partial<DemoRsvpSettings> {
  const result: Partial<DemoRsvpSettings> = {};

  try {
    const storedQuestions = readDemoRsvpStorageValue<unknown>(LOCAL_RSVP_QUESTIONS_KEY);
    if (storedQuestions.value) {
      result.questions = normalizeRsvpQuestions(storedQuestions.value);
      if (storedQuestions.shouldMigrate) writeDemoRsvpStorageValue(LOCAL_RSVP_QUESTIONS_KEY, result.questions);
    }

    const storedMeal = readDemoRsvpStorageValue<{ enabled?: unknown; options?: unknown }>(LOCAL_RSVP_MEAL_KEY);
    const parsedMeal = storedMeal.value;
    if (parsedMeal && typeof parsedMeal === 'object') {
      result.mealEnabled = typeof parsedMeal.enabled === 'boolean' ? parsedMeal.enabled : true;
      result.mealOptions = normalizeMealOptions(parsedMeal.options);
      if (storedMeal.shouldMigrate) {
        writeDemoRsvpStorageValue(LOCAL_RSVP_MEAL_KEY, {
          enabled: result.mealEnabled,
          options: result.mealOptions,
        });
      }
    }
  } catch {
    try {
      localStorage.removeItem(LOCAL_RSVP_QUESTIONS_KEY);
      localStorage.removeItem(LOCAL_RSVP_MEAL_KEY);
    } catch {}
    return result;
  }

  return result;
}

export function writeDemoRsvpSettings(input: DemoRsvpSettings): void {
  try {
    writeDemoRsvpStorageValue(LOCAL_RSVP_QUESTIONS_KEY, normalizeRsvpQuestions(input.questions));
    writeDemoRsvpStorageValue(LOCAL_RSVP_MEAL_KEY, {
      enabled: input.mealEnabled,
      options: normalizeMealOptions(input.mealOptions),
    });
  } catch {}
}
