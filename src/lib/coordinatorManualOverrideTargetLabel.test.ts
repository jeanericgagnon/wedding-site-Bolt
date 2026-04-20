import { describe, expect, it } from 'vitest';
import { getCoordinatorManualOverrideTargetLabel } from './coordinatorManualOverrideTargetLabel';

describe('coordinatorManualOverrideTargetLabel', () => {
  it('returns panel-specific board-target identity for manual overrides', () => {
    expect(getCoordinatorManualOverrideTargetLabel({ panelFocus: 'check-in', boardTargetName: 'Alex Rivera' })).toBe('Board guest: Alex Rivera');
    expect(getCoordinatorManualOverrideTargetLabel({ panelFocus: 'timeline', boardTargetName: 'Ceremony' })).toBe('Board event: Ceremony');
    expect(getCoordinatorManualOverrideTargetLabel({ panelFocus: 'qna', boardTargetName: 'Where should we park?' })).toBe('Board question: Where should we park?');
  });

  it('stays quiet without a target name', () => {
    expect(getCoordinatorManualOverrideTargetLabel({ panelFocus: 'check-in', boardTargetName: null })).toBeNull();
  });
});
