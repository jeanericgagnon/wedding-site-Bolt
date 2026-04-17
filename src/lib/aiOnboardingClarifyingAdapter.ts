import type { InitialSetupAnswers } from './initialSetupAnswers';
import type { OnboardingSessionState } from './aiOnboarding';
import { generateClarifyingQuestionDecision, type ClarifyingQuestionInput, type ClarifyingQuestionDecision } from './aiClarifyingQuestions';
import type { ClarifyingPersistenceEnvelope, StoredClarifyingQuestion } from './aiClarifyingPersistence';
import { createEmptyClarifyingPersistence } from './aiClarifyingPersistence';

const toClarifyingInputFromInitialSetup = (answers: InitialSetupAnswers): ClarifyingQuestionInput => ({
  intakeSummary: JSON.stringify(answers),
  knownResolved: Object.entries(answers)
    .filter(([, value]) => typeof value === 'string' ? value.trim().length > 0 : Boolean(value))
    .map(([key]) => key),
  knownUnresolved: Object.entries(answers)
    .filter(([, value]) => typeof value === 'string' ? value.trim().length === 0 : !value)
    .map(([key]) => key),
  readinessSummary: 'Use the structured setup answers to decide whether to ask clarifying questions or return draft outputs.',
});

const toStoredClarifyingQuestions = (decision: ClarifyingQuestionDecision, round = 1): StoredClarifyingQuestion[] =>
  decision.questions.map((question) => ({
    ...question,
    round,
    status: 'pending',
    answer: '',
  }));

export const createClarifyingPersistenceFromDecision = (
  decision: ClarifyingQuestionDecision,
  round = 1,
): ClarifyingPersistenceEnvelope => ({
  clarifying: {
    mode: decision.mode,
    questions: toStoredClarifyingQuestions(decision, round),
    history: [],
  },
  draftOutputs: decision.draftOutputs || {},
});

export const createClarifyingDecisionFromInitialSetup = async (answers: InitialSetupAnswers) => {
  return generateClarifyingQuestionDecision(toClarifyingInputFromInitialSetup(answers));
};

export const attachEmptyClarifyingPersistence = (session: OnboardingSessionState) => ({
  ...session,
  clarifying: createEmptyClarifyingPersistence(),
});
