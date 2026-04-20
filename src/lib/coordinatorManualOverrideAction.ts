import type { CoordinatorPanelFocus } from './coordinatorPanelFocus';

export const getCoordinatorManualOverrideActionLabel = (panelFocus: CoordinatorPanelFocus | null) => {
  switch (panelFocus) {
    case 'check-in':
      return 'Return to board guest';
    case 'timeline':
      return 'Return to board event';
    case 'qna':
      return 'Return to board question';
    default:
      return null;
  }
};
