import type { CoordinatorCommandSummaryLabel } from './coordinatorCommandSummaryTarget';

export const getCoordinatorCommandPriority = ({
  checkInLabel,
  timelineLabel,
  qnaLabel,
  alertAligned,
}: {
  checkInLabel: string | null;
  timelineLabel: string | null;
  qnaLabel: string | null;
  alertAligned: boolean;
}): CoordinatorCommandSummaryLabel => {
  void alertAligned;

  if (checkInLabel === 'Working board target' || checkInLabel === 'Board target available') {
    return 'Check-in';
  }

  if (timelineLabel === 'Working board event' || timelineLabel === 'Board event available') {
    return 'Timeline';
  }

  if (qnaLabel === 'Working board question' || qnaLabel === 'Board question available') {
    return 'Q&A';
  }

  return 'Alerting';
};
