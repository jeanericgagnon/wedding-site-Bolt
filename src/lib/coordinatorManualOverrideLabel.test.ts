import { describe, expect, it } from 'vitest';
import { getCoordinatorManualOverrideLabel } from './coordinatorManualOverrideLabel';

describe('coordinatorManualOverrideLabel', () => {
  it('returns panel-specific manual override copy', () => {
    expect(getCoordinatorManualOverrideLabel('check-in')).toBe('Different guest selected');
    expect(getCoordinatorManualOverrideLabel('timeline')).toBe('Different event selected');
    expect(getCoordinatorManualOverrideLabel('qna')).toBe('Different question selected');
  });

  it('stays quiet when no override-capable panel is focused', () => {
    expect(getCoordinatorManualOverrideLabel(null)).toBeNull();
  });
});
