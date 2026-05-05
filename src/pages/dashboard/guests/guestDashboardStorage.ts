import {
  DEMO_RSVP_CUSTOM_QUESTIONS_KEY,
  DEMO_RSVP_MEAL_CONFIG_KEY,
  RSVP_CAMPAIGN_LOG_KEY,
  RSVP_CAMPAIGN_PRESET_KEY,
  RSVP_FOLLOWUP_TASKS_KEY,
  RSVP_SAVED_SEGMENTS_KEY,
  type RSVPQuestionSetting,
} from './guestDashboardTypes';

export type RsvpCampaignPreset = 'pending' | 'missing-meal' | 'plusone-missing' | 'ceremony-no' | 'reception-no' | 'pending-no-email';
export type RsvpFollowUpTask = { id: number; text: string; createdAt: string };
export type RsvpSavedSegment = { id: number; label: string; filter: string; createdAt: string };
export type RsvpCampaignLogEntry = { id: number; segment: string; count: number; sentAt: string };

const STORAGE_CAP = 12;
const DEFAULT_MEAL_OPTIONS = ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'];

export function readStoredCampaignPreset(): RsvpCampaignPreset | null {
  try {
    const rawPreset = localStorage.getItem(RSVP_CAMPAIGN_PRESET_KEY);
    if (
      rawPreset === 'pending'
      || rawPreset === 'missing-meal'
      || rawPreset === 'plusone-missing'
      || rawPreset === 'ceremony-no'
      || rawPreset === 'reception-no'
      || rawPreset === 'pending-no-email'
    ) {
      return rawPreset;
    }
  } catch {}
  return null;
}

export function writeStoredCampaignPreset(campaignPreset: RsvpCampaignPreset): void {
  try {
    localStorage.setItem(RSVP_CAMPAIGN_PRESET_KEY, campaignPreset);
  } catch {}
}

function readStoredArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, STORAGE_CAP) : [];
  } catch {
    return [];
  }
}

function writeStoredArray<T>(key: string, items: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items.slice(0, STORAGE_CAP)));
  } catch {}
}

export const readStoredFollowUpTasks = () => readStoredArray<RsvpFollowUpTask>(RSVP_FOLLOWUP_TASKS_KEY);
export const writeStoredFollowUpTasks = (items: RsvpFollowUpTask[]) => writeStoredArray(RSVP_FOLLOWUP_TASKS_KEY, items);

export const readStoredSavedSegments = () => readStoredArray<RsvpSavedSegment>(RSVP_SAVED_SEGMENTS_KEY);
export const writeStoredSavedSegments = (items: RsvpSavedSegment[]) => writeStoredArray(RSVP_SAVED_SEGMENTS_KEY, items);

export const readStoredCampaignLog = () => readStoredArray<RsvpCampaignLogEntry>(RSVP_CAMPAIGN_LOG_KEY);
export const writeStoredCampaignLog = (items: RsvpCampaignLogEntry[]) => writeStoredArray(RSVP_CAMPAIGN_LOG_KEY, items);

function normalizeDemoRsvpQuestions(value: unknown): RSVPQuestionSetting[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((question) => question as Partial<RSVPQuestionSetting>)
    .filter((question) => typeof question?.id === 'string' && typeof question?.label === 'string')
    .map((question) => ({
      id: question.id as string,
      label: question.label ?? '',
      type: question.type === 'long_text' || question.type === 'single_choice' || question.type === 'multi_choice'
        ? question.type
        : 'short_text',
      required: question.required === true,
      appliesTo: question.appliesTo === 'ceremony' || question.appliesTo === 'reception' ? question.appliesTo : 'all',
      options: Array.isArray(question.options)
        ? question.options.filter((option): option is string => typeof option === 'string')
        : [],
    }));
}

function normalizeDemoMealConfig(value: unknown): { enabled: boolean; options: string[] } {
  if (!value || typeof value !== 'object') {
    return { enabled: true, options: DEFAULT_MEAL_OPTIONS };
  }

  const config = value as { enabled?: unknown; options?: unknown };
  const options = Array.isArray(config.options)
    ? config.options.filter((option): option is string => typeof option === 'string' && option.trim().length > 0)
    : DEFAULT_MEAL_OPTIONS;

  return {
    enabled: typeof config.enabled === 'boolean' ? config.enabled : true,
    options: options.length > 0 ? options : DEFAULT_MEAL_OPTIONS,
  };
}

export function readStoredDemoRsvpConfig(): { questions: RSVPQuestionSetting[]; mealEnabled: boolean; mealOptions: string[] } {
  try {
    const rawQuestions = localStorage.getItem(DEMO_RSVP_CUSTOM_QUESTIONS_KEY);
    const rawMealConfig = localStorage.getItem(DEMO_RSVP_MEAL_CONFIG_KEY);
    const mealConfig = normalizeDemoMealConfig(rawMealConfig ? JSON.parse(rawMealConfig) : null);
    return {
      questions: normalizeDemoRsvpQuestions(rawQuestions ? JSON.parse(rawQuestions) : []),
      mealEnabled: mealConfig.enabled,
      mealOptions: mealConfig.options,
    };
  } catch {
    return {
      questions: [],
      mealEnabled: true,
      mealOptions: DEFAULT_MEAL_OPTIONS,
    };
  }
}

export function writeStoredDemoRsvpConfig(input: { questions: RSVPQuestionSetting[]; mealEnabled: boolean; mealOptions: string[] }): void {
  try {
    localStorage.setItem(DEMO_RSVP_CUSTOM_QUESTIONS_KEY, JSON.stringify(normalizeDemoRsvpQuestions(input.questions)));
    localStorage.setItem(DEMO_RSVP_MEAL_CONFIG_KEY, JSON.stringify({
      enabled: input.mealEnabled,
      options: input.mealOptions.filter((option) => option.trim().length > 0),
    }));
  } catch {}
}
