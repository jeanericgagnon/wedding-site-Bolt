import { createEmptyInitialSetupAnswers, type InitialSetupAnswers } from './initialSetupAnswers';
import type { ClarifyingPersistenceEnvelope } from './aiClarifyingPersistence';

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
        Object.entries(parsed.followUpAnswers).filter(([key, val]) => key.trim().length > 0 && typeof val === 'string' && val.trim().length > 0),
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
        Object.entries(parsed.initialSetupAnswers).filter(([key, val]) => {
          if (typeof val !== 'string') return false;
          const allowedValues = allowedInitialSetupValues[key as keyof InitialSetupAnswers];
          return !allowedValues || allowedValues.includes(val);
        }),
      ) as Partial<InitialSetupAnswers>
    : {};

  return {
    initialSetupAnswers: { ...base.initialSetupAnswers, ...initialSetupAnswers },
    currentIndex: typeof parsed.currentIndex === 'number' && Number.isFinite(parsed.currentIndex) && parsed.currentIndex >= 0
      ? parsed.currentIndex
      : 0,
    followUpAnswers,
    showFollowUps: parsed.showFollowUps === true,
    clarifyingState: parsed.clarifyingState && typeof parsed.clarifyingState === 'object' && !Array.isArray(parsed.clarifyingState)
      ? parsed.clarifyingState as ClarifyingPersistenceEnvelope
      : null,
    viewState: parsed.viewState === 'thinking' || parsed.viewState === 'followups' ? parsed.viewState : 'question',
  };
};
