import type { CoordinatorQnaItem } from './coordinatorModePersistence';

export const getFirstOpenCoordinatorQnaId = (items: CoordinatorQnaItem[]) => (
  items.find((item) => item.status === 'new')?.id ?? null
);

export const getNextCoordinatorQnaFocusId = (
  items: CoordinatorQnaItem[],
  currentId: string,
) => {
  const openItems = items.filter((item) => item.status === 'new');
  return openItems.find((item) => item.id !== currentId)?.id ?? null;
};
