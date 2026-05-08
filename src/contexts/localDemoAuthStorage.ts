export const LOCAL_DEMO_AUTH_KEY = 'dayof_demo_local_auth';
export const LOCAL_DEMO_AUTH_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

type LocalDemoAuthEnvelope = {
  savedAtISO: string;
  enabled: true;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const buildLocalDemoAuthEnvelope = (): LocalDemoAuthEnvelope => ({
  savedAtISO: new Date().toISOString(),
  enabled: true,
});

const isFreshLocalDemoAuthTimestamp = (value: unknown, now = Date.now()) => {
  if (typeof value !== 'string') return false;
  const savedAtMs = Date.parse(value);
  return Number.isFinite(savedAtMs) && savedAtMs <= now && now - savedAtMs <= LOCAL_DEMO_AUTH_RETENTION_MS;
};

export const readLocalDemoAuthFlag = () => {
  try {
    const raw = localStorage.getItem(LOCAL_DEMO_AUTH_KEY);
    if (!raw) return false;
    if (raw === '1') {
      localStorage.setItem(LOCAL_DEMO_AUTH_KEY, JSON.stringify(buildLocalDemoAuthEnvelope()));
      return true;
    }

    const parsed = JSON.parse(raw);
    if (isRecord(parsed) && parsed.enabled === true && isFreshLocalDemoAuthTimestamp(parsed.savedAtISO)) {
      return true;
    }

    localStorage.removeItem(LOCAL_DEMO_AUTH_KEY);
    return false;
  } catch {
    try {
      localStorage.removeItem(LOCAL_DEMO_AUTH_KEY);
    } catch {
      // ignore cleanup failures
    }
    return false;
  }
};

export const writeLocalDemoAuthFlag = () => {
  localStorage.setItem(LOCAL_DEMO_AUTH_KEY, JSON.stringify(buildLocalDemoAuthEnvelope()));
};

export const clearLocalDemoAuthFlag = () => {
  localStorage.removeItem(LOCAL_DEMO_AUTH_KEY);
};
