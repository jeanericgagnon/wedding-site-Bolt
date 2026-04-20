import type { CoordinatorPanelFocus } from './coordinatorPanelFocus';

export const shouldResetCoordinatorCommandJumpLabelForTargetChange = ({
  jumpLabel,
  panelFocus,
  expectedPanelFocus,
  currentTargetId,
  expectedTargetId,
}: {
  jumpLabel: string | null;
  panelFocus: CoordinatorPanelFocus | null;
  expectedPanelFocus: CoordinatorPanelFocus | null;
  currentTargetId: string | null;
  expectedTargetId: string | null;
}) => {
  if (!jumpLabel) return false;
  if (panelFocus !== expectedPanelFocus) return false;
  if (!expectedTargetId) return false;
  return currentTargetId !== expectedTargetId;
};
