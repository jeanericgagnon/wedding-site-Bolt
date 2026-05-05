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
  if (checkInLabel === 'Suggested guest in progress' || checkInLabel === 'Suggested guest waiting') {
    return 'Check-in';
  }

  if (timelineLabel === 'Suggested event in progress' || timelineLabel === 'Suggested event waiting') {
    return 'Timeline';
  }

  if (qnaLabel === 'Suggested question in progress' || qnaLabel === 'Suggested question waiting') {
    return 'Q&A';
  }

  return 'Alerting';
};
