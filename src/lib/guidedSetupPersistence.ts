export type GuidedSetupStep =
  | 'welcome'
  | 'basics'
  | 'events'
  | 'travel'
  | 'rsvp'
  | 'faq'
  | 'design'
  | 'guests'
  | 'complete';

export type GuidedSetupFormData = {
  weddingDate: string;
  venue: string;
  city: string;
  ourStory: string;
  ceremonyTime: string;
  receptionTime: string;
  attire: string;
  hotelRecommendations: string;
  parking: string;
  rsvpDeadline: string;
  mealOptions: string;
  registryLinks: string;
  customFaqs: string;
  template: string;
  colorScheme: string;
};

export type GuidedSetupDraftSnapshot = {
  currentStep: GuidedSetupStep;
  coupleNames: { name1: string; name2: string };
  formData: GuidedSetupFormData;
  savedAtISO?: string;
};

export const GUIDED_SETUP_STORAGE_KEY = 'dayoflove:guided-setup-draft';
export const GUIDED_SETUP_DRAFT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_GUIDED_SETUP_TEXT_LENGTH = 2000;
export const MAX_GUIDED_SETUP_NAME_LENGTH = 120;

const VALID_GUIDED_SETUP_STEPS: GuidedSetupStep[] = ['welcome', 'basics', 'events', 'travel', 'rsvp', 'faq', 'design', 'guests', 'complete'];

const isValidGuidedSetupDateInput = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return false;

  return date.toISOString().slice(0, 10) === value;
};

const normalizeGuidedSetupDateInput = (value: string): string => (
  isValidGuidedSetupDateInput(value) ? value : ''
);

const normalizeGuidedSetupText = (value: string, maxLength = MAX_GUIDED_SETUP_TEXT_LENGTH): string => (
  value.trim().slice(0, maxLength)
);

const isFreshGuidedSetupTimestamp = (value: unknown, now = Date.now()) => {
  if (typeof value !== 'string') return false;
  const savedAtMs = Date.parse(value);
  return Number.isFinite(savedAtMs) && savedAtMs <= now && now - savedAtMs <= GUIDED_SETUP_DRAFT_RETENTION_MS;
};

const normalizeGuidedSetupFormData = (
  value: unknown,
  defaults: GuidedSetupFormData,
): GuidedSetupFormData => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...defaults };

  const next = { ...defaults };
  for (const [key, fieldValue] of Object.entries(value)) {
    if (key in defaults && typeof fieldValue === 'string') {
      next[key as keyof GuidedSetupFormData] = normalizeGuidedSetupText(fieldValue);
    }
  }

  next.weddingDate = normalizeGuidedSetupDateInput(next.weddingDate);
  next.rsvpDeadline = normalizeGuidedSetupDateInput(next.rsvpDeadline);

  return next;
};

const cloneGuidedSetupDefaults = (defaults: GuidedSetupDraftSnapshot): GuidedSetupDraftSnapshot => ({
  currentStep: defaults.currentStep,
  coupleNames: { ...defaults.coupleNames },
  formData: { ...defaults.formData },
});

export const normalizeGuidedSetupDraftSnapshot = (
  value: unknown,
  defaults: GuidedSetupDraftSnapshot,
): GuidedSetupDraftSnapshot => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return cloneGuidedSetupDefaults(defaults);
  const parsed = value as Partial<GuidedSetupDraftSnapshot>;
  if (typeof parsed.savedAtISO === 'string' && !isFreshGuidedSetupTimestamp(parsed.savedAtISO)) return cloneGuidedSetupDefaults(defaults);
  const savedAtISO = typeof parsed.savedAtISO === 'string' && isFreshGuidedSetupTimestamp(parsed.savedAtISO)
    ? new Date(parsed.savedAtISO).toISOString()
    : new Date().toISOString();

  return {
    currentStep: VALID_GUIDED_SETUP_STEPS.includes(parsed.currentStep as GuidedSetupStep) ? parsed.currentStep as GuidedSetupStep : defaults.currentStep,
    coupleNames: parsed.coupleNames && typeof parsed.coupleNames === 'object' && !Array.isArray(parsed.coupleNames)
      ? {
          name1: typeof parsed.coupleNames.name1 === 'string' ? normalizeGuidedSetupText(parsed.coupleNames.name1, MAX_GUIDED_SETUP_NAME_LENGTH) : defaults.coupleNames.name1,
          name2: typeof parsed.coupleNames.name2 === 'string' ? normalizeGuidedSetupText(parsed.coupleNames.name2, MAX_GUIDED_SETUP_NAME_LENGTH) : defaults.coupleNames.name2,
        }
      : { ...defaults.coupleNames },
    formData: normalizeGuidedSetupFormData(parsed.formData, defaults.formData),
    savedAtISO,
  };
};

const isDefaultGuidedSetupDraft = (snapshot: GuidedSetupDraftSnapshot, defaults: GuidedSetupDraftSnapshot) => (
  JSON.stringify({
    currentStep: snapshot.currentStep,
    coupleNames: snapshot.coupleNames,
    formData: snapshot.formData,
  }) === JSON.stringify({
    currentStep: defaults.currentStep,
    coupleNames: defaults.coupleNames,
    formData: defaults.formData,
  })
);

export const readGuidedSetupDraftSnapshot = (defaults: GuidedSetupDraftSnapshot): GuidedSetupDraftSnapshot | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(GUIDED_SETUP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && typeof parsed.savedAtISO === 'string' && !isFreshGuidedSetupTimestamp(parsed.savedAtISO)) {
      clearGuidedSetupDraftSnapshot();
      return null;
    }

    const normalized = normalizeGuidedSetupDraftSnapshot(parsed, defaults);
    if (isDefaultGuidedSetupDraft(normalized, defaults)) {
      clearGuidedSetupDraftSnapshot();
      return null;
    }

    const normalizedRaw = JSON.stringify(normalized);
    if (raw !== normalizedRaw) window.localStorage.setItem(GUIDED_SETUP_STORAGE_KEY, normalizedRaw);
    return normalized;
  } catch {
    clearGuidedSetupDraftSnapshot();
    return null;
  }
};

export const persistGuidedSetupDraftSnapshot = (value: unknown, defaults: GuidedSetupDraftSnapshot): GuidedSetupDraftSnapshot | null => {
  if (typeof window === 'undefined') return null;

  try {
    const normalized = {
      ...normalizeGuidedSetupDraftSnapshot(value, defaults),
      savedAtISO: new Date().toISOString(),
    };

    if (isDefaultGuidedSetupDraft(normalized, defaults)) {
      clearGuidedSetupDraftSnapshot();
      return null;
    }

    window.localStorage.setItem(GUIDED_SETUP_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return null;
  }
};

export const clearGuidedSetupDraftSnapshot = () => {
  if (typeof window === 'undefined') return;

  try {
    if (window.localStorage.getItem(GUIDED_SETUP_STORAGE_KEY) !== null) {
      window.localStorage.removeItem(GUIDED_SETUP_STORAGE_KEY);
    }
  } catch {
    // ignore cleanup failures so other onboarding draft cleanup can continue
  }
};
