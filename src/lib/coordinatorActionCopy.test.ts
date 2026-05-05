import { describe, expect, it } from 'vitest';
import { getCoordinatorActionHint } from './coordinatorActionCopy';

describe('coordinatorActionCopy', () => {
  it('returns action-specific click guidance for live command cards', () => {
    expect(getCoordinatorActionHint('primary')).toContain('highest-priority next step');
    expect(getCoordinatorActionHint('escalation')).toContain('resolve this issue fastest');
    expect(getCoordinatorActionHint('correction')).toContain('recovery step');
    expect(getCoordinatorActionHint('neutral-focus')).toContain('recommended neutral board focus');
  });
});
