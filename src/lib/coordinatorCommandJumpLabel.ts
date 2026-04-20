import type { CoordinatorCommandSummaryLabel } from './coordinatorCommandSummaryTarget';

export const getCoordinatorCommandJumpLabel = (label: CoordinatorCommandSummaryLabel) => {
  switch (label) {
    case 'Check-in':
      return 'Jumped from live summary to door review';
    case 'Timeline':
      return 'Jumped from live summary to timeline focus';
    case 'Q&A':
      return 'Jumped from live summary to guest question';
    case 'Alerting':
    default:
      return 'Jumped from live summary to alert draft';
  }
};
