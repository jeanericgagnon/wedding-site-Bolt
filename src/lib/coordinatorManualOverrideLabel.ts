import type { CoordinatorPanelFocus } from './coordinatorPanelFocus';

export const getCoordinatorManualOverrideLabel = (panelFocus: CoordinatorPanelFocus | null) => {
  switch (panelFocus) {
    case 'check-in':
      return 'Different guest selected';
    case 'timeline':
      return 'Different event selected';
    case 'qna':
      return 'Different question selected';
    default:
      return null;
  }
};
