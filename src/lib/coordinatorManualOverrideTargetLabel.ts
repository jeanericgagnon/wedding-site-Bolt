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
      return `Suggested guest: ${boardTargetName}`;
    case 'timeline':
      return `Suggested event: ${boardTargetName}`;
    case 'qna':
      return `Suggested question: ${boardTargetName}`;
    default:
      return null;
  }
};
