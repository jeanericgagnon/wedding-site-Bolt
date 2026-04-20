import { describe, expect, it } from 'vitest';
import { getCoordinatorQnaTargetState } from './coordinatorQnaTargetState';

describe('coordinatorQnaTargetState', () => {
  it('marks when the operator is working the board question', () => {
    expect(getCoordinatorQnaTargetState({ boardTargetId: 'q1', activeQnaId: 'q1' })).toEqual({
      boardTargetId: 'q1',
      activeQnaId: 'q1',
      isBoardTargetActive: true,
      label: 'Working board question',
    });
  });

  it('distinguishes board-available versus custom question work', () => {
    expect(getCoordinatorQnaTargetState({ boardTargetId: 'q1', activeQnaId: 'q2' }).label).toBe('Board question available');
    expect(getCoordinatorQnaTargetState({ boardTargetId: null, activeQnaId: 'q2' }).label).toBe('Working custom question');
  });
});
