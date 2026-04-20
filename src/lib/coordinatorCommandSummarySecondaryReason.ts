import type { CoordinatorCommandSummaryLabel } from './coordinatorCommandSummaryTarget';

export const getCoordinatorCommandSummarySecondaryReason = ({
  label,
  detail,
}: {
  label: CoordinatorCommandSummaryLabel;
  detail: string;
}) => {
  if (!detail.toLowerCase().includes('board')) return null;

  switch (label) {
    case 'Check-in':
      return 'door follow-up still queued';
    case 'Timeline':
      return 'event focus still queued';
    case 'Q&A':
      return 'guest answer still queued';
    case 'Alerting':
    default:
      return null;
  }
};
