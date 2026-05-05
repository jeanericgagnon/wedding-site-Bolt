import { describe, expect, it } from 'vitest';
import { getCoordinatorQnaTargetState } from './coordinatorQnaTargetState';

describe('coordinatorQnaTargetState', () => {
  it('marks when the suggested question is active', () => {
    expect(getCoordinatorQnaTargetState({ boardTargetId: 'q1', activeQnaId: 'q1' })).toEqual({
      boardTargetId: 'q1',
      activeQnaId: 'q1',
      isBoardTargetActive: true,
      label: 'Suggested question in progress',
    });
  });

  it('distinguishes suggested versus selected question work', () => {
    expect(getCoordinatorQnaTargetState({ boardTargetId: 'q1', activeQnaId: 'q2' }).label).toBe('Suggested question waiting');
    expect(getCoordinatorQnaTargetState({ boardTargetId: null, activeQnaId: 'q2' }).label).toBe('Selected question in progress');
  });
});
