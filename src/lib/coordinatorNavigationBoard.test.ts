import { describe, expect, it } from 'vitest';
import { buildCoordinatorNavigationBoard } from './coordinatorNavigationBoard';

describe('coordinatorNavigationBoard', () => {
  it('marks review-only check-in routing as a warning path', () => {
    expect(buildCoordinatorNavigationBoard({
      panelFocus: 'check-in',
      boardTargetName: 'Alex Rivera',
      reviewOnly: true,
    })).toEqual({
      statusLabel: 'Navigation target is armed',
      tone: 'warning',
      destinationLabel: 'Check-in',
      boardTargetLabel: 'Alex Rivera',
      modeLabel: 'Review-only route',
    });
  });

  it('shows neutral board mode when no panel is targeted', () => {
    expect(buildCoordinatorNavigationBoard({
      panelFocus: null,
      boardTargetName: null,
      reviewOnly: false,
    })).toEqual({
      statusLabel: 'Navigation is staying on the board',
      tone: 'neutral',
      destinationLabel: 'Board overview',
      boardTargetLabel: 'No board target selected',
      modeLabel: 'Neutral board mode',
    });
  });
});
