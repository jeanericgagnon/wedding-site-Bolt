import type { CoordinatorPanelFocus } from './coordinatorPanelFocus';

export const getCoordinatorNeutralFocusReason = (panelFocus: CoordinatorPanelFocus | null) => {
  switch (panelFocus) {
    case 'check-in':
      return 'The board brought you back to check-in because door exceptions still need attention.';
    case 'qna':
      return 'The board brought you back to guest Q&A because unresolved questions are still open.';
    case 'timeline':
      return 'The board brought you back to the timeline because no event is currently active.';
    default:
      return 'The board returned you to the neutral overview because no urgent follow-up focus was needed.';
  }
};
