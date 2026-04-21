import type { CoordinatorCommandSummaryLabel } from './coordinatorCommandSummaryTarget';

export type CoordinatorCommandDeckItem = {
  label: CoordinatorCommandSummaryLabel;
  detail: string;
  status: string;
  cta: string;
  target: string | null;
  priority: boolean;
};

export const buildCoordinatorCommandDeck = ({
  items,
  priorityLabel,
  priorityReason,
  priorityCta,
  checkInTargetName,
  timelineTargetName,
  qnaTargetQuestion,
  alertLaneLabel,
}: {
  items: Array<{ label: CoordinatorCommandSummaryLabel; detail: string }>;
  priorityLabel: CoordinatorCommandSummaryLabel;
  priorityReason: string;
  priorityCta: string;
  checkInTargetName: string | null;
  timelineTargetName: string | null;
  qnaTargetQuestion: string | null;
  alertLaneLabel: string;
}): CoordinatorCommandDeckItem[] => items.map((item) => ({
  label: item.label,
  detail: item.detail,
  status: item.label === priorityLabel ? `Priority · ${priorityReason}` : 'Standby',
  cta: item.label === priorityLabel
    ? priorityCta
    : item.label === 'Check-in'
      ? 'Open queue'
      : item.label === 'Timeline'
        ? 'Open timeline'
        : item.label === 'Q&A'
          ? 'Open triage'
          : 'Open alerts',
  target: item.label === 'Check-in'
    ? checkInTargetName
    : item.label === 'Timeline'
      ? timelineTargetName
      : item.label === 'Q&A'
        ? qnaTargetQuestion
        : alertLaneLabel,
  priority: item.label === priorityLabel,
}));
