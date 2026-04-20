import { describe, expect, it } from 'vitest';
import { getCoordinatorCheckInBoardTargetId, getCoordinatorCheckInTargetState } from './coordinatorCheckInTargetState';

describe('coordinatorCheckInTargetState', () => {
  it('picks the first door-review guest as the board target', () => {
    expect(getCoordinatorCheckInBoardTargetId([
      { id: 'a', name: 'A', rsvp_status: 'yes', checked_in_at: '2026-04-20T10:00:00Z' },
      { id: 'b', name: 'B', rsvp_status: 'maybe', checked_in_at: null },
      { id: 'c', name: 'C', rsvp_status: 'yes', checked_in_at: null },
    ] as never[])).toBe('b');
  });

  it('distinguishes working the board target from a custom active guest', () => {
    expect(getCoordinatorCheckInTargetState({ boardTargetId: 'b', activeGuestId: 'b' })).toEqual({
      boardTargetId: 'b',
      activeGuestId: 'b',
      isBoardTargetActive: true,
      label: 'Working board target',
    });

    expect(getCoordinatorCheckInTargetState({ boardTargetId: 'b', activeGuestId: 'c' }).label).toBe('Board target available');
    expect(getCoordinatorCheckInTargetState({ boardTargetId: null, activeGuestId: 'c' }).label).toBe('Working custom guest');
  });
});
