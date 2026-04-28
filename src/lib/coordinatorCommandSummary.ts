import type { CoordinatorCommandSummaryLabel } from './coordinatorCommandSummaryTarget';

export type CoordinatorCommandSummaryItem = {
  label: CoordinatorCommandSummaryLabel;
  detail: string;
  targetLabel: string;
  statusLabel: string;
  actionLabel: string;
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

const getCoordinatorCommandSummaryActionLabel = ({
  label,
  statusLabel,
  targetLabel,
}: {
  label: CoordinatorCommandSummaryLabel;
  statusLabel: CoordinatorCommandSummaryItem['statusLabel'];
  targetLabel: string;
}) => {
  const safeTargetLabel = targetLabel.trim();

  switch (label) {
    case 'Check-in':
      if (statusLabel === 'Live priority') return `Review ${safeTargetLabel} now`;
      if (statusLabel === 'In focus') return `Keep ${safeTargetLabel} moving`;
      if (statusLabel === 'Queued') return `Open ${safeTargetLabel} at the door`;
      return 'Monitor the door queue';
    case 'Timeline':
      if (statusLabel === 'Live priority') return `Run ${safeTargetLabel} now`;
      if (statusLabel === 'In focus') return `Keep ${safeTargetLabel} on track`;
      if (statusLabel === 'Queued') return `Prep ${safeTargetLabel}`;
      return 'Monitor the run-of-show';
    case 'Q&A':
      if (statusLabel === 'Live priority') return 'Answer this guest now';
      if (statusLabel === 'In focus') return 'Finish the active answer';
      if (statusLabel === 'Queued') return 'Open the waiting question';
      return 'Monitor guest questions';
    case 'Alerting':
      if (statusLabel === 'Live priority') return `Send ${safeTargetLabel} update now`;
      if (statusLabel === 'Ready to send') return `Review ${safeTargetLabel} draft`;
      return `Realign ${safeTargetLabel}`;
    default:
      return 'Review the board';
  }
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
    const targetLabel = checkInTargetName ?? 'No guest selected';
    const signal = getCoordinatorCommandSummarySignal({ label: 'Check-in', detail: checkInLabel, priorityLabel });
    items.push({
      label: 'Check-in',
      detail: checkInLabel,
      targetLabel,
      ...signal,
      actionLabel: getCoordinatorCommandSummaryActionLabel({ label: 'Check-in', statusLabel: signal.statusLabel, targetLabel }),
    });
  }

  if (timelineLabel) {
    const targetLabel = timelineTargetName ?? 'No event selected';
    const signal = getCoordinatorCommandSummarySignal({ label: 'Timeline', detail: timelineLabel, priorityLabel });
    items.push({
      label: 'Timeline',
      detail: timelineLabel,
      targetLabel,
      ...signal,
      actionLabel: getCoordinatorCommandSummaryActionLabel({ label: 'Timeline', statusLabel: signal.statusLabel, targetLabel }),
    });
  }

  if (qnaLabel) {
    const targetLabel = qnaTargetQuestion ?? 'No guest question selected';
    const signal = getCoordinatorCommandSummarySignal({ label: 'Q&A', detail: qnaLabel, priorityLabel });
    items.push({
      label: 'Q&A',
      detail: qnaLabel,
      targetLabel,
      ...signal,
      actionLabel: getCoordinatorCommandSummaryActionLabel({ label: 'Q&A', statusLabel: signal.statusLabel, targetLabel }),
    });
  }

  const alertSignal = getCoordinatorCommandSummarySignal({ label: 'Alerting', detail: alertLabel, priorityLabel });
  items.push({
    label: 'Alerting',
    detail: alertLabel,
    targetLabel: alertLaneLabel,
    ...alertSignal,
    actionLabel: getCoordinatorCommandSummaryActionLabel({ label: 'Alerting', statusLabel: alertSignal.statusLabel, targetLabel: alertLaneLabel }),
  });

  return items;
};
