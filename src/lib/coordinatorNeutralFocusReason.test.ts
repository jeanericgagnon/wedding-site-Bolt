import { describe, expect, it } from 'vitest';
import { getCoordinatorNeutralFocusReason } from './coordinatorNeutralFocusReason';

describe('coordinatorNeutralFocusReason', () => {
  it('explains each autopilot neutral focus choice', () => {
    expect(getCoordinatorNeutralFocusReason('check-in')).toContain('door exceptions');
    expect(getCoordinatorNeutralFocusReason('qna')).toContain('guest Q&A');
    expect(getCoordinatorNeutralFocusReason('timeline')).toContain('currently active');
  });

  it('falls back to a neutral-board explanation', () => {
    expect(getCoordinatorNeutralFocusReason(null)).toContain('neutral overview');
  });
});
