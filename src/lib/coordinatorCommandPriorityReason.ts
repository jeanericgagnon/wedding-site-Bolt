import type { CoordinatorCommandSummaryLabel } from './coordinatorCommandSummaryTarget';

export const getCoordinatorCommandPriorityReason = ({
  priority,
  checkInLabel,
  timelineLabel,
  qnaLabel,
  alertAligned,
  alertLaneLabel,
}: {
  priority: CoordinatorCommandSummaryLabel;
  checkInLabel: string | null;
  timelineLabel: string | null;
  qnaLabel: string | null;
  alertAligned: boolean;
  alertLaneLabel: string;
}) => {
  switch (priority) {
    case 'Check-in':
      return checkInLabel === 'Working board target'
        ? 'door review is already in progress'
        : 'door review is waiting';
    case 'Timeline':
      return timelineLabel === 'Working board event'
        ? 'the live event is already in progress'
        : 'the board event is waiting';
    case 'Q&A':
      return qnaLabel === 'Working board question'
        ? 'the board question is already in progress'
        : 'an unresolved guest question is waiting';
    case 'Alerting':
    default:
      return alertAligned
        ? `${alertLaneLabel.toLowerCase()} is ready to send`
        : `${alertLaneLabel.toLowerCase()} draft needs review`;
  }
};
