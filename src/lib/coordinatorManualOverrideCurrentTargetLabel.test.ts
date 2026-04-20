import { describe, expect, it } from 'vitest';
import { getCoordinatorManualOverrideCurrentTargetLabel } from './coordinatorManualOverrideCurrentTargetLabel';

describe('coordinatorManualOverrideCurrentTargetLabel', () => {
  it('returns panel-specific current manual target identity', () => {
    expect(getCoordinatorManualOverrideCurrentTargetLabel({ panelFocus: 'check-in', currentTargetName: 'Jordan Lee' })).toBe('Working guest: Jordan Lee');
    expect(getCoordinatorManualOverrideCurrentTargetLabel({ panelFocus: 'timeline', currentTargetName: 'Cocktail Hour' })).toBe('Working event: Cocktail Hour');
    expect(getCoordinatorManualOverrideCurrentTargetLabel({ panelFocus: 'qna', currentTargetName: 'Can we bring kids?' })).toBe('Working question: Can we bring kids?');
  });

  it('stays quiet without a current target name', () => {
    expect(getCoordinatorManualOverrideCurrentTargetLabel({ panelFocus: 'check-in', currentTargetName: null })).toBeNull();
  });
});
