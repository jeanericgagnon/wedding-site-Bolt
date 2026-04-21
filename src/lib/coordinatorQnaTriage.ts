import type { CoordinatorQnaItem } from './coordinatorModePersistence';

export type CoordinatorQnaFilter = 'open' | 'answered' | 'all';

export const filterCoordinatorQnaItems = (
  items: CoordinatorQnaItem[],
  filter: CoordinatorQnaFilter,
) => {
  if (filter === 'open') return items.filter((item) => item.status === 'new');
  if (filter === 'answered') return items.filter((item) => item.status === 'answered');
  return items;
};

export const getCoordinatorQnaDraftStateLabel = ({
  draftAnswer,
  savedAnswer,
}: {
  draftAnswer: string;
  savedAnswer: string | null | undefined;
}) => {
  const draft = draftAnswer.trim();
  const saved = (savedAnswer ?? '').trim();
  if (!draft && !saved) return 'No draft yet';
  if (draft === saved) return saved ? 'Answer saved' : 'Ready to reopen';
  return draft ? 'Unsaved reply' : 'Draft cleared';
};
