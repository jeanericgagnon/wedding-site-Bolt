export const LOCAL_E2E_AUTH_KEY = 'dayof_e2e_local_auth';
export const LOCAL_E2E_VAULT_FORCE_UNLOCK_KEY = 'dayof_e2e_force_vault_unlock';

export const LOCAL_E2E_BYPASS_RETENTION_MS = 12 * 60 * 60 * 1000;

type LocalE2EBypassEnvelope = {
  enabled: true;
  savedAtISO: string;
};

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');
}

function buildEnvelope(now = Date.now()): LocalE2EBypassEnvelope {
  return { enabled: true, savedAtISO: new Date(now).toISOString() };
}

function isActiveEnvelope(value: unknown, now = Date.now()): value is LocalE2EBypassEnvelope {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { enabled?: unknown; savedAtISO?: unknown };
  if (candidate.enabled !== true || typeof candidate.savedAtISO !== 'string') return false;
  const savedAt = Date.parse(candidate.savedAtISO);
  if (!Number.isFinite(savedAt)) return false;
  if (savedAt > now + 60_000) return false;
  return now - savedAt <= LOCAL_E2E_BYPASS_RETENTION_MS;
}

export function readLocalE2EBypassFlag(storageKey: string, hostname?: string, now = Date.now()): boolean {
  const currentHost = hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '');
  if (!isLocalHost(currentHost) || !canUseStorage()) return false;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === '1') {
      window.localStorage.setItem(storageKey, JSON.stringify(buildEnvelope(now)));
      return true;
    }
    if (!raw) return false;

    const parsed = JSON.parse(raw) as unknown;
    if (isActiveEnvelope(parsed, now)) return true;

    window.localStorage.removeItem(storageKey);
    return false;
  } catch {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Ignore local test-storage failures.
    }
    return false;
  }
}

export function clearLocalE2EBypassFlag(storageKey: string): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Ignore local test-storage failures.
  }
}
