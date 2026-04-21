import { describe, expect, it } from 'vitest';
import { getCoordinatorStandingPromptReasonAlertTightened } from './coordinatorStandingPromptReasonAlert';

describe('coordinatorStandingPromptReasonAlert', () => {
  it('tightens board-aligned alert standing prompt copy', () => {
    expect(getCoordinatorStandingPromptReasonAlertTightened('board-aligned live event update is ready to send')).toBe(
      'live event update ready to send',
    );
  });

  it('tightens override alert standing prompt copy', () => {
    expect(getCoordinatorStandingPromptReasonAlertTightened('manual override on check-in reminder draft needs review')).toBe(
      'override on check-in reminder draft needs review',
    );
  });
});
