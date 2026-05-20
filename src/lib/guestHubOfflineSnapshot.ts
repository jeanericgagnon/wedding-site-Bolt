type GuestHubOfflineSettings = {
  rsvp_enabled: boolean;
  photos_enabled: boolean;
  guestbook_enabled: boolean;
  registry_enabled: boolean;
  schedule_enabled: boolean;
  travel_enabled: boolean;
  custom_message: string | null;
  language_default: string;
};

type GuestHubOfflineSiteSummary = {
  slug: string;
  coupleName1: string | null;
  coupleName2: string | null;
  weddingDate: string | null;
};

type GuestHubOfflineAnnouncement = {
  title?: string | null;
  detail?: string | null;
  status?: string | null;
  scheduledFor?: string | null;
  sentAt?: string | null;
};

type GuestHubOfflineGuestState = {
  guestName?: string | null;
  rsvpStatus?: string | null;
  checkedInAt?: string | null;
};

type GuestHubOfflineCoordinatorHandoff = {
  eventName?: string | null;
  handoffStatus?: string | null;
  leadName?: string | null;
  supportName?: string | null;
  note?: string | null;
  updatedAt?: string | null;
};

type GuestHubOfflineLinkAccess = {
  title?: string | null;
  badgeLabel?: string | null;
  detail?: string | null;
  summary?: string | null;
};

type GuestHubOfflineTravelContext = {
  schedule: Array<{ id?: string | null; label?: string | null; startTimeISO?: string | null; venueId?: string | null; notes?: string | null }>;
  venues: Array<{ id?: string | null; name?: string | null; address?: string | null }>;
};

export interface GuestHubOfflineSnapshot {
  settings: GuestHubOfflineSettings;
  siteSummary: GuestHubOfflineSiteSummary | null;
  announcement: GuestHubOfflineAnnouncement | null;
  guestState: GuestHubOfflineGuestState | null;
  coordinatorHandoff: GuestHubOfflineCoordinatorHandoff | null;
  linkAccess: GuestHubOfflineLinkAccess | null;
  travelContext: GuestHubOfflineTravelContext;
  savedAt: string;
}

export interface GuestHubOfflineSnapshotWriteInput extends Omit<GuestHubOfflineSnapshot, 'savedAt'> {
  savedAt?: string;
}

const SNAPSHOT_PREFIX = 'dayof.guestHub.offline.';
const SNAPSHOT_RETENTION_MS = 1000 * 60 * 60 * 24 * 7;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function trimString(value: unknown, max = 240): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function normalizeSnapshotSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

function sanitizeTravelContext(value: unknown): GuestHubOfflineTravelContext {
  if (!isRecord(value)) return { schedule: [], venues: [] };
  const schedule = Array.isArray(value.schedule)
    ? value.schedule.slice(0, 8).flatMap((entry) => {
        if (!isRecord(entry)) return [];
        return [{
          id: trimString(entry.id, 80),
          label: trimString(entry.label, 120),
          startTimeISO: trimString(entry.startTimeISO, 80),
          venueId: trimString(entry.venueId, 80),
          notes: trimString(entry.notes, 160),
        }];
      })
    : [];
  const venues = Array.isArray(value.venues)
    ? value.venues.slice(0, 8).flatMap((entry) => {
        if (!isRecord(entry)) return [];
        return [{
          id: trimString(entry.id, 80),
          name: trimString(entry.name, 120),
          address: trimString(entry.address, 200),
        }];
      })
    : [];
  return { schedule, venues };
}

export function getGuestHubOfflineSnapshotKey(slug: string): string {
  return `${SNAPSHOT_PREFIX}${normalizeSnapshotSlug(slug)}`;
}

export function sanitizeGuestHubOfflineSnapshot(value: unknown): GuestHubOfflineSnapshot | null {
  if (!isRecord(value)) return null;
  const savedAt = trimString(value.savedAt, 80);
  if (!savedAt || Number.isNaN(new Date(savedAt).getTime())) return null;

  const settingsSource = isRecord(value.settings) ? value.settings : {};
  const settings: GuestHubOfflineSettings = {
    rsvp_enabled: Boolean(settingsSource.rsvp_enabled),
    photos_enabled: Boolean(settingsSource.photos_enabled),
    guestbook_enabled: Boolean(settingsSource.guestbook_enabled),
    registry_enabled: Boolean(settingsSource.registry_enabled),
    schedule_enabled: Boolean(settingsSource.schedule_enabled),
    travel_enabled: Boolean(settingsSource.travel_enabled),
    custom_message: trimString(settingsSource.custom_message, 400),
    language_default: trimString(settingsSource.language_default, 16) || 'en',
  };

  const siteSummary = isRecord(value.siteSummary)
    ? {
        slug: trimString(value.siteSummary.slug, 120) || '',
        coupleName1: trimString(value.siteSummary.coupleName1, 80),
        coupleName2: trimString(value.siteSummary.coupleName2, 80),
        weddingDate: trimString(value.siteSummary.weddingDate, 20),
      }
    : null;

  const announcement = isRecord(value.announcement)
    ? {
        title: trimString(value.announcement.title, 140),
        detail: trimString(value.announcement.detail, 320),
        status: trimString(value.announcement.status, 40),
        scheduledFor: trimString(value.announcement.scheduledFor, 80),
        sentAt: trimString(value.announcement.sentAt, 80),
      }
    : null;

  const guestState = isRecord(value.guestState)
    ? {
        guestName: trimString(value.guestState.guestName, 80),
        rsvpStatus: trimString(value.guestState.rsvpStatus, 40),
        checkedInAt: trimString(value.guestState.checkedInAt, 80),
      }
    : null;

  const coordinatorHandoff = isRecord(value.coordinatorHandoff)
    ? {
        eventName: trimString(value.coordinatorHandoff.eventName, 120),
        handoffStatus: trimString(value.coordinatorHandoff.handoffStatus, 40),
        leadName: trimString(value.coordinatorHandoff.leadName, 80),
        supportName: trimString(value.coordinatorHandoff.supportName, 80),
        note: trimString(value.coordinatorHandoff.note, 320),
        updatedAt: trimString(value.coordinatorHandoff.updatedAt, 80),
      }
    : null;

  const linkAccess = isRecord(value.linkAccess)
    ? {
        title: trimString(value.linkAccess.title, 80),
        badgeLabel: trimString(value.linkAccess.badgeLabel, 40),
        detail: trimString(value.linkAccess.detail, 220),
        summary: trimString(value.linkAccess.summary, 160),
      }
    : null;

  return {
    settings,
    siteSummary,
    announcement,
    guestState,
    coordinatorHandoff,
    linkAccess,
    travelContext: sanitizeTravelContext(value.travelContext),
    savedAt,
  };
}

export function writeGuestHubOfflineSnapshot(slug: string, snapshot: GuestHubOfflineSnapshotWriteInput): GuestHubOfflineSnapshot | null {
  if (typeof window === 'undefined') return null;
  const normalizedSlug = normalizeSnapshotSlug(slug);
  const savedSnapshot = sanitizeGuestHubOfflineSnapshot({
    ...snapshot,
    siteSummary: snapshot.siteSummary
      ? {
          ...snapshot.siteSummary,
          slug: normalizedSlug,
        }
      : snapshot.siteSummary,
    savedAt: snapshot.savedAt ?? new Date().toISOString(),
  });
  if (!savedSnapshot) return null;
  window.localStorage.setItem(getGuestHubOfflineSnapshotKey(slug), JSON.stringify(savedSnapshot));
  return savedSnapshot;
}

export function readGuestHubOfflineSnapshot(slug: string): GuestHubOfflineSnapshot | null {
  if (typeof window === 'undefined') return null;
  const key = getGuestHubOfflineSnapshotKey(slug);
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const snapshot = sanitizeGuestHubOfflineSnapshot(JSON.parse(raw));
    if (!snapshot) {
      window.localStorage.removeItem(key);
      return null;
    }
    const normalizedSlug = normalizeSnapshotSlug(slug);
    const snapshotSlug = snapshot.siteSummary?.slug ? normalizeSnapshotSlug(snapshot.siteSummary.slug) : null;
    if (snapshotSlug && snapshotSlug !== normalizedSlug) {
      window.localStorage.removeItem(key);
      return null;
    }
    const savedAt = new Date(snapshot.savedAt).getTime();
    if (!Number.isFinite(savedAt) || Date.now() - savedAt > SNAPSHOT_RETENTION_MS) {
      window.localStorage.removeItem(key);
      return null;
    }
    return snapshot;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}
