#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function envValue(key, fallback = '') {
  if (process.env[key]) return String(process.env[key]);
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) return fallback;
  const match = readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .find((line) => line.startsWith(`${key}=`));
  if (!match) return fallback;
  return match.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, '');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function authHeaders(accessToken, anonKey) {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${accessToken || anonKey}`,
    'Content-Type': 'application/json',
  };
}

function restUrl(supabaseUrl, table, params = {}) {
  const search = new URLSearchParams(params);
  return `${supabaseUrl}/rest/v1/${table}${search.toString() ? `?${search.toString()}` : ''}`;
}

async function restFetch(url, headers, init = {}) {
  return fetch(url, {
    ...init,
    headers: {
      ...headers,
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(15_000),
  });
}

async function signInOwnerViaApi() {
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const email = envValue('V1_OWNER_EMAIL', 'test@gmail.com');
  const password = envValue('V1_OWNER_PASSWORD', '12345678');
  const signInUrl = new URL('/auth/v1/token', supabaseUrl);
  signInUrl.searchParams.set('grant_type', 'password');

  const response = await fetch(signInUrl, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  assert(response.ok, `Owner API sign-in failed: ${text}`);
  const parsed = JSON.parse(text);
  assert(parsed?.access_token, 'Owner API sign-in returned no access token.');
  assert(parsed?.user?.id, 'Owner API sign-in returned no user id.');

  return {
    supabaseUrl,
    supabaseAnonKey,
    accessToken: parsed.access_token,
    userId: parsed.user.id,
  };
}

async function resolveLiveGuestProofContext() {
  const { supabaseUrl, supabaseAnonKey, accessToken, userId } = await signInOwnerViaApi();
  const proofSiteSlug = envValue('V1_PROOF_SITE_SLUG', '').trim().toLowerCase();

  let siteRow = null;
  if (proofSiteSlug) {
    const response = await restFetch(
      restUrl(supabaseUrl, 'wedding_sites', {
        select: 'id,site_slug,user_id',
        site_slug: `eq.${proofSiteSlug}`,
        limit: '1',
      }),
      authHeaders(accessToken, supabaseAnonKey),
    );
    const text = await response.text();
    assert(response.ok, `Site lookup by slug failed: ${text}`);
    [siteRow] = JSON.parse(text);
  }

  if (!siteRow) {
    const response = await restFetch(
      restUrl(supabaseUrl, 'wedding_sites', {
        select: 'id,site_slug,user_id',
        user_id: `eq.${userId}`,
        order: 'created_at.asc',
        limit: '1',
      }),
      authHeaders(accessToken, supabaseAnonKey),
    );
    const text = await response.text();
    assert(response.ok, `Site lookup by owner failed: ${text}`);
    [siteRow] = JSON.parse(text);
  }

  assert(siteRow?.id, 'No proof site found.');
  assert(siteRow?.site_slug, 'Proof site has no slug.');

  const guestResponse = await restFetch(
    restUrl(supabaseUrl, 'guests', {
      select: 'id,name,email,invite_token',
      wedding_site_id: `eq.${siteRow.id}`,
      invite_token: 'not.is.null',
      order: 'created_at.asc',
      limit: '250',
    }),
    authHeaders(accessToken, supabaseAnonKey),
  );
  const guestText = await guestResponse.text();
  assert(guestResponse.ok, `Guest lookup failed: ${guestText}`);
  const guestRows = JSON.parse(guestText);
  const guestRow = guestRows.find((guest) => guest.invite_token && guest.email) ?? guestRows.find((guest) => guest.invite_token);

  assert(guestRow?.invite_token, 'No guest invite token found for proof site.');

  return {
    supabaseUrl,
    supabaseAnonKey,
    siteSlug: siteRow.site_slug,
    guestInviteToken: guestRow.invite_token,
  };
}

function hasVisibleTravelSpotlight({ travel, schedule, venues }) {
  const hasTravelText = [
    travel?.hotelInfo,
    travel?.parkingInfo,
    travel?.flightInfo,
    travel?.notes,
  ].some((value) => typeof value === 'string' && value.trim().length > 0);
  const hasStructuredTravel = ['hotels', 'roomBlocks', 'shuttles', 'visaTips', 'culturalTips']
    .some((key) => Array.isArray(travel?.[key]) && travel[key].length > 0);
  const hasSchedule = Array.isArray(schedule) && schedule.some((item) => typeof item?.label === 'string' && item.label.trim().length > 0);
  const hasVenues = Array.isArray(venues) && venues.some((venue) => {
    const name = typeof venue?.name === 'string' ? venue.name.trim() : '';
    const address = typeof venue?.address === 'string' ? venue.address.trim() : '';
    return Boolean(name || address);
  });
  return hasTravelText || hasStructuredTravel || hasSchedule || hasVenues;
}

async function main() {
  const startedAt = new Date().toISOString();
  const proofContext = await resolveLiveGuestProofContext();
  const publicSiteAccessResponse = await fetch(
    `${proofContext.supabaseUrl}/functions/v1/public-site-access`,
    {
      method: 'POST',
      headers: {
        apikey: proofContext.supabaseAnonKey,
        Authorization: `Bearer ${proofContext.supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'resolve',
        slug: proofContext.siteSlug,
        inviteToken: proofContext.guestInviteToken,
        language: 'fr',
      }),
      signal: AbortSignal.timeout(15_000),
    },
  );
  const publicSiteAccessText = await publicSiteAccessResponse.text();
  assert(publicSiteAccessResponse.ok, `public-site-access failed: ${publicSiteAccessText}`);
  const publicSiteAccess = JSON.parse(publicSiteAccessText);

  assert(publicSiteAccess?.status === 'open', `public-site-access did not open the proof site. Status: ${publicSiteAccess?.status ?? 'unknown'}`);
  assert(publicSiteAccess?.site?.render_model?.wedding, 'public-site-access returned no public wedding render model.');

  const wedding = publicSiteAccess.site.render_model.wedding;
  const travelVisible = hasVisibleTravelSpotlight({
    travel: wedding.travel ?? null,
    schedule: wedding.schedule ?? [],
    venues: wedding.venues ?? [],
  });
  assert(travelVisible, 'Live public travel data does not contain enough guest-safe content to build the travel spotlight.');

  console.log(JSON.stringify({
    ok: true,
    slice: 'travel-guest-portal-live-data',
    generatedAt: new Date().toISOString(),
    startedAt,
    proofContext: {
      siteSlug: proofContext.siteSlug,
      hasGuestInviteToken: true,
    },
    summary: {
      hasTravelText: ['hotelInfo', 'parkingInfo', 'flightInfo', 'notes']
        .some((key) => typeof wedding?.travel?.[key] === 'string' && wedding.travel[key].trim().length > 0),
      hotelCount: Array.isArray(wedding?.travel?.hotels) ? wedding.travel.hotels.length : 0,
      roomBlockCount: Array.isArray(wedding?.travel?.roomBlocks) ? wedding.travel.roomBlocks.length : 0,
      shuttleCount: Array.isArray(wedding?.travel?.shuttles) ? wedding.travel.shuttles.length : 0,
      venueCount: Array.isArray(wedding?.venues) ? wedding.venues.length : 0,
      scheduleCount: Array.isArray(wedding?.schedule) ? wedding.schedule.length : 0,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    slice: 'travel-guest-portal-live-data',
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exit(1);
});
