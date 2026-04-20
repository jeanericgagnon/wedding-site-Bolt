import { describe, expect, it } from 'vitest';
import { shouldResetCoordinatorManualOverride } from './coordinatorManualOverrideReset';

describe('coordinatorManualOverrideReset', () => {
  it('clears manual override state once the operator is back on the board target', () => {
    expect(shouldResetCoordinatorManualOverride({
      manualOverrideLabel: 'Manual override: working a different guest than the board target',
      panelFocus: 'check-in',
      boardTargetId: 'guest-1',
      currentTargetId: 'guest-1',
    })).toBe(true);
  });

  it('keeps manual override state while the operator is still off-target', () => {
    expect(shouldResetCoordinatorManualOverride({
      manualOverrideLabel: 'Manual override: working a different event than the board target',
      panelFocus: 'timeline',
      boardTargetId: 'event-1',
      currentTargetId: 'event-2',
    })).toBe(false);
  });

  it('stays quiet without active override state or board target', () => {
    expect(shouldResetCoordinatorManualOverride({
      manualOverrideLabel: null,
      panelFocus: 'qna',
      boardTargetId: 'q-1',
      currentTargetId: 'q-1',
    })).toBe(false);
    expect(shouldResetCoordinatorManualOverride({
      manualOverrideLabel: 'Manual override: working a different question than the board target',
      panelFocus: 'qna',
      boardTargetId: null,
      currentTargetId: 'q-1',
    })).toBe(false);
  });
});
