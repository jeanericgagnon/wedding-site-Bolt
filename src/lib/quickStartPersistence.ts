import { createEmptyInitialSetupAnswers, type InitialSetupAnswers } from './initialSetupAnswers';
import type { ClarifyingPersistenceEnvelope, StoredClarifyingQuestion } from './aiClarifyingPersistence';
import { normalizeQuickStartClarifyingMode } from './quickStartClarifyingMode';
import { normalizeQuickStartClarifyingState } from './quickStartClarifyingNormalize';

export type QuickStartDraftSnapshot = {
  initialSetupAnswers: InitialSetupAnswers;
  currentIndex: number;
  followUpAnswers: Record<string, string>;
  showFollowUps: boolean;
  clarifyingState: ClarifyingPersistenceEnvelope | null;
  viewState: 'question' | 'thinking' | 'followups';
};

export const normalizeQuickStartDraftSnapshot = (value: unknown): QuickStartDraftSnapshot => {
  const base: QuickStartDraftSnapshot = {
    initialSetupAnswers: createEmptyInitialSetupAnswers(),
    currentIndex: 0,
    followUpAnswers: {},
    showFollowUps: false,
    clarifyingState: null,
    viewState: 'question',
  };

  if (!value || typeof value !== 'object') return base;
  const parsed = value as Partial<QuickStartDraftSnapshot>;

  const followUpAnswers = parsed.followUpAnswers && typeof parsed.followUpAnswers === 'object' && !Array.isArray(parsed.followUpAnswers)
    ? Object.fromEntries(
        Object.entries(parsed.followUpAnswers)
          .filter(([key, val]) => key.trim().length > 0 && typeof val === 'string' && val.trim().length > 0)
          .map(([key, val]) => [key.trim(), val.trim()]),
      )
    : {};

  const allowedInitialSetupValues: Partial<Record<keyof InitialSetupAnswers, readonly string[]>> = {
    labelPreference: ['names-only', 'bride-groom', 'bride-bride', 'groom-groom', 'custom'],
    guestCountBand: ['under-50', '50-100', '100-150', '150-250', '250-plus', ''],
    plusOnePolicy: ['none', 'some', 'all', ''],
    childrenAllowed: ['yes', 'no', 'unsure', ''],
    mealChoice: ['yes', 'no', ''],
    registryIntent: ['cash', 'gifts', 'both', 'unsure', 'none-for-now', ''],
  };

  const initialSetupAnswers = parsed.initialSetupAnswers && typeof parsed.initialSetupAnswers === 'object' && !Array.isArray(parsed.initialSetupAnswers)
    ? Object.fromEntries(
        Object.entries(parsed.initialSetupAnswers).flatMap(([key, val]) => {
          if (typeof val !== 'string') return [];
          const trimmedValue = val.trim();
          const allowedValues = allowedInitialSetupValues[key as keyof InitialSetupAnswers];
          return !allowedValues || allowedValues.includes(trimmedValue) ? [[key, trimmedValue]] : [];
        }),
      ) as Partial<InitialSetupAnswers>
    : {};

  const isStoredClarifyingQuestion = (value: unknown): value is StoredClarifyingQuestion => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const question = value as Record<string, unknown>;
    return typeof question.id === 'string'
      && question.id.trim().length > 0
      && typeof question.category === 'string'
      && question.category.trim().length > 0
      && typeof question.question === 'string'
      && question.question.trim().length > 0
      && typeof question.expectedAnswerType === 'string'
      && question.expectedAnswerType.trim().length > 0
      && Array.isArray(question.targetFields)
      && question.targetFields.every((field) => typeof field === 'string' && field.trim().length > 0)
      && Array.isArray(question.affectedSections)
      && question.affectedSections.every((section) => typeof section === 'string' && section.trim().length > 0)
      && typeof question.skippable === 'boolean'
      && typeof question.round === 'number'
      && Number.isFinite(question.round)
      && Number.isInteger(question.round)
      && typeof question.status === 'string'
      && ['pending', 'answered', 'skipped', 'unresolved'].includes(question.status)
      && typeof question.answer === 'string';
  };

  const clarifyingState = normalizeQuickStartClarifyingMode(normalizeQuickStartClarifyingState(
    parsed.clarifyingState
      && typeof parsed.clarifyingState === 'object'
      && !Array.isArray(parsed.clarifyingState)
      && 'clarifying' in parsed.clarifyingState
      && parsed.clarifyingState.clarifying
      && typeof parsed.clarifyingState.clarifying === 'object'
      && !Array.isArray(parsed.clarifyingState.clarifying)
      && Array.isArray(parsed.clarifyingState.clarifying.questions)
      && Array.isArray(parsed.clarifyingState.clarifying.history)
      && 'draftOutputs' in parsed.clarifyingState
      && parsed.clarifyingState.draftOutputs
      && typeof parsed.clarifyingState.draftOutputs === 'object'
      && !Array.isArray(parsed.clarifyingState.draftOutputs)
        ? {
            ...parsed.clarifyingState,
            clarifying: {
              ...parsed.clarifyingState.clarifying,
              questions: parsed.clarifyingState.clarifying.questions
                .filter(isStoredClarifyingQuestion)
                .map((question) => ({
                  ...question,
                  id: question.id.trim(),
                  category: question.category.trim(),
                  question: question.question.trim(),
                  expectedAnswerType: question.expectedAnswerType.trim(),
                  targetFields: question.targetFields.map((field) => field.trim()),
                  affectedSections: question.affectedSections.map((section) => section.trim()),
                  answer: question.answer.trim(),
                })),
              history: parsed.clarifyingState.clarifying.history
                .filter(isStoredClarifyingQuestion)
                .map((question) => ({
                  ...question,
                  id: question.id.trim(),
                  category: question.category.trim(),
                  question: question.question.trim(),
                  expectedAnswerType: question.expectedAnswerType.trim(),
                  targetFields: question.targetFields.map((field) => field.trim()),
                  affectedSections: question.affectedSections.map((section) => section.trim()),
                  answer: question.answer.trim(),
                })),
            },
          } as ClarifyingPersistenceEnvelope
        : null,
  ));

  const viewState = parsed.viewState === 'thinking' || parsed.viewState === 'followups' ? parsed.viewState : 'question';
  const hasOpenFollowUps = (clarifyingState?.clarifying.questions.some((question) => question.status !== 'answered') || false);
  const showFollowUps = parsed.showFollowUps === true && hasOpenFollowUps;

  return {
    initialSetupAnswers: { ...base.initialSetupAnswers, ...initialSetupAnswers },
    currentIndex: typeof parsed.currentIndex === 'number' && Number.isFinite(parsed.currentIndex) && Number.isInteger(parsed.currentIndex) && parsed.currentIndex >= 0
      ? parsed.currentIndex
      : 0,
    followUpAnswers,
    showFollowUps,
    clarifyingState,
    viewState: viewState === 'followups' && !hasOpenFollowUps ? 'question' : viewState,
  };
};
