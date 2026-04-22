import { describe, expect, it } from 'vitest';
import { buildCoordinatorPrimaryActionBoard } from './coordinatorPrimaryActionBoard';

describe('coordinatorPrimaryActionBoard', () => {
  it('describes a door-review action as an immediate lane focus', () => {
    expect(buildCoordinatorPrimaryActionBoard({
      action: {
        key: 'door-review',
        title: 'Resolve the next door exception',
        detail: 'Alex Rivera needs a coordinator decision before check-in.',
      },
      target: { panelFocus: 'check-in', reviewOnly: true },
      canAutoRunTimeline: false,
    })).toEqual({
      statusLabel: 'Resolve the next door exception',
      tone: 'warning',
      destinationLabel: 'Check-in · review only',
      executionLabel: 'Focuses the lane immediately',
      detailLabel: 'Alex Rivera needs a coordinator decision before check-in.',
    });
  });

  it('describes timeline automation when the next event can auto-run live', () => {
    expect(buildCoordinatorPrimaryActionBoard({
      action: {
        key: 'start-up-next',
        title: 'Prepare the next event transition',
        detail: 'Ceremony is the next unfinished event in the run-of-show.',
      },
      target: { panelFocus: 'timeline', reviewOnly: false },
      canAutoRunTimeline: true,
    })).toEqual({
      statusLabel: 'Prepare the next event transition',
      tone: 'ready',
      destinationLabel: 'Run-of-show timeline',
      executionLabel: 'Auto-runs the next event live',
      detailLabel: 'Ceremony is the next unfinished event in the run-of-show.',
    });
  });
});
