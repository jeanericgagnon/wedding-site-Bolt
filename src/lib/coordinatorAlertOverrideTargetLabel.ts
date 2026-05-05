import type { CoordinatorAlertSuggestion } from './coordinatorAlertSuggestions';

export const getCoordinatorAlertOverrideTargetLabel = (preferredSuggestion: CoordinatorAlertSuggestion | null) => {
  if (!preferredSuggestion) return null;
  return `Suggested update: ${preferredSuggestion.label}`;
};
