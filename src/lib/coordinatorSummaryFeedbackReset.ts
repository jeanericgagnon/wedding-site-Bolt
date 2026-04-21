import type { CoordinatorPanelFocus } from './coordinatorPanelFocus';

export const shouldResetCoordinatorSummaryFeedback = ({
  feedbackLabel,
  panelFocus,
  expectedPanelFocus,
  currentTargetId,
  expectedTargetId,
}: {
  feedbackLabel: string | null;
  panelFocus: CoordinatorPanelFocus | null;
  expectedPanelFocus: CoordinatorPanelFocus | null;
  currentTargetId: string | null;
  expectedTargetId: string | null;
}) => {
  if (!feedbackLabel) return false;
  if (panelFocus !== expectedPanelFocus) return true;
  if (!expectedTargetId) return false;
  return currentTargetId !== expectedTargetId;
};
