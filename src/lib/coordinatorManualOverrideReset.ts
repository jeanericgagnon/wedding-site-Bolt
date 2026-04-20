import type { CoordinatorPanelFocus } from './coordinatorPanelFocus';

export const shouldResetCoordinatorManualOverride = ({
  manualOverrideLabel,
  panelFocus,
  boardTargetId,
  currentTargetId,
}: {
  manualOverrideLabel: string | null;
  panelFocus: CoordinatorPanelFocus | null;
  boardTargetId: string | null;
  currentTargetId: string | null;
}) => {
  if (!manualOverrideLabel) return false;
  if (!panelFocus) return false;
  if (!boardTargetId) return false;
  return boardTargetId === currentTargetId;
};
