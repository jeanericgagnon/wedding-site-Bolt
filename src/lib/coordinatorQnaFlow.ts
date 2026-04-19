import type { CoordinatorQnaItem } from './coordinatorModePersistence';

export const buildCoordinatorQnaAnswerPatch = (answer: string) => {
  const trimmed = answer.trim();
  return {
    answer: trimmed || null,
    status: (trimmed ? 'answered' : 'new') as CoordinatorQnaItem['status'],
  };
};

export const updateCoordinatorQnaItem = (
  items: CoordinatorQnaItem[],
  id: string,
  answer: string,
) => {
  const patch = buildCoordinatorQnaAnswerPatch(answer);
  return items.map((item) => item.id === id ? { ...item, ...patch } : item);
};

export const getCoordinatorQnaCounts = (items: CoordinatorQnaItem[]) => ({
  open: items.filter((item) => item.status === 'new').length,
  answered: items.filter((item) => item.status === 'answered').length,
});
