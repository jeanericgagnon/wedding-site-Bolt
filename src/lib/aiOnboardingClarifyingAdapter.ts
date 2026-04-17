import type { InitialSetupAnswers } from './initialSetupAnswers';
import type { OnboardingSessionState } from './aiOnboarding';
import { generateClarifyingQuestionDecision, type ClarifyingQuestionInput, type ClarifyingQuestionDecision } from './aiClarifyingQuestions';
import type { ClarifyingPersistenceEnvelope, StoredClarifyingQuestion } from './aiClarifyingPersistence';
import { createEmptyClarifyingPersistence } from './aiClarifyingPersistence';

const splitWeekendEvents = (raw: string) => raw
  .split(/\n|,|;/)
  .map((part) => part.trim())
  .filter(Boolean)
  .filter((part) => !/^(maybe|tbd|unknown)$/i.test(part));

const expandEventStructureQuestions = (decision: ClarifyingQuestionDecision, answers: InitialSetupAnswers): ClarifyingQuestionDecision => {
  const baseEventQuestion = decision.questions.find((question) => question.category === 'event_structure');
  if (!baseEventQuestion) return decision;

  const events = splitWeekendEvents(answers.weekendEventsRaw);
  if (!events.length) return decision;

  const expandedQuestions = events.flatMap((event, index) => {
    const title = event.replace(/^(friday|saturday|sunday|thursday|monday)\s+/i, '').trim() || event;
    return [
      {
        ...baseEventQuestion,
        id: `${baseEventQuestion.id || 'event-structure'}-${index + 1}-time`,
        question: `${title}: what time is it?`,
        targetFields: [`events.${index}.time`],
        affectedSections: ['schedule'],
      },
      {
        ...baseEventQuestion,
        id: `${baseEventQuestion.id || 'event-structure'}-${index + 1}-location`,
        question: `${title}: where is it happening?`,
        targetFields: [`events.${index}.location`],
        affectedSections: ['schedule', 'travel'],
      },
    ];
  });

  return {
    ...decision,
    questions: [
      ...decision.questions.filter((question) => question !== baseEventQuestion),
      ...expandedQuestions,
    ].slice(0, 6),
  };
};

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
  const decision = await generateClarifyingQuestionDecision(toClarifyingInputFromInitialSetup(answers));
  return expandEventStructureQuestions(decision, answers);
};

export const attachEmptyClarifyingPersistence = (session: OnboardingSessionState) => ({
  ...session,
  clarifying: createEmptyClarifyingPersistence(),
});
