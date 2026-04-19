import { describe, expect, it } from 'vitest';
import { resolveCoordinatorPanelFocus } from './coordinatorPanelFocus';

describe('coordinatorPanelFocus', () => {
  it('maps each live escalation to the right command panel', () => {
    expect(resolveCoordinatorPanelFocus('door-review')).toBe('check-in');
    expect(resolveCoordinatorPanelFocus('open-qna')).toBe('qna');
    expect(resolveCoordinatorPanelFocus('timeline-live')).toBe('timeline');
  });

  it('returns null for non-actionable escalation keys', () => {
    expect(resolveCoordinatorPanelFocus('all-clear')).toBeNull();
    expect(resolveCoordinatorPanelFocus(null)).toBeNull();
  });
});
