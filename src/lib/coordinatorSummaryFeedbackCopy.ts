import type { CoordinatorSummaryFeedback } from './coordinatorSummaryFeedback';

export const getCoordinatorSummaryFeedbackCopy = ({
  kind,
  label,
}: Pick<CoordinatorSummaryFeedback, 'kind' | 'label'>) => {
  if (kind !== 'realignment') {
    return label;
  }

  return label
    .replace(' re-aligned to board target', ' back on target')
    .replace('Q&A', 'Q&A');
};
