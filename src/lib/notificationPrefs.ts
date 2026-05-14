export type DigestCadence = 'daily' | 'weekly' | 'paused';

export type NotificationPrefs = {
  digest: boolean;
  digestCadence: DigestCadence;
  digestIncludePlanner: boolean;
  digestQuietUntilLabel: string | null;
  digestNextDeliveryAt: string | null;
  digestLastReviewedAt: string | null;
  digestLastDeliveredAt: string | null;
  photos: boolean;
  rsvp: boolean;
  updates: boolean;
};

type NotificationPrefsRecord = Record<string, unknown> | null | undefined;

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  digest: false,
  digestCadence: 'paused',
  digestIncludePlanner: false,
  digestQuietUntilLabel: null,
  digestNextDeliveryAt: null,
  digestLastReviewedAt: null,
  digestLastDeliveredAt: null,
  photos: true,
  rsvp: true,
  updates: false,
};

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readCadence(value: unknown, digestEnabled: boolean): DigestCadence {
  if (value === 'daily' || value === 'weekly' || value === 'paused') {
    return value;
  }
  return digestEnabled ? 'weekly' : 'paused';
}

function readQuietLabel(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readIsoString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return Number.isNaN(Date.parse(trimmed)) ? null : trimmed;
}

export function normalizeNotificationPrefs(input: NotificationPrefsRecord): NotificationPrefs {
  const prefs = input ?? {};
  const digest = readBoolean(prefs.digest, DEFAULT_NOTIFICATION_PREFS.digest);
  const digestCadence = readCadence(prefs.digest_cadence, digest);
  const digestQuietUntilLabel = readQuietLabel(prefs.digest_quiet_until_label);

  return {
    digest,
    digestCadence,
    digestIncludePlanner: readBoolean(prefs.digest_include_planner, DEFAULT_NOTIFICATION_PREFS.digestIncludePlanner),
    digestQuietUntilLabel,
    digestNextDeliveryAt: readIsoString(prefs.digest_next_delivery_at),
    digestLastReviewedAt: readIsoString(prefs.digest_last_reviewed_at),
    digestLastDeliveredAt: readIsoString(prefs.digest_last_delivered_at),
    photos: readBoolean(prefs.photos, DEFAULT_NOTIFICATION_PREFS.photos),
    rsvp: readBoolean(prefs.rsvp, DEFAULT_NOTIFICATION_PREFS.rsvp),
    updates: readBoolean(prefs.updates, DEFAULT_NOTIFICATION_PREFS.updates),
  };
}

export function buildNotificationPrefsPatch(input: NotificationPrefs): Record<string, unknown> {
  return {
    rsvp: input.rsvp,
    photos: input.photos,
    digest: input.digest,
    digest_cadence: input.digestCadence,
    digest_include_planner: input.digestIncludePlanner,
    digest_quiet_until_label: input.digestQuietUntilLabel,
    digest_next_delivery_at: input.digestNextDeliveryAt,
    digest_last_reviewed_at: input.digestLastReviewedAt,
    digest_last_delivered_at: input.digestLastDeliveredAt,
    updates: input.updates,
  };
}

export function computeNextDigestDeliveryAt(cadence: DigestCadence, now = new Date()): string | null {
  if (cadence === 'paused') return null;
  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setHours(9, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  if (cadence === 'weekly') {
    next.setDate(next.getDate() + 6);
  }
  return next.toISOString();
}
