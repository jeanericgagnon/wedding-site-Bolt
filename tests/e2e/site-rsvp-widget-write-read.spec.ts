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

async function revealRsvpForm(page: import('@playwright/test').Page) {
  const nameField = page.getByPlaceholder('Your full name');
  await expect(page.getByText('Loading wedding site...')).toBeHidden({ timeout: 20_000 }).catch(() => undefined);
  if (await nameField.isVisible().catch(() => false)) return;

  const sendRsvpButtons = page.getByRole('button', { name: 'Send RSVP' });
  if (await sendRsvpButtons.first().isVisible().catch(() => false)) {
    await sendRsvpButtons.first().click();
    await page.waitForTimeout(500);
    if (await nameField.isVisible().catch(() => false)) return;
  }

  const rsvpChip = page.getByRole('button', { name: /^RSVP$/ }).last();
  if (await rsvpChip.isVisible().catch(() => false)) {
    await rsvpChip.click().catch(() => undefined);
    await page.waitForTimeout(500);
    if (await nameField.isVisible().catch(() => false)) return;
  }

  const rsvpLink = page.getByRole('link', { name: /^RSVP$/ }).last();
  if (await rsvpLink.isVisible().catch(() => false)) {
    await rsvpLink.click().catch(() => undefined);
    await page.waitForTimeout(500);
    if (await nameField.isVisible().catch(() => false)) return;
  }

  const rsvpHeading = page.getByRole('heading', { name: 'RSVP' }).last();
  if (await rsvpHeading.isVisible().catch(() => false)) {
    await rsvpHeading.scrollIntoViewIfNeeded().catch(() => undefined);
  }

  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (await nameField.isVisible().catch(() => false)) return;
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(250);
  }
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
      await revealRsvpForm(publicPage);
      await expect(publicPage.getByPlaceholder('Your full name')).toBeVisible({ timeout: 20_000 });
      await expect(publicPage.getByRole('button', { name: 'Send RSVP' })).toBeVisible({ timeout: 20_000 });
      await publicPage.getByPlaceholder('Your full name').fill(guestName);
      await publicPage.getByRole('button', { name: 'Joyfully accepts' }).click();
      await publicPage.locator('select').last().selectOption('2');
      await publicPage.getByPlaceholder('Vegetarian, vegan, gluten-free, allergies...').fill(`No shellfish ${runId}`);
      await publicPage.getByRole('button', { name: 'Send RSVP' }).click();
      await publicPage.waitForTimeout(1_500);
      await publicPage.close();
    } finally {
      await publicContext.close().catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('ENOENT') || (!message.includes('.trace') && !message.includes('.network'))) throw error;
      });
    }

    let saved: {
      wedding_site_id: string;
      guest_name: string;
      rsvp_status: string;
      guest_count: number;
      dietary_notes: string | null;
    } | undefined;
    await expect.poll(async () => {
      const savedResponse = await restFetch(restUrl('site_rsvps', {
        select: 'id,wedding_site_id,guest_name,rsvp_status,guest_count,dietary_notes',
        wedding_site_id: `eq.${siteId}`,
        guest_name: `eq.${guestName}`,
        limit: '1',
      }));
      const savedResponseText = await savedResponse.text();
      expect(savedResponse.ok, savedResponseText).toBeTruthy();
      [saved] = JSON.parse(savedResponseText) as Array<{
        wedding_site_id: string;
        guest_name: string;
        rsvp_status: string;
        guest_count: number;
        dietary_notes: string | null;
      }>;
      return saved?.rsvp_status ?? null;
    }, {
      timeout: 15_000,
      message: 'The public RSVP submit should persist a site_rsvps row for the proof guest',
    }).toBe('attending');
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
