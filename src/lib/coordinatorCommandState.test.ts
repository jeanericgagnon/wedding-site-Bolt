import { describe, expect, it } from 'vitest';
import { normalizeCoordinatorCommandState } from './coordinatorCommandState';

describe('coordinatorCommandState', () => {
  it('restores a valid command posture', () => {
    expect(normalizeCoordinatorCommandState({
      source: 'correction',
      panelFocus: 'check-in',
      checkInFilter: 'checked-in',
      checkInReviewOnly: false,
    })).toEqual({
      source: 'correction',
      panelFocus: 'check-in',
      checkInFilter: 'checked-in',
      checkInReviewOnly: false,
    });
  });

  it('drops malformed command posture safely', () => {
    expect(normalizeCoordinatorCommandState({
      source: 'weird',
      panelFocus: 'alerts',
      checkInFilter: 'bad',
      checkInReviewOnly: 'yes',
    })).toEqual({
      source: null,
      panelFocus: null,
      checkInFilter: 'arrivals',
      checkInReviewOnly: false,
    });
  });
});
