import type { CoordinatorCommandSummaryLabel } from './coordinatorCommandSummaryTarget';
import type { CoordinatorPanelFocus } from './coordinatorPanelFocus';

export const getCoordinatorStablePromptState = ({
  priority,
  panelFocus,
}: {
  priority: CoordinatorCommandSummaryLabel;
  panelFocus: CoordinatorPanelFocus | null;
}) => {
  if (
    (priority === 'Check-in' && panelFocus === 'check-in') ||
    (priority === 'Timeline' && panelFocus === 'timeline') ||
    (priority === 'Q&A' && panelFocus === 'qna') ||
    (priority === 'Alerting' && panelFocus === null)
  ) {
    return 'In focus';
  }

  return null;
};
