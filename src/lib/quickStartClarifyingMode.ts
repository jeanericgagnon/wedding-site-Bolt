import type { ClarifyingPersistenceEnvelope } from './aiClarifyingPersistence';

export const normalizeQuickStartClarifyingMode = (
  clarifyingState: ClarifyingPersistenceEnvelope | null,
): ClarifyingPersistenceEnvelope | null => {
  if (!clarifyingState) return null;

  const hasUnansweredQuestions = clarifyingState.clarifying.questions.some((question) => (
    question.status === 'pending' || question.status === 'unresolved'
  ));
  const normalizedMode = hasUnansweredQuestions ? 'ask' : 'draft';

  return {
    ...clarifyingState,
    clarifying: {
      ...clarifyingState.clarifying,
      mode: normalizedMode,
    },
  };
};
