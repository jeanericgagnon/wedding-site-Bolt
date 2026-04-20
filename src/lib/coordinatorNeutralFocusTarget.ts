import type { CoordinatorPanelFocus } from './coordinatorPanelFocus';

export type CoordinatorNeutralFocusTarget = {
  panelFocus: CoordinatorPanelFocus | null;
  reviewOnly: boolean;
};

export const resolveCoordinatorNeutralFocusTarget = (panelFocus: CoordinatorPanelFocus | null): CoordinatorNeutralFocusTarget => {
  switch (panelFocus) {
    case 'check-in':
      return { panelFocus: 'check-in', reviewOnly: true };
    case 'qna':
      return { panelFocus: 'qna', reviewOnly: false };
    case 'timeline':
      return { panelFocus: 'timeline', reviewOnly: false };
    default:
      return { panelFocus: null, reviewOnly: false };
  }
};
