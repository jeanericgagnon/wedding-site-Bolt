import type { CoordinatorAlertSuggestion } from './coordinatorAlertSuggestions';

export type CoordinatorAlertIntentState = {
  lastSuggestionKey: string | null;
};

export const normalizeCoordinatorAlertIntentState = (value: unknown): CoordinatorAlertIntentState => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { lastSuggestionKey: null };
  }
  const parsed = value as Partial<CoordinatorAlertIntentState>;
  return {
    lastSuggestionKey: typeof parsed.lastSuggestionKey === 'string' && parsed.lastSuggestionKey.trim().length > 0
      ? parsed.lastSuggestionKey
      : null,
  };
};

export const resolveCoordinatorPreferredAlertSuggestion = (
  suggestions: CoordinatorAlertSuggestion[],
  lastSuggestionKey: string | null,
) => suggestions.find((suggestion) => suggestion.key === lastSuggestionKey) ?? suggestions[0] ?? null;
