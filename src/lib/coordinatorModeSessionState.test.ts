import { describe, expect, it } from 'vitest';
import { normalizeCoordinatorModeSessionState } from './coordinatorModeSessionState';

describe('coordinatorModeSessionState', () => {
  it('restores valid operator focus state', () => {
    expect(normalizeCoordinatorModeSessionState({
      checkInFilter: 'checked-in',
      checkInQuery: 'alex',
      checkInReviewOnly: true,
      panelFocus: 'qna',
      alertChannelFilter: 'sms',
      alertTimingFilter: 'scheduled',
    })).toEqual({
      checkInFilter: 'checked-in',
      checkInQuery: 'alex',
      checkInReviewOnly: true,
      panelFocus: 'qna',
      alertChannelFilter: 'sms',
      alertTimingFilter: 'scheduled',
    });
  });

  it('drops malformed operator focus state safely', () => {
    expect(normalizeCoordinatorModeSessionState({
      checkInFilter: 'bogus',
      checkInQuery: 42,
      checkInReviewOnly: 'yes',
      panelFocus: 'alerts',
      alertChannelFilter: 'push',
      alertTimingFilter: 'later',
    })).toEqual({
      checkInFilter: 'arrivals',
      checkInQuery: '',
      checkInReviewOnly: false,
      panelFocus: null,
      alertChannelFilter: 'all',
      alertTimingFilter: 'all',
    });
  });
});
