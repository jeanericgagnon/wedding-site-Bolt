import { describe, expect, it } from 'vitest';
import { resolveCoordinatorNeutralFocusTarget } from './coordinatorNeutralFocusTarget';

describe('coordinatorNeutralFocusTarget', () => {
  it('routes neutral check-in focus back into review mode', () => {
    expect(resolveCoordinatorNeutralFocusTarget('check-in')).toEqual({ panelFocus: 'check-in', reviewOnly: true });
  });

  it('routes q&a and timeline focus back to their panels', () => {
    expect(resolveCoordinatorNeutralFocusTarget('qna')).toEqual({ panelFocus: 'qna', reviewOnly: false });
    expect(resolveCoordinatorNeutralFocusTarget('timeline')).toEqual({ panelFocus: 'timeline', reviewOnly: false });
  });

  it('falls back cleanly when no neutral focus is active', () => {
    expect(resolveCoordinatorNeutralFocusTarget(null)).toEqual({ panelFocus: null, reviewOnly: false });
  });
});
