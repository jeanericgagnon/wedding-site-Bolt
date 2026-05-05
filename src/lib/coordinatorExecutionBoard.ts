import type { CoordinatorSummaryFeedback } from './coordinatorSummaryFeedback';

export type CoordinatorExecutionBoard = {
  statusLabel: string;
  tone: 'ready' | 'warning' | 'neutral';
  lastMoveLabel: string;
  laneLabel: string;
  effectLabel: string;
};

export const buildCoordinatorExecutionBoard = (
  feedback: CoordinatorSummaryFeedback | null,
): CoordinatorExecutionBoard => {
  if (!feedback) {
    return {
      statusLabel: 'No recent board update',
      tone: 'neutral',
      lastMoveLabel: 'Board is waiting for the next move',
      laneLabel: 'No active focus yet',
      effectLabel: 'Run a board action to stamp the latest move here',
    };
  }

  const laneLabel = feedback.panelFocus === 'check-in'
    ? 'Check-in'
    : feedback.panelFocus === 'timeline'
      ? 'Timeline'
      : feedback.panelFocus === 'qna'
        ? 'Guest Q&A'
        : feedback.panelFocus === 'alert'
          ? 'Alerting'
          : 'Board';

  return {
    statusLabel: feedback.kind === 'realignment'
      ? 'Board is back on target'
      : feedback.kind === 'transition'
        ? 'Live transition just ran'
        : 'Board jump just landed',
    tone: feedback.kind === 'transition' || feedback.kind === 'realignment' ? 'ready' : 'warning',
    lastMoveLabel: feedback.label,
    laneLabel,
    effectLabel: feedback.kind === 'transition'
      ? 'Live state changed'
      : feedback.kind === 'realignment'
        ? 'Board returned to target'
        : 'Board focus shifted',
  };
};
