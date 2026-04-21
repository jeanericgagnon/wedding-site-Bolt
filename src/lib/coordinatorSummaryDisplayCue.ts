import type { CoordinatorSummaryFeedback } from './coordinatorSummaryFeedback';

export type CoordinatorSummaryDisplayCue =
  | { kind: 'feedback'; feedback: CoordinatorSummaryFeedback }
  | { kind: 'alert-override'; label: string }
  | { kind: 'manual-override'; label: string }
  | null;

export const resolveCoordinatorSummaryDisplayCue = ({
  summaryFeedback,
  alertOverrideLabel,
  manualOverrideLabel,
}: {
  summaryFeedback: CoordinatorSummaryFeedback | null;
  alertOverrideLabel: string | null;
  manualOverrideLabel: string | null;
}): CoordinatorSummaryDisplayCue => {
  if (summaryFeedback) {
    return { kind: 'feedback', feedback: summaryFeedback };
  }

  if (alertOverrideLabel) {
    return { kind: 'alert-override', label: alertOverrideLabel };
  }

  if (manualOverrideLabel) {
    return { kind: 'manual-override', label: manualOverrideLabel };
  }

  return null;
};
