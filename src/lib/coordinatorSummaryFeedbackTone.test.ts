import { describe, expect, it } from 'vitest';
import { getCoordinatorSummaryFeedbackTone } from './coordinatorSummaryFeedbackTone';

describe('coordinatorSummaryFeedbackTone', () => {
  it('maps summary feedback kinds to distinct operator-facing tones', () => {
    expect(getCoordinatorSummaryFeedbackTone('jump')).toEqual({
      badge: 'Jump',
      containerClassName: 'border-primary/20 bg-primary/[0.04] text-primary',
    });

    expect(getCoordinatorSummaryFeedbackTone('transition')).toEqual({
      badge: 'Transition',
      containerClassName: 'border-amber-200 bg-amber-50 text-amber-800',
    });

    expect(getCoordinatorSummaryFeedbackTone('realignment')).toEqual({
      badge: 'Back on target',
      containerClassName: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    });
  });
});
