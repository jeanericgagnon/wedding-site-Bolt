import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

test.skip(process.env.LIVE_PLANNING_SONGS_ADDRESSES !== '1', 'Set LIVE_PLANNING_SONGS_ADDRESSES=1 to prove planning song requests and address collection.');

function envValue(key: string, fallback = '') {
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

test('planning song requests and address collection are live and persisted', async ({ page }) => {
  test.setTimeout(120_000);
  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const proofSiteSlug = process.env.V1_PROOF_SITE_SLUG || 'maya-and-leo';
  const runId = `${Date.now()}`;
  const playlistUrl = `https://open.spotify.com/playlist/dayof-qa-${runId}`;
  const guestEmail = `dayof.songqa.${runId}@example.com`;
  const guestName = `Song Guest ${runId}`;
  const songAnswer = `September - Earth Wind Fire QA ${runId}`;
  let ownerAccessToken = '';
  let siteId = '';
  let guestId = '';
  let originalPlaylistUrl: string | null = null;
  let originalQuestions: unknown[] = [];

  const authHeaders = () => ({
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${ownerAccessToken || supabaseAnonKey}`,
    'Content-Type': 'application/json',
  });

  const restUrl = (table: string, params: Record<string, string>) => {
    const search = new URLSearchParams(params);
    return `${supabaseUrl}/rest/v1/${table}?${search.toString()}`;
  };

  const restFetch = async (url: string, init: RequestInit = {}) => fetch(url, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(10_000),
  });

  const cleanup = async () => {
    if (guestId) {
      await restFetch(restUrl('rsvps', { guest_id: `eq.${guestId}` }), { method: 'DELETE' });
      await restFetch(restUrl('guests', { id: `eq.${guestId}` }), { method: 'DELETE' });
    } else {
      await restFetch(restUrl('guests', { email: `eq.${guestEmail}` }), { method: 'DELETE' });
    }
    if (siteId) {
      await restFetch(restUrl('wedding_sites', { id: `eq.${siteId}` }), {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          music_playlist_url: originalPlaylistUrl,
          rsvp_custom_questions: originalQuestions,
        }),
      });
    }
  };

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('your@email.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  ownerAccessToken = await page.evaluate(() => {
    for (const [key, value] of Object.entries(window.localStorage)) {
      if (!key.includes('auth-token')) continue;
      try {
        const parsed = JSON.parse(String(value)) as { access_token?: string; currentSession?: { access_token?: string } };
        const token = parsed.access_token || parsed.currentSession?.access_token || '';
        if (token) return token;
      } catch {
        // Keep scanning.
      }
    }
    return '';
  });
  expect(ownerAccessToken || supabaseAnonKey).toBeTruthy();

  const siteResponse = await restFetch(restUrl('wedding_sites', {
    select: 'id,music_playlist_url,rsvp_custom_questions',
    site_slug: `eq.${proofSiteSlug}`,
    limit: '1',
  }));
  expect(siteResponse.ok).toBeTruthy();
  const [site] = await siteResponse.json() as Array<{ id: string; music_playlist_url: string | null; rsvp_custom_questions: unknown[] | null }>;
  expect(site?.id).toBeTruthy();
  siteId = site.id;
  originalPlaylistUrl = site.music_playlist_url ?? null;
  originalQuestions = Array.isArray(site.rsvp_custom_questions) ? site.rsvp_custom_questions : [];

  try {
    const guestInsert = await restFetch(`${supabaseUrl}/rest/v1/guests`, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        wedding_site_id: siteId,
        name: guestName,
        email: guestEmail,
        invite_token: `songqa-${runId}`,
        rsvp_status: 'confirmed',
      }),
    });
    const guestInsertText = await guestInsert.text();
    expect(guestInsert.ok, guestInsertText).toBeTruthy();
    const [guest] = JSON.parse(guestInsertText) as Array<{ id: string }>;
    guestId = guest.id;

    const rsvpInsert = await restFetch(`${supabaseUrl}/rest/v1/rsvps`, {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        guest_id: guestId,
        attending: true,
        custom_answers: { song_request: songAnswer },
      }),
    });
    const rsvpInsertText = await rsvpInsert.text();
    expect(rsvpInsert.ok, rsvpInsertText).toBeTruthy();

    await page.goto(`/dashboard/planning?bypassPayment=1&tab=songs&songQa=${runId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Planner' }).first()).toBeVisible();
    await expect(page.getByText('Shared playlist + RSVP song requests')).toBeVisible();
    await page.getByPlaceholder('https://open.spotify.com/playlist/...').fill(playlistUrl);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Playlist link saved.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open', exact: true })).toHaveAttribute('href', playlistUrl);

    await page.getByRole('button', { name: /Add RSVP song question|RSVP song question enabled/i }).click().catch(() => {});
    await expect(page.getByRole('button', { name: 'RSVP song question enabled' })).toBeVisible();
    await expect(page.getByText('DJ handoff')).toBeVisible();
    await expect(page.getByText(`Earth Wind Fire QA ${runId}`)).toBeVisible();
    await expect(page.getByText(guestName)).toBeVisible();

    const savedSiteResponse = await restFetch(restUrl('wedding_sites', {
      select: 'music_playlist_url,rsvp_custom_questions',
      id: `eq.${siteId}`,
    }));
    expect(savedSiteResponse.ok).toBeTruthy();
    const [savedSite] = await savedSiteResponse.json() as Array<{ music_playlist_url: string | null; rsvp_custom_questions: Array<{ id?: string; label?: string }> }>;
    expect(savedSite.music_playlist_url).toBe(playlistUrl);
    expect(savedSite.rsvp_custom_questions.some((question) => question.id === 'song_request')).toBe(true);

    await page.goto(`/dashboard/planning?bypassPayment=1&tab=addresses&addressQa=${runId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Collect addresses')).toBeVisible();
    await expect(page.getByText(`/guest-contact/${proofSiteSlug}`)).toBeVisible();
    await expect(page.locator('p').filter({ hasText: /^Need address$/ }).first()).toBeVisible();
    const guestAddressResponse = await restFetch(restUrl('guests', {
      select: 'id,name,mailing_address_line1',
      id: `eq.${guestId}`,
    }));
    expect(guestAddressResponse.ok).toBeTruthy();
    const [addressGuest] = await guestAddressResponse.json() as Array<{ id: string; name: string; mailing_address_line1: string | null }>;
    expect(addressGuest).toMatchObject({ id: guestId, name: guestName, mailing_address_line1: null });
  } finally {
    await cleanup();
  }
});
