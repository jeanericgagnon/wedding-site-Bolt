import type { CoordinatorAlertSuggestion } from './coordinatorAlertSuggestions';

export const getCoordinatorAlertSuggestionState = ({
  suggestion,
  preferredSuggestion,
  subject,
  body,
  audience,
}: {
  suggestion: CoordinatorAlertSuggestion;
  preferredSuggestion: CoordinatorAlertSuggestion | null;
  subject: string;
  body: string;
  audience: string;
}) => {
  const isBoardTarget = preferredSuggestion?.key === suggestion.key;
  const isDraftMatch = suggestion.subject.trim() === subject.trim()
    && suggestion.body.trim() === body.trim()
    && suggestion.audience === audience;

  return {
    isBoardTarget,
    isDraftMatch,
    badge: isDraftMatch ? 'In draft' : isBoardTarget ? 'Board target' : null,
  };
};
