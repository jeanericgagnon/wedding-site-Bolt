import { normalizeQuickStartDraftSnapshot, type QuickStartDraftSnapshot } from './quickStartPersistence';

export const QUICK_START_STORAGE_KEY = 'dayoflove:quickstart-shell';

export const persistQuickStartDraftSnapshot = (value: unknown) => {
  if (typeof window === 'undefined') return null;
  const normalized = normalizeQuickStartDraftSnapshot(value);
  window.localStorage.setItem(QUICK_START_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
};

export const readQuickStartDraftSnapshot = (): QuickStartDraftSnapshot | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(QUICK_START_STORAGE_KEY);
  if (!raw) return null;
  try {
    return normalizeQuickStartDraftSnapshot(JSON.parse(raw));
  } catch {
    window.localStorage.removeItem(QUICK_START_STORAGE_KEY);
    return null;
  }
};
