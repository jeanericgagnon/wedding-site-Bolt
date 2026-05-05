import type { CoordinatorPanelFocus } from './coordinatorPanelFocus';

export const getCoordinatorRealignmentLabel = (panelFocus: CoordinatorPanelFocus | null) => {
  switch (panelFocus) {
    case 'check-in':
      return 'Check-in returned to suggested guest';
    case 'timeline':
      return 'Timeline returned to suggested event';
    case 'qna':
      return 'Q&A returned to suggested question';
    default:
      return null;
  }
};
