import type { ClarifyingPersistenceEnvelope, StoredClarifyingQuestion } from './aiClarifyingPersistence';
import { mapClarifyingAnswerToFieldPatch, mergeClarifyingFieldPatches, type ClarifyingFieldPatch } from './aiClarifyingAnswerMapper';

export const answerClarifyingQuestion = (
  persistence: ClarifyingPersistenceEnvelope,
  questionId: string,
  answer: string,
  status: 'answered' | 'skipped' | 'unresolved' = 'answered',
) => {
  const questions = persistence.clarifying.questions.map((question) =>
    question.id === questionId
      ? { ...question, answer, status }
      : question
  );

  const history = [
    ...persistence.clarifying.history,
    ...questions.filter((question) => question.id === questionId),
  ];

  return {
    ...persistence,
    clarifying: {
      ...persistence.clarifying,
      questions,
      history,
    },
  };
};

export const buildClarifyingAnswerPatchSet = (persistence: ClarifyingPersistenceEnvelope): ClarifyingFieldPatch => {
  const answeredQuestions = persistence.clarifying.questions.filter(
    (question): question is StoredClarifyingQuestion => question.status === 'answered' && Boolean(question.answer.trim())
  );

  return mergeClarifyingFieldPatches(answeredQuestions.map(mapClarifyingAnswerToFieldPatch));
};
