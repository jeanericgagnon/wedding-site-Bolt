import type { CoordinatorAlertLogItem } from './coordinatorModePersistence';

export type CoordinatorAlertLogViewItem = {
  id: string;
  tone: 'ready' | 'warning';
  title: string;
  meta: string;
  detail: string;
};

export const buildCoordinatorAlertLogView = (
  items: CoordinatorAlertLogItem[],
): CoordinatorAlertLogViewItem[] => items.map((item) => ({
  id: item.id,
  tone: item.sendAt ? 'warning' : 'ready',
  title: item.sendAt ? 'Scheduled send' : 'Live send',
  meta: item.sendAt
    ? `${new Date(item.sendAt).toLocaleString()} · ${item.channel.toUpperCase()}`
    : `${item.channel.toUpperCase()} · sent live`,
  detail: `${item.subject} · ${item.audience}`,
}));
