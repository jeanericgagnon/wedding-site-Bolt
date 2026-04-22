import type { ClarifyingPersistenceEnvelope, StoredClarifyingQuestion } from './aiClarifyingPersistence';

const dedupeQuestionsById = (questions: StoredClarifyingQuestion[]) => {
  const byId = new Map<string, StoredClarifyingQuestion>();
  questions.forEach((item) => {
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
      questions: dedupeQuestionsById(clarifyingState.clarifying.questions),
      history: dedupeQuestionsById(clarifyingState.clarifying.history),
    },
  };
};
