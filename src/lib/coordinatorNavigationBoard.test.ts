import { describe, expect, it } from 'vitest';
import { buildCoordinatorNavigationBoard } from './coordinatorNavigationBoard';

describe('coordinatorNavigationBoard', () => {
  it('marks review-only check-in routing as a warning path', () => {
    expect(buildCoordinatorNavigationBoard({
      panelFocus: 'check-in',
      boardTargetName: 'Alex Rivera',
      reviewOnly: true,
    })).toEqual({
      statusLabel: 'Next stop is ready',
      tone: 'warning',
      destinationLabel: 'Check-in',
      boardTargetLabel: 'Alex Rivera',
      modeLabel: 'Review-only path',
    });
  });

  it('shows neutral summary mode when no panel is targeted', () => {
    expect(buildCoordinatorNavigationBoard({
      panelFocus: null,
      boardTargetName: null,
      reviewOnly: false,
    })).toEqual({
      statusLabel: 'Staying on the day-of summary',
      tone: 'neutral',
      destinationLabel: 'Day-of summary',
      boardTargetLabel: 'No suggested item selected',
      modeLabel: 'Summary view',
    });
  });
});
