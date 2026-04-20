import { describe, expect, it } from 'vitest';
import { getCoordinatorManualOverrideLabel } from './coordinatorManualOverrideLabel';

describe('coordinatorManualOverrideLabel', () => {
  it('returns panel-specific manual override copy', () => {
    expect(getCoordinatorManualOverrideLabel('check-in')).toBe('Manual override: working a different guest than the board target');
    expect(getCoordinatorManualOverrideLabel('timeline')).toBe('Manual override: working a different event than the board target');
    expect(getCoordinatorManualOverrideLabel('qna')).toBe('Manual override: working a different question than the board target');
  });

  it('stays quiet when no override-capable panel is focused', () => {
    expect(getCoordinatorManualOverrideLabel(null)).toBeNull();
  });
});
