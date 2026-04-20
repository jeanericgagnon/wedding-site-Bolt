import type { CoordinatorPanelFocus } from './coordinatorPanelFocus';

export const getCoordinatorRealignmentLabel = (panelFocus: CoordinatorPanelFocus | null) => {
  switch (panelFocus) {
    case 'check-in':
      return 'Check-in re-aligned to board target';
    case 'timeline':
      return 'Timeline re-aligned to board target';
    case 'qna':
      return 'Q&A re-aligned to board target';
    default:
      return null;
  }
};
