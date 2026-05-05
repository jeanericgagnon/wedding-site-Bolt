import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const siteRsvpWidgetProofEnabled = process.env.LIVE_SITE_RSVP_WIDGET === '1' || process.env.LIVE_SITE_RSVP_WIDGET_WRITE_READ === '1';

test.skip(!siteRsvpWidgetProofEnabled, 'Set LIVE_SITE_RSVP_WIDGET=1 or LIVE_SITE_RSVP_WIDGET_WRITE_READ=1 to prove the public-site RSVP widget writes to site_rsvps.');

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

test('public site RSVP widget writes and owner can read the saved row', async ({ page, browser }) => {
  test.setTimeout(120_000);

  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';
  const proofSiteSlug = process.env.V1_PROOF_SITE_SLUG || 'maya-and-leo';
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const runId = `${Date.now()}`;
  const guestName = `Site RSVP QA ${runId}`;
  let ownerAccessToken = '';
  let siteId = '';

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

  const cleanupRows = async () => {
    if (!siteId) return;
    await restFetch(restUrl('site_rsvps', {
      wedding_site_id: `eq.${siteId}`,
      guest_name: `eq.${guestName}`,
    }), { method: 'DELETE' }).catch(() => undefined);
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
    select: 'id,is_published,site_slug',
    site_slug: `eq.${proofSiteSlug}`,
    limit: '1',
  }));
  const siteResponseText = await siteResponse.text();
  expect(siteResponse.ok, siteResponseText).toBeTruthy();
  const [site] = JSON.parse(siteResponseText) as Array<{ id: string; is_published: boolean; site_slug: string }>;
  expect(site?.id).toBeTruthy();
  expect(site.is_published).toBe(true);
  siteId = site.id;

  await cleanupRows();

  try {
    const publicContext = await browser.newContext({ baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173' });
    try {
      const publicPage = await publicContext.newPage();
      await publicPage.goto(`/site/${proofSiteSlug}?siteRsvpQa=${runId}`, { waitUntil: 'domcontentloaded' });
      await expect(publicPage.getByRole('heading', { name: /Will You Be There\?|RSVP/i }).first()).toBeVisible({ timeout: 20_000 });
      await publicPage.getByLabel('Your name').fill(guestName);
      await publicPage.getByLabel('Number of guests').fill('2');
      await publicPage.getByLabel(/Dietary notes/i).fill(`No shellfish ${runId}`);
      await publicPage.getByRole('button', { name: 'Send RSVP' }).click();
      await expect(publicPage.getByText('Your reply has been saved.')).toBeVisible({ timeout: 15_000 });
      await publicPage.close();
    } finally {
      await publicContext.close().catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('ENOENT') || (!message.includes('.trace') && !message.includes('.network'))) throw error;
      });
    }

    const savedResponse = await restFetch(restUrl('site_rsvps', {
      select: 'id,wedding_site_id,guest_name,rsvp_status,guest_count,dietary_notes',
      wedding_site_id: `eq.${siteId}`,
      guest_name: `eq.${guestName}`,
      limit: '1',
    }));
    const savedResponseText = await savedResponse.text();
    expect(savedResponse.ok, savedResponseText).toBeTruthy();
    const [saved] = JSON.parse(savedResponseText) as Array<{
      wedding_site_id: string;
      guest_name: string;
      rsvp_status: string;
      guest_count: number;
      dietary_notes: string | null;
    }>;
    expect(saved).toMatchObject({
      wedding_site_id: siteId,
      guest_name: guestName,
      rsvp_status: 'attending',
      guest_count: 2,
      dietary_notes: `No shellfish ${runId}`,
    });
  } finally {
    await cleanupRows();
  }
});
