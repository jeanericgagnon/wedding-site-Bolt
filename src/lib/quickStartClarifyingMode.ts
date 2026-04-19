import type { ClarifyingPersistenceEnvelope } from './aiClarifyingPersistence';

export const normalizeQuickStartClarifyingMode = (
  clarifyingState: ClarifyingPersistenceEnvelope | null,
): ClarifyingPersistenceEnvelope | null => {
  if (!clarifyingState) return null;

  const hasQuestions = clarifyingState.clarifying.questions.length > 0;
  const normalizedMode = hasQuestions ? 'ask' : 'draft';

  return {
    ...clarifyingState,
    clarifying: {
      ...clarifyingState.clarifying,
      mode: normalizedMode,
    },
  };
};
