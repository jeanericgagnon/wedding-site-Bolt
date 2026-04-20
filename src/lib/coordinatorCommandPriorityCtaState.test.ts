import { describe, expect, it } from 'vitest';
import { getCoordinatorCommandPriorityCtaState } from './coordinatorCommandPriorityCtaState';

describe('coordinatorCommandPriorityCtaState', () => {
  it('marks the priority CTA as already in focus when the board is centered on that surface', () => {
    expect(getCoordinatorCommandPriorityCtaState({ priority: 'Check-in', panelFocus: 'check-in' })).toBe('In focus');
    expect(getCoordinatorCommandPriorityCtaState({ priority: 'Timeline', panelFocus: 'timeline' })).toBe('In focus');
    expect(getCoordinatorCommandPriorityCtaState({ priority: 'Q&A', panelFocus: 'qna' })).toBe('In focus');
    expect(getCoordinatorCommandPriorityCtaState({ priority: 'Alerting', panelFocus: null })).toBe('In focus');
  });

  it('stays neutral when the winning priority is not the current board focus', () => {
    expect(getCoordinatorCommandPriorityCtaState({ priority: 'Check-in', panelFocus: 'timeline' })).toBeNull();
  });
});
