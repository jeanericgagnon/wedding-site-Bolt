import type { CoordinatorPanelFocus } from './coordinatorPanelFocus';

export const shouldResetCoordinatorCommandJumpLabel = ({
  jumpLabel,
  panelFocus,
  expectedPanelFocus,
}: {
  jumpLabel: string | null;
  panelFocus: CoordinatorPanelFocus | null;
  expectedPanelFocus: CoordinatorPanelFocus | null;
}) => {
  if (!jumpLabel) return false;
  return panelFocus !== expectedPanelFocus;
};
