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

export function readDemoRsvpSettings(): Partial<DemoRsvpSettings> {
  const result: Partial<DemoRsvpSettings> = {};

  try {
    const rawQuestions = localStorage.getItem(LOCAL_RSVP_QUESTIONS_KEY);
    if (rawQuestions) result.questions = normalizeRsvpQuestions(JSON.parse(rawQuestions));

    const rawMeal = localStorage.getItem(LOCAL_RSVP_MEAL_KEY);
    const parsedMeal = rawMeal ? JSON.parse(rawMeal) as { enabled?: unknown; options?: unknown } : null;
    if (parsedMeal && typeof parsedMeal === 'object') {
      result.mealEnabled = typeof parsedMeal.enabled === 'boolean' ? parsedMeal.enabled : true;
      result.mealOptions = normalizeMealOptions(parsedMeal.options);
    }
  } catch {
    return result;
  }

  return result;
}

export function writeDemoRsvpSettings(input: DemoRsvpSettings): void {
  try {
    localStorage.setItem(LOCAL_RSVP_QUESTIONS_KEY, JSON.stringify(input.questions));
    localStorage.setItem(LOCAL_RSVP_MEAL_KEY, JSON.stringify({ enabled: input.mealEnabled, options: input.mealOptions }));
  } catch {}
}
