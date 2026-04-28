import type { CoordinatorCommandSummaryLabel } from './coordinatorCommandSummaryTarget';

export type CoordinatorCommandSummaryItem = {
  label: CoordinatorCommandSummaryLabel;
  detail: string;
  targetLabel: string;
  statusLabel: string;
  tone: 'priority' | 'ready' | 'neutral';
};

const getCoordinatorCommandSummarySignal = ({
  label,
  detail,
  priorityLabel,
}: {
  label: CoordinatorCommandSummaryLabel;
  detail: string;
  priorityLabel: CoordinatorCommandSummaryLabel;
}): Pick<CoordinatorCommandSummaryItem, 'statusLabel' | 'tone'> => {
  if (label === priorityLabel) {
    return { statusLabel: 'Live priority', tone: 'priority' };
  }

  if (label === 'Alerting') {
    return detail.startsWith('Board-aligned')
      ? { statusLabel: 'Ready to send', tone: 'ready' }
      : { statusLabel: 'Needs review', tone: 'neutral' };
  }

  if (detail === 'Working board target' || detail === 'Working board event' || detail === 'Working board question') {
    return { statusLabel: 'In focus', tone: 'ready' };
  }

  if (detail === 'Board target available' || detail === 'Board event available' || detail === 'Board question available') {
    return { statusLabel: 'Queued', tone: 'ready' };
  }

  return { statusLabel: 'Monitoring', tone: 'neutral' };
};

export const buildCoordinatorCommandSummary = ({
  checkInLabel,
  timelineLabel,
  qnaLabel,
  alertLabel,
  priorityLabel,
  checkInTargetName,
  timelineTargetName,
  qnaTargetQuestion,
  alertLaneLabel,
}: {
  checkInLabel: string | null;
  timelineLabel: string | null;
  qnaLabel: string | null;
  alertLabel: string;
  priorityLabel: CoordinatorCommandSummaryLabel;
  checkInTargetName: string | null;
  timelineTargetName: string | null;
  qnaTargetQuestion: string | null;
  alertLaneLabel: string;
}): CoordinatorCommandSummaryItem[] => {
  const items: CoordinatorCommandSummaryItem[] = [];

  if (checkInLabel) {
    items.push({
      label: 'Check-in',
      detail: checkInLabel,
      targetLabel: checkInTargetName ?? 'No guest selected',
      ...getCoordinatorCommandSummarySignal({ label: 'Check-in', detail: checkInLabel, priorityLabel }),
    });
  }

  if (timelineLabel) {
    items.push({
      label: 'Timeline',
      detail: timelineLabel,
      targetLabel: timelineTargetName ?? 'No event selected',
      ...getCoordinatorCommandSummarySignal({ label: 'Timeline', detail: timelineLabel, priorityLabel }),
    });
  }

  if (qnaLabel) {
    items.push({
      label: 'Q&A',
      detail: qnaLabel,
      targetLabel: qnaTargetQuestion ?? 'No guest question selected',
      ...getCoordinatorCommandSummarySignal({ label: 'Q&A', detail: qnaLabel, priorityLabel }),
    });
  }

  items.push({
    label: 'Alerting',
    detail: alertLabel,
    targetLabel: alertLaneLabel,
    ...getCoordinatorCommandSummarySignal({ label: 'Alerting', detail: alertLabel, priorityLabel }),
  });

  return items;
};
