import { describe, expect, it } from 'vitest';
import { getCoordinatorSummaryFeedbackLayout } from './coordinatorSummaryFeedbackLayout';

describe('coordinatorSummaryFeedbackLayout', () => {
  it('maps live signal kinds to clearer layout weights', () => {
    expect(getCoordinatorSummaryFeedbackLayout('transition')).toBe('prominent');
    expect(getCoordinatorSummaryFeedbackLayout('jump')).toBe('standard');
    expect(getCoordinatorSummaryFeedbackLayout('realignment')).toBe('compact');
  });
});
