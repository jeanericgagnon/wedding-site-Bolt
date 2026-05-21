import { customerSafeErrorMessage } from '../../../lib/customerSafeError';
import { PLANNER_PERMISSION_GROUPS, type PlannerPermissionKey } from '../../../lib/plannerAccess';
import type { SettingsSiteUpdates } from './settingsSiteData';
import { SITE_LANGUAGE_OPTIONS, type AnalyticsRetentionDays, type RSVPQuestionSetting, type SiteLanguageCode } from './settingsDashboardTypes';

export const SETTINGS_SITE_MISSING_COPY = 'Couldn’t find your wedding site right now. Refresh and try again.';
export type SettingsPrivacyMode = 'public' | 'password_protected' | 'invite_only';
export const ANALYTICS_RETENTION_OPTIONS: AnalyticsRetentionDays[] = [30, 90, 180];

export const makeQuestion = (): RSVPQuestionSetting => ({
  id: `q_${Math.random().toString(36).slice(2, 10)}`,
  label: '',
  type: 'short_text',
  required: false,
  appliesTo: 'all',
  options: [],
});

export const getSiteLanguageLabel = (language: string) =>
  SITE_LANGUAGE_OPTIONS.find((option) => option.value === language)?.label ?? language.toUpperCase();

export const formatTranslationStatusDate = (value: string | null) => {
  if (!value) return 'Not generated yet';
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  const parsed = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Generated recently';
  if (
    dateOnlyMatch
    && (parsed.getFullYear() !== Number(dateOnlyMatch[1])
      || parsed.getMonth() !== Number(dateOnlyMatch[2]) - 1
      || parsed.getDate() !== Number(dateOnlyMatch[3]))
  ) {
    return 'Generated recently';
  }
  return `Updated ${parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
};

export const safeSettingsError = (err: unknown, fallback: string) => {
  return customerSafeErrorMessage(err, fallback);
};

export const plannerPermissionLabel = (key: PlannerPermissionKey) =>
  PLANNER_PERMISSION_GROUPS.find((permission) => permission.key === key)?.label ?? 'Planner access';

export function normalizeRsvpQuestions(value: unknown): RSVPQuestionSetting[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((question) => question as Partial<RSVPQuestionSetting>)
    .filter((question) => typeof question?.id === 'string' && typeof question?.label === 'string')
    .map((question) => ({
      id: question.id as string,
      label: (question.label as string) || '',
      type: (question.type as RSVPQuestionSetting['type']) || 'short_text',
      required: !!question.required,
      appliesTo: (question.appliesTo as RSVPQuestionSetting['appliesTo']) || 'all',
      options: Array.isArray(question.options) ? question.options.filter((option): option is string => typeof option === 'string') : [],
    }));
}

export function normalizeMealOptions(value: unknown, fallback = ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan']): string[] {
  return Array.isArray(value) ? value.filter((option): option is string => typeof option === 'string' && option.trim().length > 0) : fallback;
}

export function normalizeAllowedSiteLanguages(value: unknown, fallback: SiteLanguageCode[] = SITE_LANGUAGE_OPTIONS.map((option) => option.value)): SiteLanguageCode[] {
  const valid = new Set<SiteLanguageCode>(SITE_LANGUAGE_OPTIONS.map((option) => option.value));
  const normalized = Array.isArray(value)
    ? value
        .filter((language): language is SiteLanguageCode => typeof language === 'string' && valid.has(language as SiteLanguageCode))
    : [];
  const unique = Array.from(new Set(normalized));
  return unique.length > 0 ? unique : fallback;
}

export function normalizeAnalyticsRetentionDays(value: unknown, fallback: AnalyticsRetentionDays = 90): AnalyticsRetentionDays {
  return ANALYTICS_RETENTION_OPTIONS.includes(value as AnalyticsRetentionDays) ? (value as AnalyticsRetentionDays) : fallback;
}

export function normalizeAnalyticsGuestNotice(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 240) : '';
}

export function normalizeAnalyticsSettings(
  value: unknown,
  fallback?: { enabled?: boolean; retentionDays?: AnalyticsRetentionDays; guestNotice?: string },
): {
  enabled: boolean;
  retentionDays: AnalyticsRetentionDays;
  guestNotice: string;
} {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    enabled: typeof source.enabled === 'boolean' ? source.enabled : fallback?.enabled ?? true,
    retentionDays: normalizeAnalyticsRetentionDays(source.retention_days, fallback?.retentionDays ?? 90),
    guestNotice: normalizeAnalyticsGuestNotice(source.guest_notice ?? fallback?.guestNotice ?? ''),
  };
}

export function splitCoupleNames(coupleNames: string) {
  const parts = coupleNames.split('&').map((part) => part.trim()).filter(Boolean);
  return {
    name1: parts[0] ?? coupleNames.trim(),
    name2: parts[1] ?? '',
  };
}

export function normalizeSettingsSlug(rawSlug: string) {
  const raw = rawSlug.trim().toLowerCase();
  const fromUrl = raw.includes('/') ? raw.split('/').filter(Boolean).pop() || '' : raw;
  return fromUrl.replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-').replace(/^-|-$/g, '');
}

export function buildPrivacySettingsUpdates(input: {
  privacyMode: SettingsPrivacyMode;
  hideFromSearch: boolean;
  defaultLanguage: SiteLanguageCode;
  allowedLanguages: SiteLanguageCode[];
  analyticsEnabled: boolean;
  analyticsRetentionDays: AnalyticsRetentionDays;
  analyticsGuestNotice: string;
  weddingData?: Record<string, unknown> | null;
  sitePasswordHash?: string | null;
  guestAccessToken?: string | null;
}): SettingsSiteUpdates {
  const allowedLanguages = Array.from(new Set([input.defaultLanguage, ...normalizeAllowedSiteLanguages(input.allowedLanguages, [input.defaultLanguage])]));
  const analyticsSettings = normalizeAnalyticsSettings(
    ((input.weddingData as Record<string, unknown> | null | undefined)?.analytics_settings as Record<string, unknown> | undefined) ?? {},
    {
      enabled: input.analyticsEnabled,
      retentionDays: input.analyticsRetentionDays,
      guestNotice: input.analyticsGuestNotice,
    },
  );
  const updates: SettingsSiteUpdates = {
    privacy_mode: input.privacyMode,
    hide_from_search: input.hideFromSearch,
    default_language: input.defaultLanguage,
    wedding_data: {
      ...((input.weddingData && typeof input.weddingData === 'object') ? input.weddingData : {}),
      language_settings: {
        ...(((input.weddingData as Record<string, unknown> | null | undefined)?.language_settings as Record<string, unknown> | undefined) ?? {}),
        allowed_languages: allowedLanguages,
      },
      analytics_settings: {
        ...(((input.weddingData as Record<string, unknown> | null | undefined)?.analytics_settings as Record<string, unknown> | undefined) ?? {}),
        enabled: analyticsSettings.enabled,
        retention_days: analyticsSettings.retentionDays,
        guest_notice: analyticsSettings.guestNotice,
      },
    },
  };

  if (input.privacyMode === 'password_protected' && input.sitePasswordHash) {
    updates.site_password_hash = input.sitePasswordHash;
  }

  if (input.privacyMode === 'invite_only' && input.guestAccessToken) {
    updates.guest_access_token = input.guestAccessToken;
  }

  return updates;
}

export function cleanRsvpSettings(input: {
  questions: RSVPQuestionSetting[];
  mealEnabled: boolean;
  mealOptions: string[];
}): {
  cleanedQuestions: RSVPQuestionSetting[];
  cleanedMealOptions: string[];
  validationError: string | null;
} {
  const cleanedQuestions = input.questions
    .map((question) => ({
      ...question,
      label: question.label.trim(),
      options: (question.type === 'single_choice' || question.type === 'multi_choice')
        ? (question.options ?? []).map((option) => option.trim()).filter(Boolean)
        : [],
    }))
    .filter((question) => question.label.length > 0);

  const missingOptions = cleanedQuestions.find(
    (question) => (question.type === 'single_choice' || question.type === 'multi_choice') && (question.options?.length ?? 0) < 2,
  );

  if (missingOptions) {
    return {
      cleanedQuestions,
      cleanedMealOptions: [],
      validationError: `Choice question "${missingOptions.label}" needs at least 2 options.`,
    };
  }

  const cleanedMealOptions = input.mealOptions.map((option) => option.trim()).filter(Boolean);
  if (input.mealEnabled && cleanedMealOptions.length < 2) {
    return {
      cleanedQuestions,
      cleanedMealOptions,
      validationError: 'Meal choices need at least 2 options when enabled.',
    };
  }

  return {
    cleanedQuestions,
    cleanedMealOptions,
    validationError: null,
  };
}
