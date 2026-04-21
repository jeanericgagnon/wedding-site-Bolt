import { describe, expect, it } from 'vitest';
import { createCoordinatorSummaryFeedback } from './coordinatorSummaryFeedback';

describe('coordinatorSummaryFeedback', () => {
  it('creates a normalized summary feedback record', () => {
    expect(createCoordinatorSummaryFeedback({
      label: 'Timeline re-aligned to board target',
      panelFocus: 'timeline',
      targetId: 'event-1',
      kind: 'realignment',
    })).toEqual({
      label: 'Timeline re-aligned to board target',
      panelFocus: 'timeline',
      targetId: 'event-1',
      kind: 'realignment',
    });
  });
});
