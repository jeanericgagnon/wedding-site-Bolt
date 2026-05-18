import { expect, test, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

test.skip(process.env.LIVE_QUICK_START_ONBOARDING !== '1', 'Set LIVE_QUICK_START_ONBOARDING=1 to prove quick-start onboarding writes a generated starter draft.');

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

async function fillVisibleTextField(page: Page, value: string) {
  const textbox = page.getByRole('textbox').first();
  await expect(textbox).toBeVisible();
  await textbox.fill(value);
}

async function continueIfVisible(page: Page, label = /^Continue$/i) {
  const button = page.getByRole('button', { name: label });
  await expect(button).toBeVisible();
  await button.click();
}

test('quick-start AI onboarding creates an editable starter site and guest import handoff', async ({ page }) => {
  test.setTimeout(180_000);
  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';
  const proofSiteSlug = process.env.V1_PROOF_SITE_SLUG || 'maya-and-leo';
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const runId = `${Date.now()}`;
  const coupleNames = `QA Alex & Jordan ${runId}`;
  let ownerAccessToken = '';
  let originalSite: Record<string, unknown> | null = null;

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

  try {
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

    const originalSiteResponse = await restFetch(restUrl('wedding_sites', {
      select: [
        'id',
        'site_slug',
        'couple_name_1',
        'couple_name_2',
        'wedding_date',
        'venue_name',
        'wedding_location',
        'venue_location',
        'onboarding_answers',
        'wedding_data',
        'site_json',
        'active_template_id',
        'template_id',
        'planning_status',
      ].join(','),
      site_slug: `eq.${proofSiteSlug}`,
      limit: '1',
    }));
    expect(originalSiteResponse.ok).toBeTruthy();
    const originalSites = await originalSiteResponse.json() as Array<Record<string, unknown>>;
    originalSite = originalSites[0] || null;
    if (!originalSite) {
      const fallbackSiteResponse = await restFetch(restUrl('wedding_sites', {
        select: [
          'id',
          'site_slug',
          'couple_name_1',
          'couple_name_2',
          'wedding_date',
          'venue_name',
          'wedding_location',
          'venue_location',
          'onboarding_answers',
          'wedding_data',
          'site_json',
          'active_template_id',
          'template_id',
          'planning_status',
        ].join(','),
        order: 'updated_at.desc',
        limit: '1',
      }));
      expect(fallbackSiteResponse.ok).toBeTruthy();
      const fallbackSites = await fallbackSiteResponse.json() as Array<Record<string, unknown>>;
      originalSite = fallbackSites[0] || null;
    }
    expect(originalSite?.id).toBeTruthy();

    await page.goto('/onboarding/quick-start?bypassPayment=1&resetQuickStart=1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Who’s getting married\?/i })).toBeVisible();

    await fillVisibleTextField(page, coupleNames);
    await continueIfVisible(page);

    await expect(page.getByRole('heading', { name: /How should we refer to each of you/i })).toBeVisible();
    await page.getByRole('button', { name: 'Just our names' }).click();

    await fillVisibleTextField(page, 'June 6, 2027 in Sayulita, Mexico');
    await continueIfVisible(page);

    await fillVisibleTextField(page, `Casa Sol QA ${runId}`);
    await continueIfVisible(page);

    await fillVisibleTextField(page, 'warm coastal garden party, polished but relaxed');
    await continueIfVisible(page);

    await fillVisibleTextField(page, 'welcomed, cared for, and clear on exactly where to go');
    await continueIfVisible(page);

    await fillVisibleTextField(page, 'Friday welcome drinks, Saturday ceremony and reception, Sunday brunch');
    await continueIfVisible(page);

    await fillVisibleTextField(page, '4:30 PM');
    await continueIfVisible(page);

    await page.getByRole('button', { name: '50–100' }).click();
    await page.getByRole('button', { name: 'Some plus-ones' }).click();
    await page.getByRole('button', { name: 'No' }).click();

    await fillVisibleTextField(page, '2027-04-30');
    await continueIfVisible(page);

    await page.getByRole('button', { name: 'Yes' }).click();

    await fillVisibleTextField(page, 'We met at a tiny concert and want the weekend to feel easy, sincere, and close.');
    await continueIfVisible(page, /Build my draft/i);

    const handoffUrlPattern = /\/dashboard\/guests\?bypassPayment=1&fromQuickStart=1&next=photos/;
    await page.waitForURL(handoffUrlPattern, { timeout: 10_000 }).catch(async () => {
      if (handoffUrlPattern.test(page.url())) return;
      const guestsHeading = page.getByText('Guests & RSVP').first();
      if (await guestsHeading.isVisible().catch(() => false)) return;
      const followUpHeading = page.getByRole('heading', { name: /A few (smart|useful) follow-ups/i });
      if (await followUpHeading.isVisible({ timeout: 30_000 }).catch(() => false)) {
        const followUps = page.getByRole('textbox');
        const count = await followUps.count();
        expect(count).toBeGreaterThan(0);
        for (let i = 0; i < count; i += 1) {
          await followUps.nth(i).fill(`Keep this clear and guest friendly for QA run ${runId}.`);
        }
        const buildDraftButton = page.getByRole('button', { name: /Build my draft/i });
        await expect(buildDraftButton).toBeVisible();
        await buildDraftButton.click();
        return;
      }
      await expect(guestsHeading).toBeVisible({ timeout: 30_000 });
    });

    await expect(page.getByText('Guests & RSVP').first()).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText('Guests & RSVP').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Import Guests/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Add Guest$/i }).first()).toBeVisible();

    const siteResponse = await restFetch(restUrl('wedding_sites', {
      select: 'id,onboarding_answers,wedding_data,site_json,planning_status',
      id: `eq.${String(originalSite?.id)}`,
      limit: '1',
    }));
    expect(siteResponse.ok).toBeTruthy();
    const [site] = await siteResponse.json() as Array<{
      onboarding_answers: Record<string, unknown> | null;
      wedding_data: Record<string, unknown> | null;
      site_json: Record<string, unknown> | null;
      planning_status: string | null;
    }>;
    expect(site?.planning_status).toBe('quick_start_complete');
    expect(JSON.stringify(site.onboarding_answers || {})).toContain('Sayulita');
    expect(JSON.stringify(site.wedding_data || {})).toContain('aiDraft');
    expect(JSON.stringify(site.wedding_data || {})).toContain('aiOnboarding');
    expect(JSON.stringify(site.wedding_data || {})).toContain('quick_start_concierge');
    expect(JSON.stringify(site.site_json || {})).toContain('concierge-brief');
  } finally {
    if (originalSite?.id) {
      const { id: _id, ...restoreFields } = originalSite;
      await restFetch(restUrl('wedding_sites', { id: `eq.${String(originalSite.id)}` }), {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(restoreFields),
      });
    }
  }
});
