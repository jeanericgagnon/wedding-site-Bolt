import { describe, expect, it } from 'vitest';
import { NAME_CHANGE_LIFECYCLE_LABELS } from './nameChangeLifecycleLabels';

describe('NAME_CHANGE_LIFECYCLE_LABELS', () => {
  it('keeps dashboard and planner lifecycle headings aligned', () => {
    expect(NAME_CHANGE_LIFECYCLE_LABELS).toEqual({
      coreChain: 'Core chain',
      followOn: 'Milestone confirmations',
      downstream: 'Reminder follow-through',
    });
  });
});
