import type { CoordinatorPanelFocus } from './coordinatorPanelFocus';

export const getCoordinatorManualOverrideLabel = (panelFocus: CoordinatorPanelFocus | null) => {
  switch (panelFocus) {
    case 'check-in':
      return 'Manual override: working a different guest than the board target';
    case 'timeline':
      return 'Manual override: working a different event than the board target';
    case 'qna':
      return 'Manual override: working a different question than the board target';
    default:
      return null;
  }
};
