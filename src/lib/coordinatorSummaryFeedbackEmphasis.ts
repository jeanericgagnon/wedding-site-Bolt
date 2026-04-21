import type { CoordinatorSummaryFeedback } from './coordinatorSummaryFeedback';

export const getCoordinatorSummaryFeedbackEmphasis = (kind: CoordinatorSummaryFeedback['kind']) => {
  switch (kind) {
    case 'transition':
      return 'strong';
    case 'jump':
      return 'medium';
    case 'realignment':
    default:
      return 'soft';
  }
};
