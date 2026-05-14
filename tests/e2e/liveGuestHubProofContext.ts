import { expect, type Page } from '@playwright/test';
import {
  authHeaders,
  envValue,
  readOwnerAuthState,
  restFetch,
  restUrl,
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

export type LiveGuestHubProofContext = {
  siteId: string;
  siteSlug: string;
  guestInviteToken: string;
  guestName: string;
  guestEmail: string | null;
};

function formatGuestName(guest: GuestRow): string {
  return guest.name?.trim() || [guest.first_name, guest.last_name].filter(Boolean).join(' ').trim() || 'Guest';
}

export async function resolveLiveGuestHubProofContext(page: Page): Promise<LiveGuestHubProofContext> {
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const proofSiteSlug = envValue('V1_PROOF_SITE_SLUG', '').trim().toLowerCase();
  const authState = await readOwnerAuthState(page);

  expect(authState.token || supabaseAnonKey).toBeTruthy();

  let siteRow: SiteRow | null = null;

  if (proofSiteSlug) {
    const response = await restFetch(
      restUrl(supabaseUrl, 'wedding_sites', {
        select: 'id,site_slug,user_id',
        site_slug: `eq.${proofSiteSlug}`,
        limit: '1',
      }),
      authHeaders(authState.token, supabaseAnonKey),
    );
    const text = await response.text();
    expect(response.ok, text).toBeTruthy();
    const [row] = JSON.parse(text) as SiteRow[];
    siteRow = row ?? null;
  }

  if (!siteRow && authState.activeSiteId) {
    const response = await restFetch(
      restUrl(supabaseUrl, 'wedding_sites', {
        select: 'id,site_slug,user_id',
        id: `eq.${authState.activeSiteId}`,
        limit: '1',
      }),
      authHeaders(authState.token, supabaseAnonKey),
    );
    const text = await response.text();
    expect(response.ok, text).toBeTruthy();
    const [row] = JSON.parse(text) as SiteRow[];
    siteRow = row ?? null;
  }

  if (!siteRow && authState.userId) {
    const response = await restFetch(
      restUrl(supabaseUrl, 'wedding_sites', {
        select: 'id,site_slug,user_id',
        user_id: `eq.${authState.userId}`,
        order: 'created_at.asc',
        limit: '1',
      }),
      authHeaders(authState.token, supabaseAnonKey),
    );
    const text = await response.text();
    expect(response.ok, text).toBeTruthy();
    const [row] = JSON.parse(text) as SiteRow[];
    siteRow = row ?? null;
  }

  expect(siteRow?.id).toBeTruthy();
  expect(siteRow?.site_slug).toBeTruthy();

  const guestResponse = await restFetch(
    restUrl(supabaseUrl, 'guests', {
      select: 'id,name,first_name,last_name,email,invite_token',
      wedding_site_id: `eq.${siteRow!.id}`,
      invite_token: 'not.is.null',
      order: 'created_at.asc',
      limit: '250',
    }),
    authHeaders(authState.token, supabaseAnonKey),
  );
  const guestText = await guestResponse.text();
  expect(guestResponse.ok, guestText).toBeTruthy();
  const guestRows = JSON.parse(guestText) as GuestRow[];
  const guestRow = guestRows.find((guest) => guest.invite_token && guest.email) ?? guestRows.find((guest) => guest.invite_token);

  expect(guestRow?.id).toBeTruthy();
  expect(guestRow?.invite_token).toBeTruthy();

  return {
    siteId: siteRow!.id,
    siteSlug: siteRow!.site_slug!.trim(),
    guestInviteToken: guestRow!.invite_token!,
    guestName: formatGuestName(guestRow!),
    guestEmail: guestRow!.email ?? null,
  };
}
