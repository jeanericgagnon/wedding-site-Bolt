import { describe, expect, it } from 'vitest';
import { getCoordinatorAlertSummaryTransitionLabel } from './coordinatorAlertSummaryTransitionLabel';

describe('coordinatorAlertSummaryTransitionLabel', () => {
  it('describes alert-lane transitions for the top command summary', () => {
    expect(getCoordinatorAlertSummaryTransitionLabel({ previousAligned: false, currentAligned: true })).toBe(
      'Alert lane re-aligned to board target',
    );
    expect(getCoordinatorAlertSummaryTransitionLabel({ previousAligned: true, currentAligned: false })).toBe(
      'Alert lane moved into manual override',
    );
  });

  it('stays quiet when there is no meaningful transition', () => {
    expect(getCoordinatorAlertSummaryTransitionLabel({ previousAligned: null, currentAligned: true })).toBeNull();
    expect(getCoordinatorAlertSummaryTransitionLabel({ previousAligned: true, currentAligned: true })).toBeNull();
  });
});
