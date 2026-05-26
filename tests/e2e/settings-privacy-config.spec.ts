import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

test.skip(process.env.LIVE_SETTINGS_PRIVACY_CONFIG !== '1', 'Set LIVE_SETTINGS_PRIVACY_CONFIG=1 to save and restore production privacy settings.');

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

test('owner can save and enforce invite-only privacy settings', async ({ page, browser }) => {
  test.setTimeout(120_000);
  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const proofSiteSlug = process.env.V1_PROOF_SITE_SLUG || 'maya-and-leo';
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'https://dayof.love';
  let ownerAccessToken = '';
  let siteId = '';
  let originalPrivacyMode = 'public';
  let originalHideFromSearch = false;
  let originalDefaultLanguage = 'en';
  let originalGuestAccessToken: string | null = null;
  let originalSitePasswordHash: string | null = null;

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
      body: JSON.stringify({
        privacy_mode: originalPrivacyMode,
        hide_from_search: originalHideFromSearch,
        default_language: originalDefaultLanguage,
        guest_access_token: originalGuestAccessToken,
        site_password_hash: originalSitePasswordHash,
      }),
    });
  };

  const closeGuestContext = async (context: Awaited<ReturnType<typeof browser.newContext>>) => {
    try {
      await context.close();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('ENOENT') || (!message.includes('.trace') && !message.includes('.network'))) {
        throw error;
      }
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
    select: 'id,privacy_mode,hide_from_search,default_language,guest_access_token,site_password_hash',
    site_slug: `eq.${proofSiteSlug}`,
    limit: '1',
  }));
  const siteResponseText = await siteResponse.text();
  expect(siteResponse.ok, siteResponseText).toBeTruthy();
  const [site] = JSON.parse(siteResponseText) as Array<{
    id: string;
    privacy_mode: string | null;
    hide_from_search: boolean | null;
    default_language: string | null;
    guest_access_token: string | null;
    site_password_hash: string | null;
  }>;
  expect(site?.id).toBeTruthy();
  siteId = site.id;
  originalPrivacyMode = site.privacy_mode ?? 'public';
  originalHideFromSearch = site.hide_from_search ?? false;
  originalDefaultLanguage = site.default_language ?? 'en';
  originalGuestAccessToken = site.guest_access_token ?? null;
  originalSitePasswordHash = site.site_password_hash ?? null;

  try {
    await page.goto('/dashboard/settings?bypassPayment=1&tab=site&settingsPrivacyQa=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Settings' }).first()).toBeVisible();
    const privacySection = page.locator('#settings-privacy');
    await expect(privacySection.getByText('Privacy Settings')).toBeVisible();
    await privacySection.scrollIntoViewIfNeeded();
    await privacySection.getByRole('button', { name: 'Show' }).click();

    await privacySection.getByLabel('Invite-only live site').check();
    await privacySection.getByLabel('Hide from search engines').check();
    await privacySection.getByRole('button', { name: 'Save Privacy Settings' }).click();
    await expect(privacySection.getByText('Privacy settings saved.')).toBeVisible();

    const savedResponse = await restFetch(restUrl('wedding_sites', {
      select: 'privacy_mode,hide_from_search,guest_access_token',
      id: `eq.${siteId}`,
    }));
    expect(savedResponse.ok).toBeTruthy();
    const [saved] = await savedResponse.json() as Array<{
      privacy_mode: string | null;
      hide_from_search: boolean | null;
      guest_access_token: string | null;
    }>;
    expect(saved.privacy_mode).toBe('invite_only');
    expect(saved.hide_from_search).toBe(true);
    expect(saved.guest_access_token).toEqual(expect.any(String));
    expect(saved.guest_access_token?.length).toBeGreaterThan(20);

    const guestContext = await browser.newContext({ baseURL: baseUrl });
    try {
      const blockedGuestPage = await guestContext.newPage();
      await blockedGuestPage.goto(`/site/${proofSiteSlug}?privacyQa=blocked-${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await expect(blockedGuestPage.getByText(/invite-only/i)).toBeVisible();
      await expect(blockedGuestPage.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      await blockedGuestPage.close();

      const allowedGuestPage = await guestContext.newPage();
      await allowedGuestPage.goto(`/site/${proofSiteSlug}?token=${saved.guest_access_token}&privacyQa=allowed-${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await expect(allowedGuestPage.getByText(/invite-only/i)).toHaveCount(0);
      await expect(allowedGuestPage.getByRole('heading').filter({ hasText: /Eric|Kara|Wedding|Welcome/i }).first()).toBeVisible();
      await expect(allowedGuestPage.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      await allowedGuestPage.close();

    } finally {
      await closeGuestContext(guestContext);
    }
  } finally {
    await restoreOriginalSettings();
  }
});
