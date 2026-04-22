import { createEmptyInitialSetupAnswers, type InitialSetupAnswers } from './initialSetupAnswers';
import type { ClarifyingPersistenceEnvelope } from './aiClarifyingPersistence';
import { normalizeQuickStartClarifyingMode } from './quickStartClarifyingMode';

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

  const clarifyingState = normalizeQuickStartClarifyingMode(
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
        ? parsed.clarifyingState as ClarifyingPersistenceEnvelope
        : null,
  );

  const viewState = parsed.viewState === 'thinking' || parsed.viewState === 'followups' ? parsed.viewState : 'question';
  const hasOpenFollowUps = (clarifyingState?.clarifying.questions.some((question) => question.status !== 'answered') || false);

  return {
    initialSetupAnswers: { ...base.initialSetupAnswers, ...initialSetupAnswers },
    currentIndex: typeof parsed.currentIndex === 'number' && Number.isFinite(parsed.currentIndex) && Number.isInteger(parsed.currentIndex) && parsed.currentIndex >= 0
      ? parsed.currentIndex
      : 0,
    followUpAnswers,
    showFollowUps: parsed.showFollowUps === true,
    clarifyingState,
    viewState: viewState === 'followups' && !hasOpenFollowUps ? 'question' : viewState,
  };
};
