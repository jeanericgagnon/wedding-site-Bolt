import { describe, expect, it } from 'vitest';
import { getCoordinatorAlertOverrideCurrentLabel } from './coordinatorAlertOverrideCurrentLabel';

describe('coordinatorAlertOverrideCurrentLabel', () => {
  it('describes the current manual alert draft', () => {
    expect(getCoordinatorAlertOverrideCurrentLabel({
      subject: 'Ceremony delayed',
      audienceLabel: 'All guests',
    })).toBe('Working draft: Ceremony delayed · All guests');
  });

  it('stays quiet without a usable subject', () => {
    expect(getCoordinatorAlertOverrideCurrentLabel({
      subject: '   ',
      audienceLabel: 'All guests',
    })).toBeNull();
  });
});
