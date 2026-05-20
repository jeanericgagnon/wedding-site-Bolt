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
  const allowedInitialSetupValues: Partial<Record<keyof InitialSetupAnswers, readonly string[]>> = {
    labelPreference: ['names-only', 'bride-groom', 'bride-bride', 'groom-groom', 'custom'],
    guestCountBand: ['under-50', '50-100', '100-150', '150-250', '250-plus', ''],
    plusOnePolicy: ['none', 'some', 'all', ''],
    childrenAllowed: ['yes', 'no', 'unsure', ''],
    mealChoice: ['yes', 'no', ''],
    registryIntent: ['cash', 'gifts', 'both', 'unsure', 'none-for-now', ''],
  };

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

  const followUpAnswers = sanitizeStringRecord(parsed.followUpAnswers);
  const hasFollowUpReviewData = Boolean(
    Object.keys(followUpAnswers).length > 0
    || (initialSetupFollowUps.venueClarification ?? '').trim().length > 0
    || Object.keys(initialSetupFollowUps.eventLocations).length > 0
    || Object.keys(initialSetupFollowUps.eventTimes).length > 0
  );

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
              .flatMap(([key, value]) => {
                if (typeof value !== 'string') return [];
                const trimmedValue = value.trim();
                const allowedValues = allowedInitialSetupValues[key as keyof InitialSetupAnswers];
                return !allowedValues || allowedValues.includes(trimmedValue) ? [[key, trimmedValue]] : [];
              }),
          ),
        }
      : base.initialSetupAnswers,
    initialSetupFollowUps,
    followUpAnswers,
    showFollowUpReview: parsed.showFollowUpReview === true && hasFollowUpReviewData,
  };
};
