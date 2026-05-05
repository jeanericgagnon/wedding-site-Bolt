import { describe, expect, it } from 'vitest';
import { getCoordinatorManualOverrideActionLabel } from './coordinatorManualOverrideAction';

describe('coordinatorManualOverrideAction', () => {
  it('returns a return-to-target action for override-capable panels', () => {
    expect(getCoordinatorManualOverrideActionLabel('check-in')).toBe('Return to suggested guest');
    expect(getCoordinatorManualOverrideActionLabel('timeline')).toBe('Return to suggested event');
    expect(getCoordinatorManualOverrideActionLabel('qna')).toBe('Return to suggested question');
  });

  it('stays quiet when no board-target return action exists', () => {
    expect(getCoordinatorManualOverrideActionLabel(null)).toBeNull();
  });
});
