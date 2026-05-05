import { describe, expect, it } from 'vitest';
import { getCoordinatorAlertOverrideTargetLabel } from './coordinatorAlertOverrideTargetLabel';

describe('coordinatorAlertOverrideTargetLabel', () => {
  it('names the suggested update during an override', () => {
    expect(getCoordinatorAlertOverrideTargetLabel({
      key: 'live:event-1',
      label: 'Update live event',
      subject: 'Ceremony is live',
      body: 'Ceremony is happening now.',
      audience: 'event:event-1',
    })).toBe('Suggested update: Update live event');
  });

  it('stays quiet without a preferred update', () => {
    expect(getCoordinatorAlertOverrideTargetLabel(null)).toBeNull();
  });
});
