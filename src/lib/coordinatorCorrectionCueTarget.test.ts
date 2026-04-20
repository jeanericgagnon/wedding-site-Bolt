import { describe, expect, it } from 'vitest';
import { resolveCoordinatorCorrectionCueTarget } from './coordinatorCorrectionCueTarget';

describe('coordinatorCorrectionCueTarget', () => {
  it('routes correction cues into the right command panels', () => {
    expect(resolveCoordinatorCorrectionCueTarget({ key: 'undo-check-in', title: 'Need to reverse a check-in?', detail: 'Alex Rivera is already marked checked in.' })).toEqual({
      panelFocus: 'check-in',
      reviewOnly: false,
    });
    expect(resolveCoordinatorCorrectionCueTarget({ key: 'reopen-event', title: 'Need to reopen the timeline?', detail: 'Ceremony is marked completed.' })).toEqual({
      panelFocus: 'timeline',
      reviewOnly: false,
    });
  });
});
