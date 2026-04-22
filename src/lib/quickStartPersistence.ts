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
    ? Object.fromEntries(Object.entries(parsed.followUpAnswers).filter(([, val]) => typeof val === 'string'))
    : {};

  return {
    initialSetupAnswers: parsed.initialSetupAnswers && typeof parsed.initialSetupAnswers === 'object'
      ? { ...base.initialSetupAnswers, ...parsed.initialSetupAnswers }
      : base.initialSetupAnswers,
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
