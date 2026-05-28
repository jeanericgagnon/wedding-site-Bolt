import type { CoordinatorCommandSummaryLabel } from './coordinatorCommandSummaryTarget';

export const getCoordinatorCommandPriorityCta = (priority: CoordinatorCommandSummaryLabel) => {
  switch (priority) {
    case 'Check-in':
      return 'Open door review';
    case 'Timeline':
      return 'Open active timeline';
    case 'Q&A':
      return 'Open guest question';
    case 'Alerting':
    default:
      return 'Open alert draft';
  }
};
