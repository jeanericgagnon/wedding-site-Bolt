import { describe, expect, it } from 'vitest';
import { getCoordinatorAlertSummaryTransitionLabel } from './coordinatorAlertSummaryTransitionLabel';

describe('coordinatorAlertSummaryTransitionLabel', () => {
  it('describes alert-lane transitions for the top command summary', () => {
    expect(getCoordinatorAlertSummaryTransitionLabel({ previousAligned: false, currentAligned: true })).toBe(
      'Update draft returned to the suggestion',
    );
    expect(getCoordinatorAlertSummaryTransitionLabel({ previousAligned: true, currentAligned: false })).toBe(
      'Update draft was customized',
    );
  });

  it('stays quiet when there is no meaningful transition', () => {
    expect(getCoordinatorAlertSummaryTransitionLabel({ previousAligned: null, currentAligned: true })).toBeNull();
    expect(getCoordinatorAlertSummaryTransitionLabel({ previousAligned: true, currentAligned: true })).toBeNull();
  });
});
