import type { CoordinatorSummaryFeedback } from './coordinatorSummaryFeedback';

export const getCoordinatorSummaryFeedbackBadge = ({
  kind,
  panelFocus,
}: Pick<CoordinatorSummaryFeedback, 'kind' | 'panelFocus'>) => {
  const targetLabel = panelFocus === 'check-in'
    ? 'Guest'
    : panelFocus === 'timeline'
      ? 'Event'
      : panelFocus === 'qna'
        ? 'Question'
        : panelFocus === null
          ? 'Board'
          : null;

  const base = kind === 'jump'
    ? 'Jump'
    : kind === 'transition'
      ? 'Transition'
      : 'Back on target';

  return targetLabel ? `${base} · ${targetLabel}` : base;
};
