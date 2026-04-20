import type { CoordinatorAlertSuggestion } from './coordinatorAlertSuggestions';

export const getCoordinatorAlertLaneLabel = (
  preferredSuggestion: CoordinatorAlertSuggestion | null,
) => {
  if (!preferredSuggestion) return 'Custom update';
  if (preferredSuggestion.key.startsWith('live:')) return 'Live event update';
  if (preferredSuggestion.key.startsWith('up-next:')) return 'Up-next cue';
  if (preferredSuggestion.key === 'check-in') return 'Check-in reminder';
  return preferredSuggestion.label;
};
