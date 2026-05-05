import type { CoordinatorCommandSummaryLabel } from './coordinatorCommandSummaryTarget';

export const getCoordinatorStandingPromptReasonTightened = ({
  priority,
  reason,
}: {
  priority: CoordinatorCommandSummaryLabel;
  reason: string;
}) => {
  if (priority === 'Timeline') {
    return reason
      .replace('the live event is already in progress', 'live event in progress')
      .replace('the next event is waiting', 'next event waiting');
  }

  if (priority === 'Q&A') {
    return reason
      .replace('the suggested question is already in progress', 'question in progress')
      .replace('an unresolved guest question is waiting', 'guest question waiting');
  }

  return reason;
};
