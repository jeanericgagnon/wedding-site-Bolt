import type { CoordinatorAlertForm } from './coordinatorAlertFlow';
import type { CoordinatorAlertSuggestion } from './coordinatorAlertSuggestions';
import { applyCoordinatorAlertSuggestion } from './coordinatorAlertSuggestionApply';
import type { CoordinatorTimelineState } from './coordinatorModePersistence';

export const getCoordinatorTimelineTransitionLabel = ({
  eventName,
  nextState,
  syncedAlert,
}: {
  eventName: string;
  nextState: CoordinatorTimelineState;
  syncedAlert: boolean;
}) => {
  const base = nextState === 'live'
    ? `${eventName} moved live`
    : nextState === 'done'
      ? `${eventName} marked complete`
      : `${eventName} moved back to up next`;

  return syncedAlert ? `${base} — alert draft stayed in sync` : base;
};

export const syncCoordinatorAlertDraftForTimelineTransition = ({
  form,
  nextSuggestion,
  shouldSync,
}: {
  form: CoordinatorAlertForm;
  nextSuggestion: CoordinatorAlertSuggestion | null;
  shouldSync: boolean;
}) => {
  if (!shouldSync || !nextSuggestion) return form;
  return applyCoordinatorAlertSuggestion({ form, suggestion: nextSuggestion });
};
