import { normalizeQuickStartDraftSnapshot, type QuickStartDraftSnapshot } from './quickStartPersistence';
import { hasMeaningfulQuickStartAnswers } from './quickStartHydration';

export const QUICK_START_STORAGE_KEY = 'dayoflove:quickstart-shell';

export const createQuickStartDraftSnapshot = (value: unknown): QuickStartDraftSnapshot => (
  normalizeQuickStartDraftSnapshot(value)
);

export const normalizeMeaningfulQuickStartDraftSnapshot = (value: unknown): QuickStartDraftSnapshot | null => {
  const normalized = createQuickStartDraftSnapshot(value);
  return hasMeaningfulQuickStartDraftSnapshot(normalized) ? normalized : null;
};

export const hasMeaningfulQuickStartDraftSnapshot = (snapshot: QuickStartDraftSnapshot | null | undefined) => {
  if (!snapshot) return false;

  const hasMeaningfulClarifyingState = Boolean(
    snapshot.clarifyingState && (
      snapshot.clarifyingState.clarifying.questions.length > 0
      || snapshot.clarifyingState.clarifying.history.length > 0
      || Object.keys(snapshot.clarifyingState.draftOutputs).length > 0
    )
  );

  return hasMeaningfulQuickStartAnswers(snapshot.initialSetupAnswers)
    || snapshot.currentIndex > 0
    || Object.keys(snapshot.followUpAnswers).length > 0
    || snapshot.showFollowUps
    || snapshot.viewState !== 'question'
    || hasMeaningfulClarifyingState;
};

export const persistQuickStartDraftSnapshot = (value: unknown) => {
  if (typeof window === 'undefined') return null;
  const normalized = createQuickStartDraftSnapshot(value);
  const hasMeaningfulDraft = hasMeaningfulQuickStartDraftSnapshot(normalized);
  const normalizedRaw = hasMeaningfulDraft ? JSON.stringify(normalized) : null;

  try {
    const existingRaw = window.localStorage.getItem(QUICK_START_STORAGE_KEY);

    if (normalizedRaw !== null) {
      if (existingRaw !== normalizedRaw) {
        window.localStorage.setItem(QUICK_START_STORAGE_KEY, normalizedRaw);
      }
    } else if (existingRaw !== null) {
      window.localStorage.removeItem(QUICK_START_STORAGE_KEY);
    }
  } catch {
    // ignore storage write failures and keep the normalized in-memory result usable
  }

  return hasMeaningfulDraft ? normalized : null;
};

export const readQuickStartDraftSnapshot = (): QuickStartDraftSnapshot | null => {
  if (typeof window === 'undefined') return null;

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(QUICK_START_STORAGE_KEY);
  } catch {
    return null;
  }

  if (!raw) return null;
  try {
    const normalized = createQuickStartDraftSnapshot(JSON.parse(raw));
    const hasMeaningfulDraft = hasMeaningfulQuickStartDraftSnapshot(normalized);
    const normalizedRaw = JSON.stringify(normalized);
    try {
      if (hasMeaningfulDraft) {
        if (raw !== normalizedRaw) {
          window.localStorage.setItem(QUICK_START_STORAGE_KEY, normalizedRaw);
        }
      } else {
        window.localStorage.removeItem(QUICK_START_STORAGE_KEY);
      }
    } catch {
      // ignore storage rewrite failures and still return the normalized draft
    }
    return hasMeaningfulDraft ? normalized : null;
  } catch {
    try {
      window.localStorage.removeItem(QUICK_START_STORAGE_KEY);
    } catch {
      // ignore cleanup failures after broken payloads and still treat restore as unavailable
    }
    return null;
  }
};
