import type { CoordinatorPanelFocus } from './coordinatorPanelFocus';

export const getCoordinatorManualOverrideActionLabel = (panelFocus: CoordinatorPanelFocus | null) => {
  switch (panelFocus) {
    case 'check-in':
      return 'Return to suggested guest';
    case 'timeline':
      return 'Return to suggested event';
    case 'qna':
      return 'Return to suggested question';
    default:
      return null;
  }
};
