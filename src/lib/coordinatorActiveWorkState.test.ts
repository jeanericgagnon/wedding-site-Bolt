import { describe, expect, it } from 'vitest';
import { normalizeCoordinatorActiveWorkState } from './coordinatorActiveWorkState';

describe('coordinatorActiveWorkState', () => {
  it('restores a valid active q&a target', () => {
    expect(normalizeCoordinatorActiveWorkState({ activeQnaId: 'q_123' })).toEqual({ activeQnaId: 'q_123' });
  });

  it('drops malformed active work state safely', () => {
    expect(normalizeCoordinatorActiveWorkState({ activeQnaId: '' })).toEqual({ activeQnaId: null });
    expect(normalizeCoordinatorActiveWorkState(null)).toEqual({ activeQnaId: null });
  });
});
