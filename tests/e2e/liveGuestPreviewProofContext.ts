import { expect, type Page } from '@playwright/test';
import {
  authHeaders,
  envValue,
  readOwnerAuthState,
  restFetch,
  restUrl,
  signInOwnerViaApi,
} from './liveOwnerSession';

type SiteRow = {
  id: string;
  site_slug: string | null;
  user_id?: string | null;
};

type GuestRow = {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  invite_token: string | null;
};

type ItineraryEventRow = {
  id: string;
  event_name: string | null;
};

type EventInvitationRow = {
  guest_id: string | null;
  event_id: string | null;
};

export type LiveGuestPreviewProofGuest = {
  id: string;
  guestName: string;
  guestEmail: string | null;
  guestInviteToken: string;
  visibleEventNames: string[];
  hiddenEventNames: string[];
};

export type LiveGuestPreviewVisibilityPair = {
  siteId: string;
  siteSlug: string;
  visibleEventName: string;
  rightGuest: LiveGuestPreviewProofGuest;
  wrongGuest: LiveGuestPreviewProofGuest;
};

function formatGuestName(guest: GuestRow): string {
  return guest.name?.trim() || [guest.first_name, guest.last_name].filter(Boolean).join(' ').trim() || 'Guest';
}

async function resolveVisibleSiteSlug(page?: Page): Promise<string> {
  if (!page) return '';

  const siteHref = await page
    .locator('a[href^="/site/"]')
    .first()
    .getAttribute('href', { timeout: 1_500 })
    .catch(() => null);
  if (siteHref) {
    const match = siteHref.match(/\/site\/([^/?#]+)/i);
    if (match?.[1]) return decodeURIComponent(match[1]).trim().toLowerCase();
  }

  const sidebarText = await page
    .locator('text=/\\.dayof\\.love$/i')
    .first()
    .textContent({ timeout: 1_500 })
    .catch(() => null);
  if (!sidebarText) return '';
  return sidebarText.replace(/\.dayof\.love$/i, '').trim().toLowerCase();
}

async function resolveOwnerSite(page?: Page): Promise<{ supabaseUrl: string; supabaseAnonKey: string; siteRow: SiteRow }> {
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const proofSiteSlug = envValue('V1_PROOF_SITE_SLUG', '').trim().toLowerCase() || await resolveVisibleSiteSlug(page);
  const apiSession = await signInOwnerViaApi();
  const authState = page
    ? await readOwnerAuthState(page)
    : { token: '', userId: '', activeSiteId: '' };
  const accessToken = authState.token || apiSession.accessToken;
  const ownerUserId = authState.userId || apiSession.userId;

  expect(accessToken || supabaseAnonKey).toBeTruthy();

  let siteRow: SiteRow | null = null;

  if (authState.activeSiteId) {
    const response = await restFetch(
      restUrl(supabaseUrl, 'wedding_sites', {
        select: 'id,site_slug,user_id',
        id: `eq.${authState.activeSiteId}`,
        limit: '1',
      }),
      authHeaders(accessToken, supabaseAnonKey),
    );
    const text = await response.text();
    expect(response.ok, text).toBeTruthy();
    const [row] = JSON.parse(text) as SiteRow[];
    siteRow = row ?? null;
  }

  if (!siteRow && proofSiteSlug) {
    const response = await restFetch(
      restUrl(supabaseUrl, 'wedding_sites', {
        select: 'id,site_slug,user_id',
        site_slug: `eq.${proofSiteSlug}`,
        limit: '1',
      }),
      authHeaders(accessToken, supabaseAnonKey),
    );
    const text = await response.text();
    expect(response.ok, text).toBeTruthy();
    const [row] = JSON.parse(text) as SiteRow[];
    siteRow = row ?? null;
  }

  if (!siteRow && ownerUserId) {
    const response = await restFetch(
      restUrl(supabaseUrl, 'wedding_sites', {
        select: 'id,site_slug,user_id',
        user_id: `eq.${ownerUserId}`,
        order: 'created_at.asc',
        limit: '1',
      }),
      authHeaders(accessToken, supabaseAnonKey),
    );
    const text = await response.text();
    expect(response.ok, text).toBeTruthy();
    const [row] = JSON.parse(text) as SiteRow[];
    siteRow = row ?? null;
  }

  expect(siteRow?.id).toBeTruthy();
  expect(siteRow?.site_slug).toBeTruthy();

  return { supabaseUrl, supabaseAnonKey, siteRow: siteRow! };
}

export async function resolveLiveGuestPreviewVisibilityPair(page?: Page): Promise<LiveGuestPreviewVisibilityPair> {
  const { supabaseUrl, supabaseAnonKey, siteRow } = await resolveOwnerSite(page);
  const apiSession = await signInOwnerViaApi();
  const authState = page
    ? await readOwnerAuthState(page)
    : { token: '', userId: '', activeSiteId: '' };
  const accessToken = authState.token || apiSession.accessToken;

  const [eventsResponse, guestsResponse] = await Promise.all([
    restFetch(
      restUrl(supabaseUrl, 'itinerary_events', {
        select: 'id,event_name',
        wedding_site_id: `eq.${siteRow.id}`,
        order: 'event_date.asc.nullslast,event_name.asc',
        limit: '250',
      }),
      authHeaders(accessToken, supabaseAnonKey),
    ),
    restFetch(
      restUrl(supabaseUrl, 'guests', {
        select: 'id,name,first_name,last_name,email,invite_token',
        wedding_site_id: `eq.${siteRow.id}`,
        invite_token: 'not.is.null',
        order: 'created_at.asc',
        limit: '250',
      }),
      authHeaders(accessToken, supabaseAnonKey),
    ),
  ]);

  const eventsText = await eventsResponse.text();
  expect(eventsResponse.ok, eventsText).toBeTruthy();
  const events = (JSON.parse(eventsText) as ItineraryEventRow[]).filter((event) => event.id && event.event_name);
  expect(events.length).toBeGreaterThanOrEqual(2);

  const guestsText = await guestsResponse.text();
  expect(guestsResponse.ok, guestsText).toBeTruthy();
  const guests = (JSON.parse(guestsText) as GuestRow[]).filter((guest) => guest.invite_token);
  expect(guests.length).toBeGreaterThan(0);

  const eventIds = events.map((event) => event.id).filter(Boolean);
  expect(eventIds.length).toBeGreaterThan(0);

  const invitationsResponse = await restFetch(
    restUrl(supabaseUrl, 'event_invitations', {
      select: 'guest_id,event_id',
      event_id: `in.(${eventIds.join(',')})`,
      limit: '5000',
    }),
    authHeaders(accessToken, supabaseAnonKey),
  );
  const invitationsText = await invitationsResponse.text();
  expect(invitationsResponse.ok, invitationsText).toBeTruthy();
  const invitations = (JSON.parse(invitationsText) as EventInvitationRow[])
    .filter((row) => row.guest_id && row.event_id);

  const eventNameById = new Map(events.map((event) => [event.id, event.event_name!.trim()]));
  const invitationMap = new Map<string, Set<string>>();
  for (const invitation of invitations) {
    const guestId = invitation.guest_id!;
    const eventId = invitation.event_id!;
    if (!invitationMap.has(guestId)) invitationMap.set(guestId, new Set<string>());
    invitationMap.get(guestId)!.add(eventId);
  }

  const guestSummaries = guests.map((guest) => {
    const invitedIds = invitationMap.get(guest.id) ?? new Set<string>();
    const visibleEventNames = events
      .filter((event) => invitedIds.has(event.id))
      .map((event) => event.event_name!.trim());
    const hiddenEventNames = events
      .filter((event) => !invitedIds.has(event.id))
      .map((event) => event.event_name!.trim());
    return {
      id: guest.id,
      guestName: formatGuestName(guest),
      guestEmail: guest.email ?? null,
      guestInviteToken: guest.invite_token!,
      visibleEventNames,
      hiddenEventNames,
    };
  });

  let chosenPair: LiveGuestPreviewVisibilityPair | null = null;
  for (const event of events) {
    const eventName = eventNameById.get(event.id);
    if (!eventName) continue;
    const rightGuest = guestSummaries.find((guest) => guest.visibleEventNames.includes(eventName));
    const wrongGuest = guestSummaries.find((guest) => guest.hiddenEventNames.includes(eventName));
    if (rightGuest && wrongGuest) {
      chosenPair = {
        siteId: siteRow.id,
        siteSlug: siteRow.site_slug!.trim(),
        visibleEventName: eventName,
        rightGuest,
        wrongGuest,
      };
      break;
    }
  }

  expect(chosenPair).toBeTruthy();
  return chosenPair!;
}
