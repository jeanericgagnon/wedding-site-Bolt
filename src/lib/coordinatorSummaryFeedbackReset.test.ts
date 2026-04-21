import { describe, expect, it } from 'vitest';
import { shouldResetCoordinatorSummaryFeedback } from './coordinatorSummaryFeedbackReset';

describe('coordinatorSummaryFeedbackReset', () => {
  it('clears summary feedback when the operator leaves the panel it referred to', () => {
    expect(shouldResetCoordinatorSummaryFeedback({
      feedbackLabel: 'Check-in re-aligned to board target',
      panelFocus: 'timeline',
      expectedPanelFocus: 'check-in',
      currentTargetId: 'event-1',
      expectedTargetId: 'guest-1',
    })).toBe(true);
  });

  it('clears summary feedback when the operator changes target after the confirmation', () => {
    expect(shouldResetCoordinatorSummaryFeedback({
      feedbackLabel: 'Q&A re-aligned to board target',
      panelFocus: 'qna',
      expectedPanelFocus: 'qna',
      currentTargetId: 'q-2',
      expectedTargetId: 'q-1',
    })).toBe(true);
  });

  it('keeps summary feedback while the operator is still on the confirmed target', () => {
    expect(shouldResetCoordinatorSummaryFeedback({
      feedbackLabel: 'Timeline re-aligned to board target',
      panelFocus: 'timeline',
      expectedPanelFocus: 'timeline',
      currentTargetId: 'event-1',
      expectedTargetId: 'event-1',
    })).toBe(false);
  });
});
