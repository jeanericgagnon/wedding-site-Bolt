import type { CoordinatorSummaryFeedback } from './coordinatorSummaryFeedback';

export const getCoordinatorSummaryFeedbackTone = (kind: CoordinatorSummaryFeedback['kind']) => {
  switch (kind) {
    case 'jump':
      return {
        badge: 'Jump',
        containerClassName: 'border-primary/20 bg-primary/[0.04] text-primary',
      };
    case 'transition':
      return {
        badge: 'Transition',
        containerClassName: 'border-amber-200 bg-amber-50 text-amber-800',
      };
    case 'realignment':
    default:
      return {
        badge: 'Back on target',
        containerClassName: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      };
  }
};
