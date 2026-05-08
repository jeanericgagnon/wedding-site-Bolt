export const CHUNK_RELOAD_STORAGE_KEY = 'dayof_chunk_reload_once_v1';
export const CHUNK_RELOAD_RETRY_RETENTION_MS = 10 * 60 * 1000;

type ChunkReloadEnvelope = {
  savedAtISO: string;
  retried: true;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isFreshReloadTimestamp = (value: unknown, now = Date.now()) => {
  if (typeof value !== 'string') return false;
  const savedAtMs = Date.parse(value);
  return Number.isFinite(savedAtMs) && savedAtMs <= now && now - savedAtMs <= CHUNK_RELOAD_RETRY_RETENTION_MS;
};

const buildChunkReloadEnvelope = (): ChunkReloadEnvelope => ({
  savedAtISO: new Date().toISOString(),
  retried: true,
});

export const clearChunkReloadRetryFlag = () => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(CHUNK_RELOAD_STORAGE_KEY);
  } catch {
    // ignore storage cleanup failures
  }
};

export const hasFreshChunkReloadRetryFlag = () => {
  if (typeof window === 'undefined') return false;

  try {
    const raw = window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY);
    if (!raw) return false;
    if (raw === '1') {
      window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, JSON.stringify(buildChunkReloadEnvelope()));
      return true;
    }

    const parsed = JSON.parse(raw);
    if (isRecord(parsed) && parsed.retried === true && isFreshReloadTimestamp(parsed.savedAtISO)) {
      return true;
    }

    window.sessionStorage.removeItem(CHUNK_RELOAD_STORAGE_KEY);
    return false;
  } catch {
    clearChunkReloadRetryFlag();
    return false;
  }
};

export const writeChunkReloadRetryFlag = () => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, JSON.stringify(buildChunkReloadEnvelope()));
  } catch {
    // ignore storage failures; callers still render the fallback UI
  }
};
