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

const sanitizeStringRecord = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key, entry]) => key.trim().length > 0 && typeof entry === 'string' && entry.trim().length > 0)
      .map(([key, entry]) => [key.trim(), entry.trim()]),
  );
};

export const normalizeOnboardingDraftSnapshot = (value: unknown): OnboardingDraftSnapshot => {
  const base = createEmptyOnboardingDraftSnapshot();
  if (!value || typeof value !== 'object') return base;

  const parsed = value as Partial<OnboardingDraftSnapshot>;
  const initialSetupFollowUps = parsed.initialSetupFollowUps && typeof parsed.initialSetupFollowUps === 'object'
    ? {
        ...base.initialSetupFollowUps,
        ...parsed.initialSetupFollowUps,
        venueClarification: typeof parsed.initialSetupFollowUps.venueClarification === 'string'
          ? parsed.initialSetupFollowUps.venueClarification.trim()
          : base.initialSetupFollowUps.venueClarification,
        eventLocations: sanitizeStringRecord(parsed.initialSetupFollowUps.eventLocations),
        eventTimes: sanitizeStringRecord(parsed.initialSetupFollowUps.eventTimes),
      }
    : base.initialSetupFollowUps;

  return {
    step: parsed.step === 'quick-1' || parsed.step === 'quick-2' || parsed.step === 'quick-3' || parsed.step === 'complete' ? parsed.step : 'choice',
    conversationIndex: typeof parsed.conversationIndex === 'number' && Number.isFinite(parsed.conversationIndex) && Number.isInteger(parsed.conversationIndex) && parsed.conversationIndex >= 0
      ? parsed.conversationIndex
      : 0,
    weddingProfile: isWeddingProfile(parsed.weddingProfile) ? parsed.weddingProfile : base.weddingProfile,
    initialSetupAnswers: parsed.initialSetupAnswers && typeof parsed.initialSetupAnswers === 'object'
      ? {
          ...base.initialSetupAnswers,
          ...Object.fromEntries(
            Object.entries(parsed.initialSetupAnswers)
              .filter(([, value]) => typeof value === 'string')
              .map(([key, value]) => [key, value.trim()]),
          ),
        }
      : base.initialSetupAnswers,
    initialSetupFollowUps,
    followUpAnswers: sanitizeStringRecord(parsed.followUpAnswers),
    showFollowUpReview: parsed.showFollowUpReview === true,
  };
};
