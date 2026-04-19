import { describe, expect, it } from 'vitest';
import { normalizeCoordinatorModeSessionState } from './coordinatorModeSessionState';

describe('coordinatorModeSessionState', () => {
  it('restores valid operator focus state', () => {
    expect(normalizeCoordinatorModeSessionState({
      checkInFilter: 'checked-in',
      checkInReviewOnly: true,
      panelFocus: 'qna',
    })).toEqual({
      checkInFilter: 'checked-in',
      checkInReviewOnly: true,
      panelFocus: 'qna',
    });
  });

  it('drops malformed operator focus state safely', () => {
    expect(normalizeCoordinatorModeSessionState({
      checkInFilter: 'bogus',
      checkInReviewOnly: 'yes',
      panelFocus: 'alerts',
    })).toEqual({
      checkInFilter: 'arrivals',
      checkInReviewOnly: false,
      panelFocus: null,
    });
  });
});
