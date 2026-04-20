import { describe, expect, it } from 'vitest';
import { shouldResetCoordinatorCommandJumpLabelForTargetChange } from './coordinatorCommandJumpTargetReset';

describe('coordinatorCommandJumpTargetReset', () => {
  it('clears jump context when the operator changes target inside the same panel', () => {
    expect(shouldResetCoordinatorCommandJumpLabelForTargetChange({
      jumpLabel: 'Jumped from live summary to door review',
      panelFocus: 'check-in',
      expectedPanelFocus: 'check-in',
      currentTargetId: 'guest-2',
      expectedTargetId: 'guest-1',
    })).toBe(true);
  });

  it('keeps jump context when the board is still on the same target', () => {
    expect(shouldResetCoordinatorCommandJumpLabelForTargetChange({
      jumpLabel: 'Jumped from live summary to guest question',
      panelFocus: 'qna',
      expectedPanelFocus: 'qna',
      currentTargetId: 'q-1',
      expectedTargetId: 'q-1',
    })).toBe(false);
  });

  it('stays quiet without an expected target', () => {
    expect(shouldResetCoordinatorCommandJumpLabelForTargetChange({
      jumpLabel: 'Jumped from live summary to alert draft',
      panelFocus: null,
      expectedPanelFocus: null,
      currentTargetId: null,
      expectedTargetId: null,
    })).toBe(false);
  });
});
