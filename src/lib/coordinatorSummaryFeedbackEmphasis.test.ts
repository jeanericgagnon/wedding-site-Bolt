import { describe, expect, it } from 'vitest';
import { getCoordinatorSummaryFeedbackEmphasis } from './coordinatorSummaryFeedbackEmphasis';

describe('coordinatorSummaryFeedbackEmphasis', () => {
  it('maps live signal kinds to compact emphasis levels', () => {
    expect(getCoordinatorSummaryFeedbackEmphasis('transition')).toBe('strong');
    expect(getCoordinatorSummaryFeedbackEmphasis('jump')).toBe('medium');
    expect(getCoordinatorSummaryFeedbackEmphasis('realignment')).toBe('soft');
  });
});
