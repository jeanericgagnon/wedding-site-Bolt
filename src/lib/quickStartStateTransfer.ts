import { normalizeQuickStartDraftSnapshot, type QuickStartDraftSnapshot } from './quickStartPersistence';
import { hasMeaningfulQuickStartAnswers } from './quickStartHydration';

export const QUICK_START_STORAGE_KEY = 'dayoflove:quickstart-shell';
export const QUICK_START_DRAFT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const isFreshQuickStartDraftTimestamp = (value: unknown, now = Date.now()) => {
  if (typeof value !== 'string') return false;
  const savedAtMs = Date.parse(value);
  return Number.isFinite(savedAtMs) && savedAtMs <= now && now - savedAtMs <= QUICK_START_DRAFT_RETENTION_MS;
};

const withoutQuickStartSavedAt = (snapshot: QuickStartDraftSnapshot): QuickStartDraftSnapshot => {
  const { savedAtISO: _savedAtISO, ...snapshotWithoutSavedAt } = snapshot;
  return snapshotWithoutSavedAt;
};

const withQuickStartSavedAt = (snapshot: QuickStartDraftSnapshot, existingRaw: string | null) => {
  const normalizedWithoutSavedAt = withoutQuickStartSavedAt(snapshot);

  if (existingRaw) {
    try {
      const existingSnapshot = createQuickStartDraftSnapshot(JSON.parse(existingRaw));
      if (
        JSON.stringify(withoutQuickStartSavedAt(existingSnapshot)) === JSON.stringify(normalizedWithoutSavedAt)
        && isFreshQuickStartDraftTimestamp(existingSnapshot.savedAtISO)
      ) {
        return { ...normalizedWithoutSavedAt, savedAtISO: existingSnapshot.savedAtISO };
      }
    } catch {
      // ignore broken legacy payloads and write a fresh normalized snapshot
    }
  }

  return { ...normalizedWithoutSavedAt, savedAtISO: new Date().toISOString() };
};

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
      snapshot.clarifyingState.clarifying.questions.some((question) => question.status !== 'skipped')
      || snapshot.clarifyingState.clarifying.history.some((question) => question.status !== 'skipped')
      || Object.keys(snapshot.clarifyingState.draftOutputs).length > 0
    )
  );
  const hasPendingClarifyingGeneration = Boolean(
    snapshot.clarifyingState
    && snapshot.viewState === 'thinking'
    && snapshot.clarifyingState.clarifying.questions.length === 0
    && snapshot.clarifyingState.clarifying.history.length === 0
    && Object.keys(snapshot.clarifyingState.draftOutputs).length === 0
  );

  const hasMeaningfulSetupAnswers = hasMeaningfulQuickStartAnswers(snapshot.initialSetupAnswers);
  const hasMeaningfulProgress = snapshot.currentIndex > 0 && hasMeaningfulSetupAnswers;
  const hasMeaningfulFollowUps = Object.keys(snapshot.followUpAnswers).length > 0;
  const hasThinkingContinuation = snapshot.showFollowUps
    && snapshot.viewState === 'thinking'
    && (hasPendingClarifyingGeneration || hasMeaningfulClarifyingState || hasMeaningfulFollowUps);

  return hasMeaningfulSetupAnswers
    || hasMeaningfulProgress
    || hasMeaningfulFollowUps
    || hasThinkingContinuation
    || (snapshot.showFollowUps && (hasMeaningfulFollowUps || hasMeaningfulClarifyingState))
    || (snapshot.viewState !== 'question' && (hasMeaningfulFollowUps || hasMeaningfulClarifyingState || hasThinkingContinuation))
    || hasMeaningfulClarifyingState
    || hasPendingClarifyingGeneration;
};


export const clearQuickStartDraftSnapshot = () => {
  if (typeof window === 'undefined') return;

  try {
    if (window.localStorage.getItem(QUICK_START_STORAGE_KEY) !== null) {
      window.localStorage.removeItem(QUICK_START_STORAGE_KEY);
    }
  } catch {
    // ignore cleanup failures so restore callers can keep moving
  }
};

export const persistQuickStartDraftSnapshot = (value: unknown) => {
  if (typeof window === 'undefined') return null;
  const normalized = createQuickStartDraftSnapshot(value);
  const hasMeaningfulDraft = hasMeaningfulQuickStartDraftSnapshot(normalized);

  try {
    const existingRaw = window.localStorage.getItem(QUICK_START_STORAGE_KEY);
    const normalizedWithSavedAt = hasMeaningfulDraft ? withQuickStartSavedAt(normalized, existingRaw) : null;
    const normalizedRaw = normalizedWithSavedAt ? JSON.stringify(normalizedWithSavedAt) : null;

    if (normalizedRaw !== null) {
      if (existingRaw !== normalizedRaw) {
        window.localStorage.setItem(QUICK_START_STORAGE_KEY, normalizedRaw);
      }
    } else if (existingRaw !== null) {
      clearQuickStartDraftSnapshot();
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
    const parsed = JSON.parse(raw);
    const normalized = createQuickStartDraftSnapshot(parsed);
    const hasMeaningfulDraft = hasMeaningfulQuickStartDraftSnapshot(normalized);
    const hasSavedAt = typeof normalized.savedAtISO === 'string';
    if (hasSavedAt && !isFreshQuickStartDraftTimestamp(normalized.savedAtISO)) {
      clearQuickStartDraftSnapshot();
      return null;
    }
    const normalizedWithSavedAt = hasMeaningfulDraft
      ? {
          ...withoutQuickStartSavedAt(normalized),
          savedAtISO: hasSavedAt ? normalized.savedAtISO : new Date().toISOString(),
        }
      : null;
    const normalizedRaw = normalizedWithSavedAt ? JSON.stringify(normalizedWithSavedAt) : null;
    try {
      if (normalizedRaw) {
        if (raw !== normalizedRaw) {
          window.localStorage.setItem(QUICK_START_STORAGE_KEY, normalizedRaw);
        }
      } else {
        clearQuickStartDraftSnapshot();
      }
    } catch {
      // ignore storage rewrite failures and still return the normalized draft
    }
    return hasMeaningfulDraft ? normalized : null;
  } catch {
    try {
      clearQuickStartDraftSnapshot();
    } catch {
      // ignore cleanup failures after broken payloads and still treat restore as unavailable
    }
    return null;
  }
};
