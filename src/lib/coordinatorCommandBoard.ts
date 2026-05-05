import type { CoordinatorCommandSummaryLabel } from './coordinatorCommandSummaryTarget';

export type CoordinatorCommandBoard = {
  statusLabel: string;
  tone: 'ready' | 'warning' | 'neutral';
  firstActionLabel: string;
  firstTargetLabel: string;
  secondActionLabel: string;
  reasonLabel: string;
};

const formatLabel = (label: CoordinatorCommandSummaryLabel) => {
  if (label === 'Q&A') return 'Guest Q&A';
  return label;
};

export const buildCoordinatorCommandBoard = ({
  priority,
  reason,
  targetReason,
  cta,
  secondary,
  primaryActionTitle,
}: {
  priority: CoordinatorCommandSummaryLabel;
  reason: string;
  targetReason: string | null;
  cta: string;
  secondary: CoordinatorCommandSummaryLabel | null;
  primaryActionTitle: string;
}): CoordinatorCommandBoard => {
  const statusLabel = priority === 'Alerting'
    ? 'Updates are ready when you need them'
    : `${formatLabel(priority)} is the next focus`;

  return {
    statusLabel,
    tone: priority === 'Alerting' ? 'ready' : 'warning',
    firstActionLabel: `${cta} · ${formatLabel(priority)}`,
    firstTargetLabel: targetReason ? `${primaryActionTitle} ${targetReason}` : primaryActionTitle,
    secondActionLabel: secondary ? `Then check ${formatLabel(secondary)}` : 'No second step waiting',
    reasonLabel: reason,
  };
};
