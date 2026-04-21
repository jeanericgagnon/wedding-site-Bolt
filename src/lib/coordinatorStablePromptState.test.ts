import { describe, expect, it } from 'vitest';
import { getCoordinatorStablePromptState } from './coordinatorStablePromptState';

describe('coordinatorStablePromptState', () => {
  it('marks the stable prompt as in focus when the operator is already on the winning surface', () => {
    expect(getCoordinatorStablePromptState({ priority: 'Check-in', panelFocus: 'check-in' })).toBe('In focus');
    expect(getCoordinatorStablePromptState({ priority: 'Timeline', panelFocus: 'timeline' })).toBe('In focus');
    expect(getCoordinatorStablePromptState({ priority: 'Q&A', panelFocus: 'qna' })).toBe('In focus');
    expect(getCoordinatorStablePromptState({ priority: 'Alerting', panelFocus: null })).toBe('In focus');
  });

  it('stays actionable when the operator is not on the winning surface yet', () => {
    expect(getCoordinatorStablePromptState({ priority: 'Check-in', panelFocus: 'timeline' })).toBeNull();
  });
});
