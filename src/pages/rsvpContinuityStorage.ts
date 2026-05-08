export const RSVP_CONTINUITY_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

type RsvpContinuityEnvelope = {
  savedAtISO: string;
  updatedAt: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const parseContinuityTimestamp = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsedMs = /^\d+$/.test(trimmed) ? Number(trimmed) : Date.parse(trimmed);
  if (!Number.isFinite(parsedMs)) return null;

  return new Date(parsedMs).toISOString();
};

export const buildRsvpContinuityEnvelope = (updatedAt = new Date().toISOString()): RsvpContinuityEnvelope => ({
  savedAtISO: updatedAt,
  updatedAt,
});

export const readRsvpContinuityUpdatedAt = (rawValue: string | null, now = Date.now()): string | null => {
  if (!rawValue) return null;

  let updatedAt = parseContinuityTimestamp(rawValue);
  let savedAt = updatedAt;

  if (!updatedAt) {
    try {
      const parsed = JSON.parse(rawValue);
      if (!isRecord(parsed)) return null;
      updatedAt = parseContinuityTimestamp(parsed.updatedAt);
      savedAt = parseContinuityTimestamp(parsed.savedAtISO);
    } catch {
      return null;
    }
  }

  if (!updatedAt || !savedAt) return null;
  const savedAtMs = Date.parse(savedAt);
  if (!Number.isFinite(savedAtMs) || savedAtMs > now || now - savedAtMs > RSVP_CONTINUITY_RETENTION_MS) {
    return null;
  }

  return updatedAt;
};

export const isFreshRsvpContinuityStorageValue = (rawValue: string | null, now = Date.now()) => (
  readRsvpContinuityUpdatedAt(rawValue, now) !== null
);

export const writeRsvpContinuityStoragePing = (storageKey: string, now = new Date()) => {
  const updatedAt = now.toISOString();

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(buildRsvpContinuityEnvelope(updatedAt)));
  } catch {
    // Ignore storage failures for continuity pings.
  }

  return updatedAt;
};
