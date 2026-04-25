import type { CoordinatorAlertLogItem } from './coordinatorModePersistence';
import { formatCoordinatorAlertSendTime } from './coordinatorAlertSendTime';

export type CoordinatorAlertBoard = {
  statusLabel: string;
  statusTone: 'ready' | 'warning' | 'idle';
  targetLabel: string;
  deliveryLabel: string;
  latestActivityLabel: string;
};

export const buildCoordinatorAlertBoard = ({
  aligned,
  laneLabel,
  audienceLabel,
  recipientLabel,
  deliveryLabel,
  hasDraftContent,
  latestAlert,
}: {
  aligned: boolean;
  laneLabel: string;
  audienceLabel: string;
  recipientLabel: string;
  deliveryLabel: string;
  hasDraftContent: boolean;
  latestAlert: CoordinatorAlertLogItem | null;
}): CoordinatorAlertBoard => {
  const statusLabel = !hasDraftContent
    ? 'Draft needed'
    : aligned
      ? 'Board-ready'
      : 'Customized';

  const statusTone = !hasDraftContent
    ? 'idle'
    : aligned
      ? 'ready'
      : 'warning';

  const latestActivityLabel = !latestAlert
    ? 'No recent day-of sends yet.'
    : latestAlert.sendAt
      ? `Latest scheduled send: ${latestAlert.subject} at ${formatCoordinatorAlertSendTime(latestAlert.sendAt)}`
      : `Latest live send: ${latestAlert.subject} via ${latestAlert.channel.toUpperCase()}`;

  return {
    statusLabel,
    statusTone,
    targetLabel: `${laneLabel} · ${audienceLabel} · ${recipientLabel}`,
    deliveryLabel,
    latestActivityLabel,
  };
};
