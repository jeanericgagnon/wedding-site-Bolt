import type { ClarifyingPersistenceEnvelope } from './aiClarifyingPersistence';

export const deriveFollowUpAnswersFromClarifyingState = (
  clarifyingState: ClarifyingPersistenceEnvelope | null,
  fallback: Record<string, string>,
) => {
  const normalizedFallback = Object.fromEntries(
    Object.entries(fallback).filter(([key, value]) => key.trim().length > 0 && value.trim().length > 0),
  );

  if (!clarifyingState) return normalizedFallback;

  const derivedFromHistory = clarifyingState.clarifying.history.reduce<Record<string, string>>((acc, question) => {
    if (question.answer?.trim()) {
      acc[question.id] = question.answer;
    }
    return acc;
  }, {});

  const derivedFromActiveQuestions = clarifyingState.clarifying.questions.reduce<Record<string, string>>((acc, question) => {
    if (question.answer?.trim()) {
      acc[question.id] = question.answer;
    }
    return acc;
  }, {});

  return {
    ...normalizedFallback,
    ...derivedFromHistory,
    ...derivedFromActiveQuestions,
  };
};
