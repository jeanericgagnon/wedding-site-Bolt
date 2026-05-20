import { normalizeQuickStartDraftSnapshot, type QuickStartDraftSnapshot } from './quickStartPersistence';
import { hasMeaningfulQuickStartAnswers } from './quickStartHydration';

export const QUICK_START_STORAGE_KEY = 'dayoflove:quickstart-shell';
export const QUICK_START_DRAFT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const buildQuickStartDraftStorageKey = (storageScope?: string | null): string => {
  const scope = typeof storageScope === 'string' ? storageScope.trim() : '';
  return scope ? `${QUICK_START_STORAGE_KEY}::${scope}` : QUICK_START_STORAGE_KEY;
};

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


const readScopedQuickStartRaw = (storageScope?: string | null): {
  storageKey: string;
  sourceKey: string;
  raw: string | null;
  shouldMigrate: boolean;
} => {
  const storageKey = buildQuickStartDraftStorageKey(storageScope);
  const hasScopedKey = window.localStorage.getItem(storageKey) !== null;
  const sourceKey = !hasScopedKey && storageKey !== QUICK_START_STORAGE_KEY ? QUICK_START_STORAGE_KEY : storageKey;
  return {
    storageKey,
    sourceKey,
    raw: window.localStorage.getItem(sourceKey),
    shouldMigrate: sourceKey !== storageKey,
  };
};

export const clearQuickStartDraftSnapshot = (storageScope?: string | null) => {
  if (typeof window === 'undefined') return;

  try {
    const storageKey = buildQuickStartDraftStorageKey(storageScope);
    if (window.localStorage.getItem(storageKey) !== null) {
      window.localStorage.removeItem(storageKey);
    }
    if (storageKey !== QUICK_START_STORAGE_KEY && window.localStorage.getItem(QUICK_START_STORAGE_KEY) !== null) {
      window.localStorage.removeItem(QUICK_START_STORAGE_KEY);
    }
  } catch {
    // ignore cleanup failures so restore callers can keep moving
  }
};

export const persistQuickStartDraftSnapshot = (value: unknown, storageScope?: string | null) => {
  if (typeof window === 'undefined') return null;
  const normalized = createQuickStartDraftSnapshot(value);
  const hasMeaningfulDraft = hasMeaningfulQuickStartDraftSnapshot(normalized);

  try {
    const { raw: existingRaw, sourceKey, storageKey } = readScopedQuickStartRaw(storageScope);
    const normalizedWithSavedAt = hasMeaningfulDraft ? withQuickStartSavedAt(normalized, existingRaw) : null;
    const normalizedRaw = normalizedWithSavedAt ? JSON.stringify(normalizedWithSavedAt) : null;

    if (normalizedRaw !== null) {
      if (existingRaw !== normalizedRaw || sourceKey !== storageKey) {
        window.localStorage.setItem(storageKey, normalizedRaw);
      }
      if (sourceKey !== storageKey) window.localStorage.removeItem(sourceKey);
    } else if (existingRaw !== null) {
      clearQuickStartDraftSnapshot(storageScope);
    }
  } catch {
    // ignore storage write failures and keep the normalized in-memory result usable
  }

  return hasMeaningfulDraft ? normalized : null;
};

export const readQuickStartDraftSnapshot = (storageScope?: string | null): QuickStartDraftSnapshot | null => {
  if (typeof window === 'undefined') return null;

  let scopedRaw: ReturnType<typeof readScopedQuickStartRaw> | null = null;
  try {
    scopedRaw = readScopedQuickStartRaw(storageScope);
  } catch {
    return null;
  }

  const raw = scopedRaw.raw;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const normalized = createQuickStartDraftSnapshot(parsed);
    const hasMeaningfulDraft = hasMeaningfulQuickStartDraftSnapshot(normalized);
    const hasSavedAt = typeof normalized.savedAtISO === 'string';
    if (hasSavedAt && !isFreshQuickStartDraftTimestamp(normalized.savedAtISO)) {
      clearQuickStartDraftSnapshot(storageScope);
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
        if (raw !== normalizedRaw || scopedRaw.shouldMigrate) {
          window.localStorage.setItem(scopedRaw.storageKey, normalizedRaw);
          if (scopedRaw.shouldMigrate) window.localStorage.removeItem(scopedRaw.sourceKey);
        }
      } else {
        clearQuickStartDraftSnapshot(storageScope);
      }
    } catch {
      // ignore storage rewrite failures and still return the normalized draft
    }
    return hasMeaningfulDraft ? normalized : null;
  } catch {
    try {
      clearQuickStartDraftSnapshot(storageScope);
    } catch {
      // ignore cleanup failures after broken payloads and still treat restore as unavailable
    }
    return null;
  }
};

export const migrateQuickStartDraftSnapshotScope = (
  sourceStorageScope?: string | null,
  targetStorageScope?: string | null,
): QuickStartDraftSnapshot | null => {
  const sourceKey = buildQuickStartDraftStorageKey(sourceStorageScope);
  const targetKey = buildQuickStartDraftStorageKey(targetStorageScope);

  if (sourceKey === targetKey) {
    return readQuickStartDraftSnapshot(targetStorageScope);
  }

  const sourceDraft = readQuickStartDraftSnapshot(sourceStorageScope);
  if (!sourceDraft) return readQuickStartDraftSnapshot(targetStorageScope);

  const targetDraft = readQuickStartDraftSnapshot(targetStorageScope);
  if (!targetDraft) {
    persistQuickStartDraftSnapshot(sourceDraft, targetStorageScope);
  }

  clearQuickStartDraftSnapshot(sourceStorageScope);
  return targetDraft ?? sourceDraft;
};
