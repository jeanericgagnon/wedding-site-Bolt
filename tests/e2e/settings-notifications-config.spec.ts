import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

test.skip(process.env.LIVE_SETTINGS_NOTIFICATIONS_CONFIG !== '1', 'Set LIVE_SETTINGS_NOTIFICATIONS_CONFIG=1 to save and restore production notification settings.');

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

test('owner can save notification preferences from settings', async ({ page }) => {
  test.setTimeout(120_000);
  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const proofSiteSlug = process.env.V1_PROOF_SITE_SLUG || 'maya-and-leo';
  let ownerAccessToken = '';
  let siteId = '';
  let originalPrefs: unknown = null;

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

  const restoreOriginalSettings = async () => {
    if (!siteId) return;
    await restFetch(restUrl('wedding_sites', { id: `eq.${siteId}` }), {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ notification_prefs: originalPrefs }),
    });
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
    select: 'id,notification_prefs',
    site_slug: `eq.${proofSiteSlug}`,
    limit: '1',
  }));
  const siteText = await siteResponse.text();
  expect(siteResponse.ok, siteText).toBeTruthy();
  const [site] = JSON.parse(siteText) as Array<{ id: string; notification_prefs: unknown }>;
  expect(site?.id).toBeTruthy();
  siteId = site.id;
  originalPrefs = site.notification_prefs ?? { rsvp: true, photos: true, digest: false, updates: false };

  try {
    await page.goto('/dashboard/settings?bypassPayment=1&settingsNotifQa=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Settings' }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Notifications' }).click();
    await page.getByRole('button', { name: 'Show' }).click();

    await page.getByLabel('New RSVPs').check();
    await page.getByLabel('Photo uploads').uncheck();
    await page.getByLabel('Weekly digest').check();
    await page.getByLabel('Product updates').check();
    await page.getByRole('button', { name: 'Save Preferences' }).click();
    await expect(page.getByText('Preferences saved.')).toBeVisible();

    const savedResponse = await restFetch(restUrl('wedding_sites', {
      select: 'notification_prefs',
      id: `eq.${siteId}`,
      limit: '1',
    }));
    expect(savedResponse.ok).toBeTruthy();
    const [saved] = await savedResponse.json() as Array<{ notification_prefs: Record<string, unknown> }>;
    expect(saved.notification_prefs).toMatchObject({
      rsvp: true,
      photos: false,
      digest: true,
      updates: true,
      digest_cadence: 'weekly',
      digest_include_planner: false,
      digest_quiet_until_label: null,
    });
    expect(typeof saved.notification_prefs.digest_last_reviewed_at).toBe('string');
    expect(typeof saved.notification_prefs.digest_next_delivery_at).toBe('string');
  } finally {
    await restoreOriginalSettings();
  }
});
