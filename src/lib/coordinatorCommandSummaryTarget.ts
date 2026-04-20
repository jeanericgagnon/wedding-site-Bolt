import type { CoordinatorPanelFocus } from './coordinatorPanelFocus';

export type CoordinatorCommandSummaryLabel = 'Check-in' | 'Timeline' | 'Q&A' | 'Alerting';

export type CoordinatorCommandSummaryTarget = {
  panelFocus: CoordinatorPanelFocus | null;
  reviewOnly: boolean;
};

export const getCoordinatorCommandSummaryTarget = (label: CoordinatorCommandSummaryLabel): CoordinatorCommandSummaryTarget => {
  switch (label) {
    case 'Check-in':
      return { panelFocus: 'check-in', reviewOnly: true };
    case 'Timeline':
      return { panelFocus: 'timeline', reviewOnly: false };
    case 'Q&A':
      return { panelFocus: 'qna', reviewOnly: false };
    case 'Alerting':
      return { panelFocus: null, reviewOnly: false };
    default:
      return { panelFocus: null, reviewOnly: false };
  }
};
