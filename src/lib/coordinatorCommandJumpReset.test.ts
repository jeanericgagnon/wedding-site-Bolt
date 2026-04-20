import { describe, expect, it } from 'vitest';
import { shouldResetCoordinatorCommandJumpLabel } from './coordinatorCommandJumpReset';

describe('coordinatorCommandJumpReset', () => {
  it('keeps the jump label only while the board stays on the jumped-to panel', () => {
    expect(shouldResetCoordinatorCommandJumpLabel({
      jumpLabel: 'Jumped from live summary to door review',
      panelFocus: 'check-in',
      expectedPanelFocus: 'check-in',
    })).toBe(false);

    expect(shouldResetCoordinatorCommandJumpLabel({
      jumpLabel: 'Jumped from live summary to door review',
      panelFocus: 'timeline',
      expectedPanelFocus: 'check-in',
    })).toBe(true);
  });

  it('stays quiet when there is no active jump context', () => {
    expect(shouldResetCoordinatorCommandJumpLabel({
      jumpLabel: null,
      panelFocus: 'timeline',
      expectedPanelFocus: 'timeline',
    })).toBe(false);
  });
});
