export interface AnalyticsEventSummaryInputRow {
  event_type: string | null;
  target: string | null;
  created_at: string | null;
}

export interface AnalyticsEventSummary {
  lookbackDays: number;
  totalTrackedEvents: number;
  pageViews: number;
  siteVisits: number;
  inviteOpens: number;
  qrScans: number;
  recapViews: number;
  totalClicks: number;
  rsvpClicks: number;
  registryClicks: number;
  photoClicks: number;
  travelClicks: number;
  scheduleClicks: number;
  guestbookClicks: number;
  vaultClicks: number;
  contactClicks: number;
  lastTrackedAt: string | null;
}

export function buildEmptyAnalyticsEventSummary(lookbackDays = 30): AnalyticsEventSummary {
  return {
    lookbackDays,
    totalTrackedEvents: 0,
    pageViews: 0,
    siteVisits: 0,
    inviteOpens: 0,
    qrScans: 0,
    recapViews: 0,
    totalClicks: 0,
    rsvpClicks: 0,
    registryClicks: 0,
    photoClicks: 0,
    travelClicks: 0,
    scheduleClicks: 0,
    guestbookClicks: 0,
    vaultClicks: 0,
    contactClicks: 0,
    lastTrackedAt: null,
  };
}

function isInviteOpenTarget(target: string | null): boolean {
  if (!target) return false;
  return target === '/event/invite'
    || target === '/site/invite'
    || target === '/rsvp/invite'
    || target === '/rsvp-event/invite'
    || target === '/guest-contact/invite'
    || target === '/guestbook/invite'
    || target === '/photos/upload/invite'
    || target === '/vault/invite'
    || target === '/vault/invite/year';
}

function normalizeInternalTarget(value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const parsed = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? new URL(trimmed)
      : new URL(trimmed, 'https://dayof.love');
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return trimmed;
  }
}

function isTrackedWithinLookback(createdAt: string | null, cutoffMs: number): boolean {
  if (!createdAt) return false;
  const createdMs = new Date(createdAt).getTime();
  return Number.isFinite(createdMs) && createdMs >= cutoffMs;
}

export function buildAnalyticsEventSummary(
  rows: AnalyticsEventSummaryInputRow[],
  options?: { lookbackDays?: number; now?: number },
): AnalyticsEventSummary {
  const lookbackDays = options?.lookbackDays ?? 30;
  const now = options?.now ?? Date.now();
  const cutoffMs = now - lookbackDays * 24 * 60 * 60 * 1000;
  const summary = buildEmptyAnalyticsEventSummary(lookbackDays);

  for (const row of rows) {
    if (!isTrackedWithinLookback(row.created_at, cutoffMs)) continue;

    const eventType = String(row.event_type ?? '').trim().toLowerCase();
    const target = normalizeInternalTarget(row.target);
    summary.totalTrackedEvents += 1;

    if (!summary.lastTrackedAt || new Date(row.created_at as string).getTime() > new Date(summary.lastTrackedAt).getTime()) {
      summary.lastTrackedAt = row.created_at;
    }

    if (eventType === 'view') {
      if (target === '/event' || target === '/site') {
        summary.pageViews += 1;
        summary.siteVisits += 1;
      } else if (isInviteOpenTarget(target)) {
        summary.pageViews += 1;
        summary.inviteOpens += 1;
      } else if (target === '/event/qr' || target === '/site/qr') {
        summary.pageViews += 1;
        summary.qrScans += 1;
      } else if (target === '/event/recap' || target === '/event/recap/invite') {
        summary.recapViews += 1;
      } else if (target?.startsWith('/event/')) {
        summary.pageViews += 1;
      }
      continue;
    }

    if (eventType !== 'click' || !target) continue;

    summary.totalClicks += 1;
    if (target.includes('#rsvp') || target === '/rsvp') summary.rsvpClicks += 1;
    if (target.includes('#registry') || target.startsWith('/registry')) summary.registryClicks += 1;
    if (target.includes('#travel')) summary.travelClicks += 1;
    if (target.includes('#schedule')) summary.scheduleClicks += 1;
    if (target.startsWith('/photos/upload')) summary.photoClicks += 1;
    if (target.startsWith('/guestbook/')) summary.guestbookClicks += 1;
    if (target.startsWith('/vault/')) summary.vaultClicks += 1;
    if (target.startsWith('/guest-contact/')) summary.contactClicks += 1;
  }

  return summary;
}
