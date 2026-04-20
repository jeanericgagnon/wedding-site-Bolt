import { describe, expect, it } from 'vitest';
import { getCoordinatorAlertSummaryStateLabel } from './coordinatorAlertSummaryStateLabel';

describe('coordinatorAlertSummaryStateLabel', () => {
  it('describes aligned and overridden alert-lane states for the command summary', () => {
    expect(getCoordinatorAlertSummaryStateLabel({ aligned: true, laneLabel: 'Live event update' })).toBe(
      'Board-aligned live event update',
    );
    expect(getCoordinatorAlertSummaryStateLabel({ aligned: false, laneLabel: 'Check-in reminder' })).toBe(
      'Manual override on check-in reminder',
    );
  });
});
