export interface RSVPQuestionSetting {
  id: string;
  label: string;
  type: 'short_text' | 'long_text' | 'single_choice' | 'multi_choice';
  required: boolean;
  appliesTo: 'all' | 'ceremony' | 'reception';
  options?: string[];
}

export type AnalyticsRetentionDays = 30 | 90 | 180;

export const LOCAL_RSVP_QUESTIONS_KEY = 'dayof_demo_rsvp_custom_questions_v1';
export const LOCAL_RSVP_MEAL_KEY = 'dayof_demo_rsvp_meal_config_v1';

export const SITE_LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'it', label: 'Italiano' },
  { value: 'de', label: 'Deutsch' },
  { value: 'pt', label: 'Português' },
] as const;

export type SiteLanguageCode = typeof SITE_LANGUAGE_OPTIONS[number]['value'];
export type TranslationLanguageCode = Exclude<SiteLanguageCode, 'en'>;

export type TranslationStatusRow = {
  language: TranslationLanguageCode;
  status: 'ready' | 'failed';
  translated_at: string | null;
};

export const TRANSLATION_LANGUAGE_OPTIONS = SITE_LANGUAGE_OPTIONS.filter((option) => option.value !== 'en') as ReadonlyArray<{
  value: TranslationLanguageCode;
  label: string;
}>;
