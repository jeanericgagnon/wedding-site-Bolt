import type { CoordinatorAlertLogItem } from './coordinatorModePersistence';
import { formatCoordinatorAlertSendTime, getCoordinatorAlertSendTimestamp } from './coordinatorAlertSendTime';

export type CoordinatorAlertActivityBoard = {
  statusLabel: string;
  tone: 'ready' | 'warning' | 'neutral';
  latestLiveLabel: string;
  nextScheduledLabel: string;
  channelLabel: string;
  pacingLabel: string;
};

export const buildCoordinatorAlertActivityBoard = (
  alertLog: CoordinatorAlertLogItem[],
): CoordinatorAlertActivityBoard => {
  const liveAlerts = alertLog.filter((item) => !item.sendAt);
  const scheduledAlerts = alertLog
    .filter((item) => item.sendAt)
    .sort((a, b) => getCoordinatorAlertSendTimestamp(a.sendAt) - getCoordinatorAlertSendTimestamp(b.sendAt));
  const smsCount = alertLog.filter((item) => item.channel === 'sms').length;
  const emailCount = alertLog.filter((item) => item.channel === 'email').length;

  const latestLive = liveAlerts[0] ?? null;
  const nextScheduled = scheduledAlerts[0] ?? null;

  return {
    statusLabel: nextScheduled
      ? 'Scheduled follow-up is armed'
      : latestLive
        ? 'Live updates are flowing'
        : 'No alert activity yet',
    tone: nextScheduled ? 'warning' : latestLive ? 'ready' : 'neutral',
    latestLiveLabel: latestLive
      ? `${latestLive.subject} · ${latestLive.channel.toUpperCase()}`
      : 'No live send yet',
    nextScheduledLabel: nextScheduled
      ? `${nextScheduled.subject} · ${formatCoordinatorAlertSendTime(nextScheduled.sendAt)}`
      : 'No scheduled send queued',
    channelLabel: `${smsCount} SMS · ${emailCount} email`,
    pacingLabel: scheduledAlerts.length > liveAlerts.length
      ? 'More queued follow-up than live sends'
      : liveAlerts.length > 0
        ? 'Live send pace is leading'
        : 'No pacing signal yet',
  };
};
