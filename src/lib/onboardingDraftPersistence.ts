import { createEmptyInitialSetupAnswers, type InitialSetupAnswers } from './initialSetupAnswers';
import { createEmptyInitialSetupFollowUps, type InitialSetupFollowUpAnswers } from './initialSetupFollowUps';
import { createEmptyWeddingProfile, isWeddingProfile, type WeddingProfile } from './weddingProfile';

export type OnboardingStep = 'choice' | 'quick-1' | 'quick-2' | 'quick-3' | 'complete';

export type OnboardingDraftSnapshot = {
  step: OnboardingStep;
  conversationIndex: number;
  weddingProfile: WeddingProfile;
  initialSetupAnswers: InitialSetupAnswers;
  initialSetupFollowUps: InitialSetupFollowUpAnswers;
  followUpAnswers: Record<string, string>;
  showFollowUpReview: boolean;
};

export const createEmptyOnboardingDraftSnapshot = (): OnboardingDraftSnapshot => ({
  step: 'choice',
  conversationIndex: 0,
  weddingProfile: createEmptyWeddingProfile(),
  initialSetupAnswers: createEmptyInitialSetupAnswers(),
  initialSetupFollowUps: createEmptyInitialSetupFollowUps(),
  followUpAnswers: {},
  showFollowUpReview: false,
});

const isStringRecord = (value: unknown): value is Record<string, string> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).every((entry) => typeof entry === 'string');
};

export const normalizeOnboardingDraftSnapshot = (value: unknown): OnboardingDraftSnapshot => {
  const base = createEmptyOnboardingDraftSnapshot();
  if (!value || typeof value !== 'object') return base;

  const parsed = value as Partial<OnboardingDraftSnapshot>;
  const initialSetupFollowUps = parsed.initialSetupFollowUps && typeof parsed.initialSetupFollowUps === 'object'
    ? {
        ...base.initialSetupFollowUps,
        ...parsed.initialSetupFollowUps,
        eventLocations: isStringRecord(parsed.initialSetupFollowUps.eventLocations) ? parsed.initialSetupFollowUps.eventLocations : {},
        eventTimes: isStringRecord(parsed.initialSetupFollowUps.eventTimes) ? parsed.initialSetupFollowUps.eventTimes : {},
      }
    : base.initialSetupFollowUps;

  return {
    step: parsed.step === 'quick-1' || parsed.step === 'quick-2' || parsed.step === 'quick-3' || parsed.step === 'complete' ? parsed.step : 'choice',
    conversationIndex: typeof parsed.conversationIndex === 'number' && Number.isFinite(parsed.conversationIndex) ? parsed.conversationIndex : 0,
    weddingProfile: isWeddingProfile(parsed.weddingProfile) ? parsed.weddingProfile : base.weddingProfile,
    initialSetupAnswers: parsed.initialSetupAnswers && typeof parsed.initialSetupAnswers === 'object'
      ? { ...base.initialSetupAnswers, ...parsed.initialSetupAnswers }
      : base.initialSetupAnswers,
    initialSetupFollowUps,
    followUpAnswers: isStringRecord(parsed.followUpAnswers) ? parsed.followUpAnswers : {},
    showFollowUpReview: parsed.showFollowUpReview === true,
  };
};
