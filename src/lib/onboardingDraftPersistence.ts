import { createEmptyInitialSetupAnswers, type InitialSetupAnswers } from './initialSetupAnswers';
import { createEmptyInitialSetupFollowUps, type InitialSetupFollowUpAnswers } from './initialSetupFollowUps';
import { createEmptyWeddingProfile, isWeddingProfile, type WeddingProfile } from './weddingProfile';
import { buildOnboardingDraftStorageKey, ONBOARDING_DRAFT_STORAGE_KEY } from './onboardingDraftCleanup';

export type OnboardingStep = 'choice' | 'quick-1' | 'quick-2' | 'quick-3' | 'details' | 'customize' | 'complete';

export type OnboardingDraftSnapshot = {
  step: OnboardingStep;
  conversationIndex: number;
  weddingProfile: WeddingProfile;
  initialSetupAnswers: InitialSetupAnswers;
  initialSetupFollowUps: InitialSetupFollowUpAnswers;
  followUpAnswers: Record<string, string>;
  showFollowUpReview: boolean;
  savedAtISO?: string;
};

export const ONBOARDING_DRAFT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

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
  if (typeof parsed.savedAtISO === 'string' && !isFreshOnboardingDraftTimestamp(parsed.savedAtISO)) return base;
  const savedAtISO = typeof parsed.savedAtISO === 'string' && isFreshOnboardingDraftTimestamp(parsed.savedAtISO)
    ? new Date(parsed.savedAtISO).toISOString()
    : new Date().toISOString();
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
    savedAtISO,
  };
};

const isFreshOnboardingDraftTimestamp = (value: unknown, now = Date.now()) => {
  if (typeof value !== 'string') return false;
  const savedAtMs = Date.parse(value);
  return Number.isFinite(savedAtMs) && savedAtMs <= now && now - savedAtMs <= ONBOARDING_DRAFT_RETENTION_MS;
};

const withoutOnboardingSavedAt = (snapshot: OnboardingDraftSnapshot): OnboardingDraftSnapshot => {
  const { savedAtISO: _savedAtISO, ...snapshotWithoutSavedAt } = snapshot;
  return snapshotWithoutSavedAt;
};

const isEmptyOnboardingDraftSnapshot = (snapshot: OnboardingDraftSnapshot) => (
  JSON.stringify(withoutOnboardingSavedAt(snapshot)) === JSON.stringify(createEmptyOnboardingDraftSnapshot())
);

const readScopedOnboardingDraftRaw = (storageScope?: string | null): {
  storageKey: string;
  sourceKey: string;
  raw: string | null;
  shouldMigrate: boolean;
} => {
  const storageKey = buildOnboardingDraftStorageKey(storageScope);
  const hasScopedKey = window.localStorage.getItem(storageKey) !== null;
  const sourceKey = !hasScopedKey && storageKey !== ONBOARDING_DRAFT_STORAGE_KEY ? ONBOARDING_DRAFT_STORAGE_KEY : storageKey;
  return {
    storageKey,
    sourceKey,
    raw: window.localStorage.getItem(sourceKey),
    shouldMigrate: sourceKey !== storageKey,
  };
};

export const readOnboardingDraftSnapshot = (storageScope?: string | null): OnboardingDraftSnapshot | null => {
  if (typeof window === 'undefined') return null;

  try {
    const { raw, sourceKey, storageKey, shouldMigrate } = readScopedOnboardingDraftRaw(storageScope);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && typeof parsed.savedAtISO === 'string' && !isFreshOnboardingDraftTimestamp(parsed.savedAtISO)) {
      window.localStorage.removeItem(sourceKey);
      return null;
    }

    const normalized = normalizeOnboardingDraftSnapshot(parsed);
    const normalizedRaw = JSON.stringify(normalized);
    if (raw !== normalizedRaw || shouldMigrate) {
      window.localStorage.setItem(storageKey, normalizedRaw);
      if (shouldMigrate) window.localStorage.removeItem(sourceKey);
    }
    return normalized;
  } catch {
    try {
      const { sourceKey } = readScopedOnboardingDraftRaw(storageScope);
      window.localStorage.removeItem(sourceKey);
    } catch {
      // ignore cleanup failures after malformed drafts
    }
    return null;
  }
};

export const hasStoredOnboardingDraftPayload = (storageScope?: string | null): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    return readScopedOnboardingDraftRaw(storageScope).raw !== null;
  } catch {
    return false;
  }
};

export const hasActiveOnboardingDraftSnapshot = (storageScope?: string | null): boolean => readOnboardingDraftSnapshot(storageScope) !== null;

export const persistOnboardingDraftSnapshot = (value: unknown, storageScope?: string | null): OnboardingDraftSnapshot | null => {
  if (typeof window === 'undefined') return null;

  try {
    const normalized = {
      ...withoutOnboardingSavedAt(normalizeOnboardingDraftSnapshot(value)),
      savedAtISO: new Date().toISOString(),
    };
    const storageKey = buildOnboardingDraftStorageKey(storageScope);
    window.localStorage.setItem(storageKey, JSON.stringify(normalized));
    if (storageKey !== ONBOARDING_DRAFT_STORAGE_KEY) window.localStorage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY);
    return isEmptyOnboardingDraftSnapshot(normalized) ? null : normalized;
  } catch {
    return null;
  }
};
