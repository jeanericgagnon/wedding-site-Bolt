import type { CoordinatorAlertForm } from './coordinatorAlertFlow';
import type { CoordinatorAlertSuggestion } from './coordinatorAlertSuggestions';

export const applyCoordinatorAlertSuggestion = ({
  form,
  suggestion,
}: {
  form: CoordinatorAlertForm;
  suggestion: CoordinatorAlertSuggestion;
}): CoordinatorAlertForm => ({
  ...form,
  audience: suggestion.audience,
  subject: suggestion.subject,
  body: suggestion.body,
});
