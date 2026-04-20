import type { CoordinatorAlertSuggestion } from './coordinatorAlertSuggestions';

export const resolveCoordinatorTimelineAlertIntent = (
  suggestions: CoordinatorAlertSuggestion[],
  eventId: string,
) => {
  const liveMatch = suggestions.find((suggestion) => suggestion.key === `live:${eventId}`);
  if (liveMatch) return liveMatch.key;
  const upNextMatch = suggestions.find((suggestion) => suggestion.key === `up-next:${eventId}`);
  if (upNextMatch) return upNextMatch.key;
  return null;
};
