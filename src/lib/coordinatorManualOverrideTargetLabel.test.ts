import { describe, expect, it } from 'vitest';
import { getCoordinatorManualOverrideTargetLabel } from './coordinatorManualOverrideTargetLabel';

describe('coordinatorManualOverrideTargetLabel', () => {
  it('returns panel-specific suggested identity for manual overrides', () => {
    expect(getCoordinatorManualOverrideTargetLabel({ panelFocus: 'check-in', boardTargetName: 'Alex Rivera' })).toBe('Suggested guest: Alex Rivera');
    expect(getCoordinatorManualOverrideTargetLabel({ panelFocus: 'timeline', boardTargetName: 'Ceremony' })).toBe('Suggested event: Ceremony');
    expect(getCoordinatorManualOverrideTargetLabel({ panelFocus: 'qna', boardTargetName: 'Where should we park?' })).toBe('Suggested question: Where should we park?');
  });

  it('stays quiet without a target name', () => {
    expect(getCoordinatorManualOverrideTargetLabel({ panelFocus: 'check-in', boardTargetName: null })).toBeNull();
  });
});
