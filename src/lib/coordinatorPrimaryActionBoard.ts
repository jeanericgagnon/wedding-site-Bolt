import type { CoordinatorPrimaryAction } from './coordinatorPrimaryAction';
import type { CoordinatorPrimaryActionTarget } from './coordinatorPrimaryActionTarget';

export type CoordinatorPrimaryActionBoard = {
  statusLabel: string;
  tone: 'ready' | 'warning' | 'neutral';
  destinationLabel: string;
  executionLabel: string;
  detailLabel: string;
};

export const buildCoordinatorPrimaryActionBoard = ({
  action,
  target,
  canAutoRunTimeline,
}: {
  action: CoordinatorPrimaryAction;
  target: CoordinatorPrimaryActionTarget;
  canAutoRunTimeline: boolean;
}): CoordinatorPrimaryActionBoard => {
  if (action.key === 'all-clear' || !target.panelFocus) {
    return {
      statusLabel: 'No forced move is queued',
      tone: 'neutral',
      destinationLabel: 'Stay on the board',
      executionLabel: 'Manual review',
      detailLabel: action.detail,
    };
  }

  const destinationLabel = target.panelFocus === 'check-in'
    ? target.reviewOnly ? 'Check-in · review only' : 'Check-in queue'
    : target.panelFocus === 'qna'
      ? 'Guest Q&A'
      : 'Run-of-show timeline';

  const executionLabel = action.key === 'start-up-next'
    ? canAutoRunTimeline
      ? 'Auto-runs the next event live'
      : 'Focuses timeline for manual launch'
    : 'Focuses the lane immediately';

  return {
    statusLabel: `${action.title}`,
    tone: action.key === 'start-up-next' && canAutoRunTimeline ? 'ready' : 'warning',
    destinationLabel,
    executionLabel,
    detailLabel: action.detail,
  };
};
