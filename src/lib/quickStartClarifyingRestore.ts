import type { ClarifyingPersistenceEnvelope } from './aiClarifyingPersistence';

export const deriveFollowUpAnswersFromClarifyingState = (
  clarifyingState: ClarifyingPersistenceEnvelope | null,
  fallback: Record<string, string>,
) => {
  if (!clarifyingState) return fallback;

  const derived = clarifyingState.clarifying.questions.reduce<Record<string, string>>((acc, question) => {
    if (question.answer?.trim()) {
      acc[question.id] = question.answer;
    }
    return acc;
  }, {});

  return {
    ...fallback,
    ...derived,
  };
};
