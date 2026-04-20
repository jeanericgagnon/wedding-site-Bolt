import { describe, expect, it } from 'vitest';
import { normalizeCoordinatorGuestWorkState } from './coordinatorGuestWorkState';

describe('coordinatorGuestWorkState', () => {
  it('restores a valid active guest target', () => {
    expect(normalizeCoordinatorGuestWorkState({ activeGuestId: 'guest_123' })).toEqual({ activeGuestId: 'guest_123' });
  });

  it('drops malformed guest work state safely', () => {
    expect(normalizeCoordinatorGuestWorkState({ activeGuestId: '' })).toEqual({ activeGuestId: null });
    expect(normalizeCoordinatorGuestWorkState(null)).toEqual({ activeGuestId: null });
  });
});
