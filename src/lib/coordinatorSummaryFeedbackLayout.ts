import type { CoordinatorSummaryFeedback } from './coordinatorSummaryFeedback';

export const getCoordinatorSummaryFeedbackLayout = (kind: CoordinatorSummaryFeedback['kind']) => {
  switch (kind) {
    case 'transition':
      return 'prominent';
    case 'jump':
      return 'standard';
    case 'realignment':
    default:
      return 'compact';
  }
};
