import type { CoordinatorCommandSummaryLabel } from './coordinatorCommandSummaryTarget';

export const getCoordinatorCommandPriorityTargetReason = ({
  priority,
  checkInTargetName,
  timelineTargetName,
  qnaTargetQuestion,
}: {
  priority: CoordinatorCommandSummaryLabel;
  checkInTargetName: string | null;
  timelineTargetName: string | null;
  qnaTargetQuestion: string | null;
}) => {
  switch (priority) {
    case 'Check-in':
      return checkInTargetName ? `on ${checkInTargetName}` : null;
    case 'Timeline':
      return timelineTargetName ? `for ${timelineTargetName}` : null;
    case 'Q&A':
      return qnaTargetQuestion ? `on “${qnaTargetQuestion}”` : null;
    default:
      return null;
  }
};
