import type { CoordinatorCommandSummaryLabel } from './coordinatorCommandSummaryTarget';

export const getCoordinatorCommandSummaryTone = ({
  label,
  priority,
  detail,
}: {
  label: CoordinatorCommandSummaryLabel;
  priority: CoordinatorCommandSummaryLabel;
  detail: string;
}) => {
  if (label === priority) return 'priority';
  if (detail.toLowerCase().includes('suggested')) return 'secondary';
  return 'background';
};
