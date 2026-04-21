import { describe, expect, it } from 'vitest';
import { getCoordinatorSummaryFeedbackBadge } from './coordinatorSummaryFeedbackBadge';

describe('coordinatorSummaryFeedbackBadge', () => {
  it('adds lightweight target context to summary feedback badges', () => {
    expect(getCoordinatorSummaryFeedbackBadge({ kind: 'jump', panelFocus: 'check-in' })).toBe('Jump · Guest');
    expect(getCoordinatorSummaryFeedbackBadge({ kind: 'transition', panelFocus: 'timeline' })).toBe('Transition · Event');
    expect(getCoordinatorSummaryFeedbackBadge({ kind: 'realignment', panelFocus: 'qna' })).toBe('Back on target · Question');
  });

  it('falls back cleanly when no specific target surface exists', () => {
    expect(getCoordinatorSummaryFeedbackBadge({ kind: 'jump', panelFocus: null })).toBe('Jump · Board');
  });
});
