import type { CoordinatorCommandSummaryLabel } from './coordinatorCommandSummaryTarget';

export const getCoordinatorStablePromptTargetLabel = ({
  priority,
  targetName,
}: {
  priority: CoordinatorCommandSummaryLabel;
  targetName: string | null;
}) => {
  if (!targetName) return null;

  switch (priority) {
    case 'Check-in':
      return `Guest · ${targetName}`;
    case 'Timeline':
      return `Event · ${targetName}`;
    case 'Q&A':
      return `Question · ${targetName}`;
    case 'Alerting':
    default:
      return `Lane · ${targetName}`;
  }
};
