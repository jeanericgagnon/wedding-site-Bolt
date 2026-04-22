import { normalizeQuickStartDraftSnapshot, type QuickStartDraftSnapshot } from './quickStartPersistence';

export const QUICK_START_STORAGE_KEY = 'dayoflove:quickstart-shell';

export const createQuickStartDraftSnapshot = (value: unknown): QuickStartDraftSnapshot => (
  normalizeQuickStartDraftSnapshot(value)
);

export const persistQuickStartDraftSnapshot = (value: unknown) => {
  if (typeof window === 'undefined') return null;
  const normalized = createQuickStartDraftSnapshot(value);
  try {
    window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // ignore storage write failures and keep the normalized in-memory result usable
  }
  return normalized;
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
    try {
      window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // ignore storage rewrite failures and still return the normalized draft
    }
    return normalized;
  } catch {
    try {
      window.localStorage.removeItem(QUICK_START_STORAGE_KEY);
    } catch {
      // ignore cleanup failures after broken payloads and still treat restore as unavailable
    }
    return null;
  }
};
