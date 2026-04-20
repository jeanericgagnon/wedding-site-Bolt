import type { CoordinatorCommandSummaryLabel } from './coordinatorCommandSummaryTarget';

export const getCoordinatorCommandPriorityCtaState = ({
  priority,
  panelFocus,
}: {
  priority: CoordinatorCommandSummaryLabel;
  panelFocus: 'check-in' | 'timeline' | 'qna' | null;
}) => {
  if (
    (priority === 'Check-in' && panelFocus === 'check-in')
    || (priority === 'Timeline' && panelFocus === 'timeline')
    || (priority === 'Q&A' && panelFocus === 'qna')
    || (priority === 'Alerting' && panelFocus === null)
  ) {
    return 'In focus';
  }

  return null;
};
