import type { CoordinatorPanelFocus } from './coordinatorPanelFocus';

export const getCoordinatorManualOverrideTargetLabel = ({
  panelFocus,
  boardTargetName,
}: {
  panelFocus: CoordinatorPanelFocus | null;
  boardTargetName: string | null;
}) => {
  if (!boardTargetName) return null;

  switch (panelFocus) {
    case 'check-in':
      return `Board guest: ${boardTargetName}`;
    case 'timeline':
      return `Board event: ${boardTargetName}`;
    case 'qna':
      return `Board question: ${boardTargetName}`;
    default:
      return null;
  }
};
