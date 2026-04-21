import { describe, expect, it } from 'vitest';
import { getCoordinatorStablePromptTargetLabel } from './coordinatorStablePromptTargetLabel';

describe('coordinatorStablePromptTargetLabel', () => {
  it('adds lightweight target identity to the stable prompt', () => {
    expect(getCoordinatorStablePromptTargetLabel({ priority: 'Check-in', targetName: 'Alex Rivera' })).toBe('Guest · Alex Rivera');
    expect(getCoordinatorStablePromptTargetLabel({ priority: 'Timeline', targetName: 'Ceremony' })).toBe('Event · Ceremony');
    expect(getCoordinatorStablePromptTargetLabel({ priority: 'Q&A', targetName: 'Where should we park?' })).toBe('Question · Where should we park?');
    expect(getCoordinatorStablePromptTargetLabel({ priority: 'Alerting', targetName: 'Live event update' })).toBe('Lane · Live event update');
  });

  it('stays quiet when no target name is available', () => {
    expect(getCoordinatorStablePromptTargetLabel({ priority: 'Check-in', targetName: null })).toBeNull();
  });
});
