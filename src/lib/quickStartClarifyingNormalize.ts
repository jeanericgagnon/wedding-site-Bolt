import type { ClarifyingPersistenceEnvelope, StoredClarifyingQuestion } from './aiClarifyingPersistence';

const dedupeQuestionHistory = (history: StoredClarifyingQuestion[]) => {
  const byId = new Map<string, StoredClarifyingQuestion>();
  history.forEach((item) => {
    byId.set(item.id, item);
  });
  return Array.from(byId.values());
};

export const normalizeQuickStartClarifyingState = (
  clarifyingState: ClarifyingPersistenceEnvelope | null,
): ClarifyingPersistenceEnvelope | null => {
  if (!clarifyingState) return null;

  return {
    ...clarifyingState,
    clarifying: {
      ...clarifyingState.clarifying,
      history: dedupeQuestionHistory(clarifyingState.clarifying.history),
    },
  };
};
