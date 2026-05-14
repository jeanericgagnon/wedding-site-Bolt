import { normalizeGuestLanguageCode, type GuestLanguageCode } from './guestLanguagePreference';

type RsvpQuestionLike = {
  id?: unknown;
  label?: unknown;
  question_text?: unknown;
  type?: unknown;
  required?: unknown;
  appliesTo?: unknown;
  options?: unknown;
};

type RsvpMealConfigLike = {
  enabled?: unknown;
  options?: unknown;
};

type TranslationMetaRecord = Record<string, unknown>;

export type LocalizedRsvpConfig = {
  questions: Array<Record<string, unknown>>;
  mealConfig: { enabled: boolean; options: string[] };
};

const DEFAULT_MEAL_OPTIONS = ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function normalizeQuestionOptions(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((option): option is string => typeof option === 'string' && option.trim().length > 0)
    : [];
}

export function normalizeRsvpQuestionTranslations(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];

  return value
    .map((question) => question as RsvpQuestionLike)
    .filter((question) => typeof question?.id === 'string')
    .map((question) => {
      const normalized: Record<string, unknown> = {
        id: question.id,
        label: typeof question.label === 'string' ? question.label : '',
        type: typeof question.type === 'string' ? question.type : 'short_text',
        required: Boolean(question.required),
        appliesTo: typeof question.appliesTo === 'string' ? question.appliesTo : 'all',
      };

      if (typeof question.question_text === 'string' && question.question_text.trim().length > 0) {
        normalized.question_text = question.question_text;
      }

      const options = normalizeQuestionOptions(question.options);
      if (options.length > 0) {
        normalized.options = options;
      }

      return normalized;
    });
}

export function normalizeRsvpMealTranslation(value: unknown): { enabled: boolean; options: string[] } {
  const typed = asRecord(value) as RsvpMealConfigLike | null;
  const options = normalizeQuestionOptions(typed?.options);

  return {
    enabled: typeof typed?.enabled === 'boolean' ? typed.enabled : true,
    options: options.length > 0 ? options : [...DEFAULT_MEAL_OPTIONS],
  };
}

function maybeNormalizeRsvpMealTranslation(value: unknown): { enabled: boolean; options: string[] } | null {
  const typed = asRecord(value);
  if (!typed) return null;
  return normalizeRsvpMealTranslation(typed);
}

export function embedTranslatedRsvpAssets(
  translatedWeddingData: unknown,
  localized: LocalizedRsvpConfig,
): Record<string, unknown> {
  const baseWeddingData = asRecord(translatedWeddingData) ?? {};
  const existingTranslationMeta = asRecord(baseWeddingData.translation_meta) ?? {};

  return {
    ...baseWeddingData,
    translation_meta: {
      ...existingTranslationMeta,
      rsvp_custom_questions: normalizeRsvpQuestionTranslations(localized.questions),
      rsvp_meal_config: normalizeRsvpMealTranslation(localized.mealConfig),
    },
  };
}

export function readTranslatedRsvpAssets(translatedWeddingData: unknown): Partial<LocalizedRsvpConfig> {
  const weddingData = asRecord(translatedWeddingData);
  const translationMeta = asRecord(weddingData?.translation_meta) as TranslationMetaRecord | null;

  return {
    questions: normalizeRsvpQuestionTranslations(translationMeta?.rsvp_custom_questions),
    mealConfig: maybeNormalizeRsvpMealTranslation(translationMeta?.rsvp_meal_config) ?? undefined,
  };
}

function normalizeAllowedLanguages(value: unknown, fallbackLanguage: GuestLanguageCode): GuestLanguageCode[] {
  if (!Array.isArray(value)) return [fallbackLanguage];

  const normalized = value
    .map((entry) => normalizeGuestLanguageCode(typeof entry === 'string' ? entry : null))
    .filter((entry): entry is GuestLanguageCode => Boolean(entry));

  return normalized.length > 0 ? Array.from(new Set(normalized)) : [fallbackLanguage];
}

export function resolveLocalizedRsvpConfig(input: {
  baseQuestions: unknown;
  baseMealConfig: unknown;
  requestedLanguage?: string | null;
  siteDefaultLanguage?: string | null;
  weddingData?: unknown;
  translatedWeddingData?: unknown;
}): LocalizedRsvpConfig {
  const baseQuestions = normalizeRsvpQuestionTranslations(input.baseQuestions);
  const baseMealConfig = normalizeRsvpMealTranslation(input.baseMealConfig);
  const defaultLanguage = normalizeGuestLanguageCode(input.siteDefaultLanguage) ?? 'en';
  const requestedLanguage = normalizeGuestLanguageCode(input.requestedLanguage) ?? defaultLanguage;
  const weddingData = asRecord(input.weddingData);
  const allowedLanguages = normalizeAllowedLanguages(
    asRecord(weddingData?.language_settings)?.allowed_languages,
    defaultLanguage,
  );

  if (requestedLanguage === defaultLanguage || !allowedLanguages.includes(requestedLanguage)) {
    return { questions: baseQuestions, mealConfig: baseMealConfig };
  }

  const translated = readTranslatedRsvpAssets(input.translatedWeddingData);
  const translatedQuestions = normalizeRsvpQuestionTranslations(translated.questions);
  const translatedMealConfig = maybeNormalizeRsvpMealTranslation(translated.mealConfig);

  return {
    questions: translatedQuestions.length > 0 ? translatedQuestions : baseQuestions,
    mealConfig: translatedMealConfig ?? baseMealConfig,
  };
}
