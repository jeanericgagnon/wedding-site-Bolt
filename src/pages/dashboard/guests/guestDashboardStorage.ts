import {
  DEMO_RSVP_ACCESS_CONFIG_KEY,
  DEMO_RSVP_CUSTOM_QUESTIONS_KEY,
  DEMO_RSVP_MEAL_CONFIG_KEY,
  RSVP_CAMPAIGN_LOG_KEY,
  RSVP_CAMPAIGN_PRESET_KEY,
  RSVP_FOLLOWUP_TASKS_KEY,
  RSVP_SAVED_SEGMENTS_KEY,
  type RSVPQuestionSetting,
} from './guestDashboardTypes';
import {
  deriveDefaultRsvpAccessSelection,
  normalizePersistedRsvpAccessSelection,
  serializePersistedRsvpAccessSelection,
  type PersistedRsvpAccessSelection,
} from '../../../lib/rsvpAccessPlanner';

export type RsvpCampaignPreset = 'pending' | 'missing-meal' | 'plusone-missing' | 'ceremony-no' | 'reception-no' | 'pending-no-email';
export type RsvpFollowUpTask = { id: number; text: string; createdAt: string };
export type RsvpSavedSegment = { id: number; label: string; filter: string; createdAt: string };
export type RsvpCampaignLogEntry = { id: number; segment: string; count: number; sentAt: string };

const STORAGE_CAP = 12;
export const GUEST_DASHBOARD_STORAGE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_STORED_GUEST_TEXT_LENGTH = 240;
const MAX_DEMO_RSVP_OPTIONS = 12;
const DEFAULT_MEAL_OPTIONS = ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'];

type GuestDashboardStorageEnvelope<T> = {
  savedAtISO: string;
  value: T;
};

function buildGuestDashboardStorageKey(key: string, storageScope?: string | null): string {
  const scope = typeof storageScope === 'string' ? storageScope.trim() : '';
  return scope ? `${key}::${scope}` : key;
}

function normalizeStoredText(value: unknown, maxLength = MAX_STORED_GUEST_TEXT_LENGTH): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function isGuestDashboardStorageEnvelope<T = unknown>(value: unknown): value is GuestDashboardStorageEnvelope<T> {
  if (!value || typeof value !== 'object') return false;
  const envelope = value as Partial<GuestDashboardStorageEnvelope<T>>;
  return typeof envelope.savedAtISO === 'string' && 'value' in envelope;
}

function isStorageFresh(savedAtISO: string): boolean {
  const savedAt = Date.parse(savedAtISO);
  return Number.isFinite(savedAt) && Date.now() - savedAt <= GUEST_DASHBOARD_STORAGE_RETENTION_MS;
}

function readStoredValue<T>(key: string, fallback: T): { value: T; shouldMigrate: boolean } {
  const raw = localStorage.getItem(key);
  if (!raw) return { value: fallback, shouldMigrate: false };

  const parsed = JSON.parse(raw) as unknown;
  if (isGuestDashboardStorageEnvelope<T>(parsed)) {
    if (!isStorageFresh(parsed.savedAtISO)) {
      localStorage.removeItem(key);
      return { value: fallback, shouldMigrate: false };
    }
    return { value: parsed.value, shouldMigrate: false };
  }

  return { value: parsed as T, shouldMigrate: true };
}

function writeStoredValue<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify({
    savedAtISO: new Date().toISOString(),
    value,
  } satisfies GuestDashboardStorageEnvelope<T>));
}

function readScopedStoredValue<T>(key: string, storageScope: string | null | undefined, fallback: T): { value: T; shouldMigrate: boolean } {
  const storageKey = buildGuestDashboardStorageKey(key, storageScope);
  const hasScopedKey = localStorage.getItem(storageKey) !== null;
  const targetKey = !hasScopedKey && storageKey !== key ? key : storageKey;
  const stored = readStoredValue<T>(targetKey, fallback);
  return {
    value: stored.value,
    shouldMigrate: stored.shouldMigrate || targetKey !== storageKey,
  };
}

function normalizeCampaignPreset(value: unknown): RsvpCampaignPreset | null {
  if (
    value === 'pending'
    || value === 'missing-meal'
    || value === 'plusone-missing'
    || value === 'ceremony-no'
    || value === 'reception-no'
    || value === 'pending-no-email'
  ) {
    return value;
  }
  return null;
}

export function readStoredCampaignPreset(storageScope?: string | null): RsvpCampaignPreset | null {
  const storageKey = buildGuestDashboardStorageKey(RSVP_CAMPAIGN_PRESET_KEY, storageScope);
  try {
    const stored = readScopedStoredValue<unknown>(RSVP_CAMPAIGN_PRESET_KEY, storageScope, null);
    const normalized = normalizeCampaignPreset(stored.value);
    if (normalized && stored.shouldMigrate) writeStoredValue(storageKey, normalized);
    if (!normalized && localStorage.getItem(storageKey)) localStorage.removeItem(storageKey);
    return normalized;
  } catch {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }
  return null;
}

export function writeStoredCampaignPreset(campaignPreset: RsvpCampaignPreset, storageScope?: string | null): void {
  try {
    writeStoredValue(buildGuestDashboardStorageKey(RSVP_CAMPAIGN_PRESET_KEY, storageScope), campaignPreset);
  } catch {}
}

function normalizeStoredFollowUpTask(value: unknown): RsvpFollowUpTask | null {
  if (!value || typeof value !== 'object') return null;
  const task = value as Partial<RsvpFollowUpTask>;
  const text = normalizeStoredText(task.text);
  const createdAt = normalizeStoredText(task.createdAt, 40);
  return Number.isFinite(task.id) && text && createdAt
    ? { id: Number(task.id), text, createdAt }
    : null;
}

function normalizeStoredSavedSegment(value: unknown): RsvpSavedSegment | null {
  if (!value || typeof value !== 'object') return null;
  const segment = value as Partial<RsvpSavedSegment>;
  const label = normalizeStoredText(segment.label, 120);
  const filter = normalizeStoredText(segment.filter, 80);
  const createdAt = normalizeStoredText(segment.createdAt, 40);
  return Number.isFinite(segment.id) && label && filter && createdAt
    ? { id: Number(segment.id), label, filter, createdAt }
    : null;
}

function normalizeStoredCampaignLogEntry(value: unknown): RsvpCampaignLogEntry | null {
  if (!value || typeof value !== 'object') return null;
  const entry = value as Partial<RsvpCampaignLogEntry>;
  const segment = normalizeStoredText(entry.segment, 120);
  const sentAt = normalizeStoredText(entry.sentAt, 40);
  const count = typeof entry.count === 'number' && Number.isFinite(entry.count) ? Math.max(0, Math.floor(entry.count)) : null;
  return Number.isFinite(entry.id) && segment && sentAt && count !== null
    ? { id: Number(entry.id), segment, count, sentAt }
    : null;
}

function normalizeStoredArray<T>(value: unknown, normalizeItem: (item: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeItem)
    .filter((item): item is T => item !== null)
    .slice(0, STORAGE_CAP);
}

function readStoredArray<T>(key: string, normalizeItem: (item: unknown) => T | null, storageScope?: string | null): T[] {
  const storageKey = buildGuestDashboardStorageKey(key, storageScope);
  try {
    const stored = readScopedStoredValue<unknown>(key, storageScope, []);
    const normalized = normalizeStoredArray(stored.value, normalizeItem);
    if (stored.shouldMigrate && normalized.length > 0) writeStoredValue(storageKey, normalized);
    if (stored.shouldMigrate && normalized.length === 0 && localStorage.getItem(storageKey)) localStorage.removeItem(storageKey);
    return normalized;
  } catch {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    return [];
  }
}

function writeStoredArray<T>(key: string, items: T[], normalizeItem: (item: unknown) => T | null, storageScope?: string | null): void {
  try {
    writeStoredValue(buildGuestDashboardStorageKey(key, storageScope), normalizeStoredArray(items, normalizeItem));
  } catch {}
}

export const readStoredFollowUpTasks = (storageScope?: string | null) => readStoredArray<RsvpFollowUpTask>(RSVP_FOLLOWUP_TASKS_KEY, normalizeStoredFollowUpTask, storageScope);
export const writeStoredFollowUpTasks = (items: RsvpFollowUpTask[], storageScope?: string | null) => writeStoredArray(RSVP_FOLLOWUP_TASKS_KEY, items, normalizeStoredFollowUpTask, storageScope);

export const readStoredSavedSegments = (storageScope?: string | null) => readStoredArray<RsvpSavedSegment>(RSVP_SAVED_SEGMENTS_KEY, normalizeStoredSavedSegment, storageScope);
export const writeStoredSavedSegments = (items: RsvpSavedSegment[], storageScope?: string | null) => writeStoredArray(RSVP_SAVED_SEGMENTS_KEY, items, normalizeStoredSavedSegment, storageScope);

export const readStoredCampaignLog = (storageScope?: string | null) => readStoredArray<RsvpCampaignLogEntry>(RSVP_CAMPAIGN_LOG_KEY, normalizeStoredCampaignLogEntry, storageScope);
export const writeStoredCampaignLog = (items: RsvpCampaignLogEntry[], storageScope?: string | null) => writeStoredArray(RSVP_CAMPAIGN_LOG_KEY, items, normalizeStoredCampaignLogEntry, storageScope);

function normalizeDemoRsvpQuestions(value: unknown): RSVPQuestionSetting[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((question) => question as Partial<RSVPQuestionSetting>)
    .filter((question) => typeof question?.id === 'string' && typeof question?.label === 'string')
    .map((question): RSVPQuestionSetting => {
      const type: RSVPQuestionSetting['type'] = question.type === 'long_text' || question.type === 'single_choice' || question.type === 'multi_choice'
        ? question.type
        : 'short_text';
      const appliesTo: RSVPQuestionSetting['appliesTo'] = question.appliesTo === 'ceremony' || question.appliesTo === 'reception'
        ? question.appliesTo
        : 'all';

      return {
        id: normalizeStoredText(question.id, 80),
        label: normalizeStoredText(question.label, 160),
        type,
        required: question.required === true,
        appliesTo,
        options: Array.isArray(question.options)
          ? question.options
            .map((option) => normalizeStoredText(option, 120))
            .filter((option) => option.length > 0)
            .slice(0, MAX_DEMO_RSVP_OPTIONS)
          : [],
      };
    })
    .filter((question) => question.id.length > 0 && question.label.length > 0)
    .slice(0, STORAGE_CAP);
}

function normalizeDemoMealConfig(value: unknown): { enabled: boolean; options: string[] } {
  if (!value || typeof value !== 'object') {
    return { enabled: true, options: DEFAULT_MEAL_OPTIONS };
  }

  const config = value as { enabled?: unknown; options?: unknown };
  const options = Array.isArray(config.options)
    ? config.options
      .map((option) => normalizeStoredText(option, 120))
      .filter((option) => option.length > 0)
      .slice(0, MAX_DEMO_RSVP_OPTIONS)
    : DEFAULT_MEAL_OPTIONS;

  return {
    enabled: typeof config.enabled === 'boolean' ? config.enabled : true,
    options: options.length > 0 ? options : DEFAULT_MEAL_OPTIONS,
  };
}

function normalizeDemoRsvpAccessConfig(value: unknown): PersistedRsvpAccessSelection {
  return normalizePersistedRsvpAccessSelection(value, deriveDefaultRsvpAccessSelection({
    guestCount: 0,
    inviteTokenCount: 0,
  }));
}

export function readStoredDemoRsvpConfig(): {
  questions: RSVPQuestionSetting[];
  mealEnabled: boolean;
  mealOptions: string[];
  accessSelection: PersistedRsvpAccessSelection;
} {
  try {
    const storedQuestions = readStoredValue<unknown>(DEMO_RSVP_CUSTOM_QUESTIONS_KEY, []);
    const storedMealConfig = readStoredValue<unknown>(DEMO_RSVP_MEAL_CONFIG_KEY, null);
    const storedAccessConfig = readStoredValue<unknown>(DEMO_RSVP_ACCESS_CONFIG_KEY, null);
    const questions = normalizeDemoRsvpQuestions(storedQuestions.value);
    const mealConfig = normalizeDemoMealConfig(storedMealConfig.value);
    const accessSelection = normalizeDemoRsvpAccessConfig(storedAccessConfig.value);
    if (storedQuestions.shouldMigrate && questions.length > 0) writeStoredValue(DEMO_RSVP_CUSTOM_QUESTIONS_KEY, questions);
    if (storedQuestions.shouldMigrate && questions.length === 0 && localStorage.getItem(DEMO_RSVP_CUSTOM_QUESTIONS_KEY)) {
      localStorage.removeItem(DEMO_RSVP_CUSTOM_QUESTIONS_KEY);
    }
    if (storedMealConfig.shouldMigrate) writeStoredValue(DEMO_RSVP_MEAL_CONFIG_KEY, mealConfig);
    if (storedAccessConfig.shouldMigrate) writeStoredValue(DEMO_RSVP_ACCESS_CONFIG_KEY, serializePersistedRsvpAccessSelection(accessSelection));
    return {
      questions,
      mealEnabled: mealConfig.enabled,
      mealOptions: mealConfig.options,
      accessSelection,
    };
  } catch {
    try {
      localStorage.removeItem(DEMO_RSVP_CUSTOM_QUESTIONS_KEY);
      localStorage.removeItem(DEMO_RSVP_MEAL_CONFIG_KEY);
      localStorage.removeItem(DEMO_RSVP_ACCESS_CONFIG_KEY);
    } catch {}
    return {
      questions: [],
      mealEnabled: true,
      mealOptions: DEFAULT_MEAL_OPTIONS,
      accessSelection: deriveDefaultRsvpAccessSelection({ guestCount: 0, inviteTokenCount: 0 }),
    };
  }
}

export function writeStoredDemoRsvpConfig(input: {
  questions: RSVPQuestionSetting[];
  mealEnabled: boolean;
  mealOptions: string[];
  accessSelection: PersistedRsvpAccessSelection;
}): void {
  try {
    writeStoredValue(DEMO_RSVP_CUSTOM_QUESTIONS_KEY, normalizeDemoRsvpQuestions(input.questions));
    writeStoredValue(DEMO_RSVP_MEAL_CONFIG_KEY, normalizeDemoMealConfig({
      enabled: input.mealEnabled,
      options: input.mealOptions,
    }));
    writeStoredValue(DEMO_RSVP_ACCESS_CONFIG_KEY, serializePersistedRsvpAccessSelection(input.accessSelection));
  } catch {}
}
