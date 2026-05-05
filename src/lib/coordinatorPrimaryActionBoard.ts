import type { CoordinatorPrimaryAction } from './coordinatorPrimaryAction';
import type { CoordinatorPrimaryActionTarget } from './coordinatorPrimaryActionTarget';

export type CoordinatorPrimaryActionBoard = {
  statusLabel: string;
  tone: 'ready' | 'warning' | 'neutral';
  destinationLabel: string;
  followThroughLabel: string;
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
      followThroughLabel: 'Review when ready',
      detailLabel: action.detail,
    };
  }

  const destinationLabel = target.panelFocus === 'check-in'
    ? target.reviewOnly ? 'Check-in · review only' : 'Check-in queue'
    : target.panelFocus === 'qna'
      ? 'Guest Q&A'
      : 'Run-of-show timeline';

  const followThroughLabel = action.key === 'start-up-next'
    ? canAutoRunTimeline
      ? 'Can move the next event live'
      : 'Opens timeline for review'
    : 'Opens the right area now';

  return {
    statusLabel: `${action.title}`,
    tone: action.key === 'start-up-next' && canAutoRunTimeline ? 'ready' : 'warning',
    destinationLabel,
    followThroughLabel,
    detailLabel: action.detail,
  };
};
