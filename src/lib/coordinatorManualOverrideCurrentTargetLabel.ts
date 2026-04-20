import type { CoordinatorPanelFocus } from './coordinatorPanelFocus';

export const getCoordinatorManualOverrideCurrentTargetLabel = ({
  panelFocus,
  currentTargetName,
}: {
  panelFocus: CoordinatorPanelFocus | null;
  currentTargetName: string | null;
}) => {
  if (!currentTargetName) return null;

  switch (panelFocus) {
    case 'check-in':
      return `Working guest: ${currentTargetName}`;
    case 'timeline':
      return `Working event: ${currentTargetName}`;
    case 'qna':
      return `Working question: ${currentTargetName}`;
    default:
      return null;
  }
};
