import {
  DEFAULT_MEAL_CONFIG,
  DEMO_RSVP_MEAL_KEY,
  DEMO_RSVP_QUESTIONS_KEY,
  DEMO_RSVP_RESPONSES_KEY,
  type ExistingRSVP,
  type RSVPMealConfig,
  type RSVPQuestion,
} from './rsvpTypes';

function normalizeDemoMealConfig(value: unknown): RSVPMealConfig {
  if (!value || typeof value !== 'object') return DEFAULT_MEAL_CONFIG;
  const config = value as { enabled?: unknown; options?: unknown };
  const options = Array.isArray(config.options)
    ? config.options.filter((option): option is string => typeof option === 'string' && option.trim().length > 0)
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
    .map((question) => ({
      id: question.id as string,
      label: question.label ?? '',
      question_text: typeof question.question_text === 'string' ? question.question_text : undefined,
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

export function readDemoMealConfig(): RSVPMealConfig {
  try {
    const raw = localStorage.getItem(DEMO_RSVP_MEAL_KEY);
    return normalizeDemoMealConfig(raw ? JSON.parse(raw) : null);
  } catch {
    return DEFAULT_MEAL_CONFIG;
  }
}

export function readDemoQuestions(): RSVPQuestion[] {
  try {
    const raw = localStorage.getItem(DEMO_RSVP_QUESTIONS_KEY);
    return normalizeDemoQuestions(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

export function readDemoStoredResponses(): Record<string, ExistingRSVP> {
  try {
    const raw = localStorage.getItem(DEMO_RSVP_RESPONSES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, ExistingRSVP>
      : {};
  } catch {
    return {};
  }
}

export function writeDemoStoredResponses(responses: Record<string, ExistingRSVP>): void {
  try {
    localStorage.setItem(DEMO_RSVP_RESPONSES_KEY, JSON.stringify(responses));
  } catch {}
}
