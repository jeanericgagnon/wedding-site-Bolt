import { describe, expect, it } from 'vitest';
import { resolveCoordinatorReturnToBoardState } from './coordinatorReturnToBoard';

describe('coordinatorReturnToBoard', () => {
  it('prefers returning to door review when check-in exceptions exist', () => {
    expect(resolveCoordinatorReturnToBoardState({ hasDoorReview: true, hasOpenQna: true, hasLiveEvent: false })).toEqual({
      panelFocus: 'check-in',
      checkInFilter: 'arrivals',
      checkInReviewOnly: true,
      commandSource: null,
    });
  });

  it('falls through to q&a then timeline when the board is calmer', () => {
    expect(resolveCoordinatorReturnToBoardState({ hasDoorReview: false, hasOpenQna: true, hasLiveEvent: false }).panelFocus).toBe('qna');
    expect(resolveCoordinatorReturnToBoardState({ hasDoorReview: false, hasOpenQna: false, hasLiveEvent: false }).panelFocus).toBe('timeline');
  });

  it('returns to neutral board mode when nothing urgent is open', () => {
    expect(resolveCoordinatorReturnToBoardState({ hasDoorReview: false, hasOpenQna: false, hasLiveEvent: true })).toEqual({
      panelFocus: null,
      checkInFilter: 'arrivals',
      checkInReviewOnly: false,
      commandSource: null,
    });
  });
});
