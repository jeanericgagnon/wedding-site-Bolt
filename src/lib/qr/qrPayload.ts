import type { CoordinatorDoorStatusContext } from '../coordinatorCheckInStatus';
import {
  getCoordinatorDoorExceptionStateLabel,
  getCoordinatorDoorExceptionStates,
  getCoordinatorEventCheckInAt,
  getCoordinatorEventTableName,
  isCoordinatorGuestInvitedToCurrentEvent,
} from '../coordinatorCheckInStatus';
import type { GuestLiteForCoordinator } from '../coordinatorTypes';
import { getGuestInviteTokenFromSearch, getInviteTokenFromSearch } from '../publicAccessArtifacts';
import { normalizePublicSiteSlug } from '../publicSiteSlug';
import { hasTokenishQrData, isAllowedDayOfHost, isUnsafeQrHostname } from './qrScannerSecurity';

const DIRECT_TOKEN_PATTERN = /^[a-z0-9][a-z0-9_-]{5,}$/i;

export type ParsedDayOfQrPayload =
  | { kind: 'guest-invite-token'; token: string; source: string; href: string | null; siteSlug: string | null }
  | { kind: 'public-event-url'; source: string; href: string; siteSlug: string | null }
  | { kind: 'unknown-dayof-url'; source: string; href: string; siteSlug: string | null }
  | { kind: 'invalid'; source: string; reason: 'malformed' | 'unsafe-host' | 'unsupported-scheme' | 'wrong-host' };

export type CoordinatorQrResolution =
  | {
    status: 'success';
    source: string;
    guest: GuestLiteForCoordinator;
    title: string;
    detail: string;
    warnings: string[];
  }
  | {
    status: 'already-checked-in';
    source: string;
    guest: GuestLiteForCoordinator;
    title: string;
    detail: string;
    warnings: string[];
    checkedInAt: string;
  }
  | {
    status: 'wrong-event';
    source: string;
    guest: GuestLiteForCoordinator;
    title: string;
    detail: string;
    warnings: string[];
  }
  | {
    status: 'needs-review';
    source: string;
    guest: GuestLiteForCoordinator;
    title: string;
    detail: string;
    warnings: string[];
  }
  | {
    status: 'wrong-site' | 'malformed' | 'expired-invalid-token';
    source: string;
    title: string;
    detail: string;
    warnings: string[];
  };

export function parseDayOfQrPayload(input: string, options?: {
  currentOrigin?: string | null;
  currentHost?: string | null;
}): ParsedDayOfQrPayload {
  const source = input.trim();
  if (!source) return { kind: 'invalid', source, reason: 'malformed' };

  if (DIRECT_TOKEN_PATTERN.test(source)) {
    return {
      kind: 'guest-invite-token',
      token: source,
      source,
      href: null,
      siteSlug: null,
    };
  }

  const fallbackOriginCandidate = options?.currentOrigin?.trim() || 'https://dayof.love';
  const fallbackOrigin = getSafeFallbackOrigin(fallbackOriginCandidate);
  const looksRelative = source.startsWith('/') || source.startsWith('?');
  const candidate = looksRelative ? `${fallbackOrigin}${source}` : source;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { kind: 'invalid', source, reason: 'malformed' };
  }

  if (url.protocol !== 'https:') {
    return { kind: 'invalid', source, reason: 'unsupported-scheme' };
  }
  if (url.username || url.password || isUnsafeQrHostname(url.hostname)) {
    return { kind: 'invalid', source, reason: 'unsafe-host' };
  }
  if (!looksRelative && !isAllowedDayOfHost(url.hostname, options?.currentHost)) {
    return { kind: 'invalid', source, reason: 'wrong-host' };
  }

  const siteSlugFromPath = normalizePublicSiteSlug(url.pathname);
  const siteSlugFromHost = normalizePublicSiteSlug(url.hostname);
  const siteSlug = siteSlugFromPath ?? siteSlugFromHost ?? null;
  const publicInviteToken = getInviteTokenFromSearch(url.searchParams);
  const guestInviteToken = getGuestInviteTokenFromSearch(url.searchParams);

  if (publicInviteToken || guestInviteToken) {
    return {
      kind: 'guest-invite-token',
      token: guestInviteToken ?? publicInviteToken ?? '',
      source,
      href: `${url.pathname}${url.search}${url.hash}`,
      siteSlug,
    };
  }

  if (url.pathname.startsWith('/event/') || url.pathname.startsWith('/site/')) {
    return {
      kind: 'public-event-url',
      source,
      href: `${url.pathname}${url.search}${url.hash}`,
      siteSlug,
    };
  }

  return {
    kind: 'unknown-dayof-url',
    source,
    href: `${url.pathname}${url.search}${url.hash}`,
    siteSlug,
  };
}

function getSafeFallbackOrigin(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || isUnsafeQrHostname(url.hostname)) return 'https://dayof.love';
    return `${url.protocol}//${url.host}`;
  } catch {
    return 'https://dayof.love';
  }
}

export function resolveCoordinatorQrPayload(
  input: string,
  args: {
    siteSlug: string | null;
    currentEventName: string | null;
    checkInStatusContext: CoordinatorDoorStatusContext;
  },
): CoordinatorQrResolution {
  const parsed = parseDayOfQrPayload(input, {
    currentOrigin: typeof window !== 'undefined' ? window.location.origin : 'https://dayof.love',
    currentHost: typeof window !== 'undefined' ? window.location.host : 'dayof.love',
  });

  if (parsed.kind === 'invalid') {
    return {
      status: parsed.reason === 'malformed' ? 'malformed' : 'expired-invalid-token',
      source: parsed.source,
      title: parsed.reason === 'malformed' ? 'Malformed QR' : 'Invalid QR',
      detail: parsed.reason === 'malformed'
        ? 'Malformed QR. Search the guest manually.'
        : parsed.reason === 'wrong-host'
          ? 'Wrong wedding site. Search the guest manually or route the arrival to help desk.'
        : parsed.reason === 'unsafe-host'
          ? 'This code uses an unsafe destination and was blocked.'
          : 'Invalid or expired QR. Search the guest manually or route the arrival to help desk.',
      warnings: [],
    };
  }

  if (parsed.siteSlug && args.siteSlug && parsed.siteSlug !== args.siteSlug) {
    return {
      status: 'wrong-site',
      source: parsed.source,
      title: 'Wrong site',
      detail: `Wrong wedding site. This QR belongs to ${parsed.siteSlug}, not this live site.`,
      warnings: [],
    };
  }

  if (parsed.kind === 'public-event-url' || parsed.kind === 'unknown-dayof-url') {
    return {
      status: 'expired-invalid-token',
      source: parsed.source,
      title: 'Public hub QR detected',
      detail: 'This code opens the public guest hub, not a private check-in code. Search the guest manually or use a guest RSVP/check-in QR.',
      warnings: [],
    };
  }

  const allGuests = args.checkInStatusContext.guests ?? [];
  const guest = allGuests.find((candidate) => (candidate.invite_token ?? '').trim().toLowerCase() === parsed.token.trim().toLowerCase());
  if (!guest) {
    return {
      status: 'expired-invalid-token',
      source: parsed.source,
      title: 'Invalid or expired code',
      detail: 'Invalid or expired QR. Search the guest manually or route the arrival to help desk.',
      warnings: [],
    };
  }

  if (!isCoordinatorGuestInvitedToCurrentEvent(guest, args.checkInStatusContext)) {
    return {
      status: 'wrong-event',
      source: parsed.source,
      guest,
      title: 'Wrong event guest',
      detail: args.currentEventName
        ? `${guest.name} is not invited to ${args.currentEventName}. Route this to the exception desk instead of checking them in.`
        : `${guest.name} is not invited to the current event. Route this to the exception desk instead of checking them in.`,
      warnings: getCoordinatorDoorExceptionStates(guest, args.checkInStatusContext).map(getCoordinatorDoorExceptionStateLabel),
    };
  }

  const checkedInAt = getCoordinatorEventCheckInAt(guest, args.checkInStatusContext.currentEventId);
  const tableName = getCoordinatorEventTableName(guest, args.checkInStatusContext.currentEventId);
  const warnings = getCoordinatorDoorExceptionStates(guest, args.checkInStatusContext)
    .filter((state) => state !== 'already-checked-in')
    .map(getCoordinatorDoorExceptionStateLabel);

  if (checkedInAt) {
    return {
      status: 'already-checked-in',
      source: parsed.source,
      guest,
      title: 'Already checked in',
      detail: `${guest.name} is already checked in${tableName ? ` at ${tableName}` : ''}.`,
      warnings,
      checkedInAt,
    };
  }

  if (warnings.length > 0) {
    return {
      status: 'needs-review',
      source: parsed.source,
      guest,
      title: `${guest.name} needs review before check-in`,
      detail: [
        args.currentEventName ? `${args.currentEventName}` : null,
        guest.rsvp_status ? `RSVP ${guest.rsvp_status}` : null,
        tableName ? tableName : 'Needs seating/help desk',
      ].filter(Boolean).join(' · '),
      warnings,
    };
  }

  return {
    status: 'success',
    source: parsed.source,
    guest,
    title: guest.name,
    detail: [
      args.currentEventName ? `${args.currentEventName}` : null,
      guest.rsvp_status ? `RSVP ${guest.rsvp_status}` : null,
      tableName ? tableName : 'Needs seating/help desk',
    ].filter(Boolean).join(' · '),
    warnings,
  };
}

export function isPrivateQrPayloadForThirdPartyQr(value: string): boolean {
  const parsed = parseDayOfQrPayload(value, { currentOrigin: 'https://dayof.love', currentHost: 'dayof.love' });
  if (parsed.kind === 'guest-invite-token') return true;
  if (parsed.kind === 'invalid') return true;

  try {
    const url = new URL(parsed.href ? `https://dayof.love${parsed.href}` : value, 'https://dayof.love');
    return hasTokenishQrData(url);
  } catch {
    return true;
  }
}
