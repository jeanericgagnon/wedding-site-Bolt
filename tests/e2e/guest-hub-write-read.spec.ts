import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

test.skip(process.env.LIVE_GUEST_HUB_WRITE_READ !== '1', 'Set LIVE_GUEST_HUB_WRITE_READ=1 to submit guest hub opt-ins, guestbook notes, and interactive votes.');

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

test('guest hub opt-in, guestbook, and poll/quiz writes persist', async ({ page }) => {
  test.setTimeout(120_000);
  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const proofSiteSlug = process.env.V1_PROOF_SITE_SLUG || 'maya-and-leo';
  const runId = `${Date.now()}`;
  const guestEmail = `dayof.hubqa.${runId}@example.com`;
  const guestName = `Hub Guest ${runId}`;
  const guestbookMessage = `Guestbook QA note ${runId}`;
  const suggestionText = `QA signature drink ${runId}`;
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
    select: 'id',
    site_slug: `eq.${proofSiteSlug}`,
    limit: '1',
  }));
  expect(siteResponse.ok).toBeTruthy();
  const [site] = await siteResponse.json() as Array<{ id: string }>;
  expect(site?.id).toBeTruthy();
  siteId = site.id;

  try {
    await page.goto(`/event/${proofSiteSlug}?hubWriteQa=${runId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Maya & Leo/i })).toBeVisible();
    await expect(page.getByText('Save this page for the wedding day.')).toBeVisible();
    await expect(page.getByRole('link', { name: /RSVP/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Upload photos or video/i })).toBeVisible();
    await page.getByPlaceholder('Your name').fill(guestName);
    await page.getByPlaceholder('Email or phone').fill(guestEmail);
    await page.getByLabel('I want a dayof link for my own event someday.').check();
    await page.getByRole('button', { name: 'Send recap' }).click();
    await expect(page.getByText('Saved. We will send the recap when it is ready.')).toBeVisible();

    await expect.poll(async () => {
      const response = await restFetch(restUrl('guest_prospect_optins', {
        select: 'guest_name,email,source,wants_photo_updates,wants_own_event_info',
        email: `eq.${guestEmail}`,
      }));
      if (!response.ok) return null;
      const rows = await response.json() as Array<{ guest_name: string | null; email: string | null; source: string; wants_photo_updates: boolean; wants_own_event_info: boolean }>;
      return rows[0] ?? null;
    }).toMatchObject({
      guest_name: guestName,
      email: guestEmail,
      source: 'guest_hub',
      wants_photo_updates: true,
      wants_own_event_info: true,
    });

    await page.goto(`/guestbook/${proofSiteSlug}?guestbookQa=${runId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Leave a note' })).toBeVisible();
    await page.getByLabel('Your name').fill(guestName);
    await page.getByLabel('Email').fill(guestEmail);
    await page.getByLabel('Note').fill(guestbookMessage);
    await page.getByRole('button', { name: 'Send note' }).click();
    await expect(page.getByText('Your note is in. Thank you.')).toBeVisible();

    await expect.poll(async () => {
      const response = await restFetch(restUrl('guestbook_entries', {
        select: 'id,guest_name,guest_email,message',
        message: `eq.${guestbookMessage}`,
      }));
      if (!response.ok) return null;
      const rows = await response.json() as Array<{ id: string; guest_name: string | null; guest_email: string | null; message: string | null }>;
      return rows[0] ?? null;
    }).toMatchObject({
      guest_name: guestName,
      guest_email: guestEmail,
      message: guestbookMessage,
    });

    await page.goto(`/variant-preview-capture?sectionType=contact&variant=interactiveHub&siteSlug=${encodeURIComponent(proofSiteSlug)}&interactiveQa=${runId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#variant-preview-root')).toHaveAttribute('data-variant-preview-ready', 'true');
    await expect(page.locator('#variant-preview-root')).toHaveAttribute('data-variant-preview-site-slug', proofSiteSlug);
    await page.getByRole('button', { name: /Gagmann/i }).click();
    await page.getByRole('button', { name: /Both at once/i }).click();
    await expect(page.getByText('Nice one, correct!')).toBeVisible();
    await page.getByPlaceholder('Type your idea...').fill(suggestionText);
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByText(suggestionText)).toBeVisible();

    await expect.poll(async () => {
      const response = await restFetch(restUrl('interactive_votes', {
        select: 'id,widget_kind,widget_id,option_id',
        site_slug: `eq.${proofSiteSlug}`,
        limit: '20',
      }));
      if (!response.ok) return 0;
      const rows = await response.json() as Array<{ widget_kind: string; widget_id: string; option_id: string }>;
      return rows.filter((row) =>
        (row.widget_kind === 'poll' && row.widget_id === 'poll-lastname' && row.option_id === 'poll-gagmann') ||
        (row.widget_kind === 'quiz' && row.widget_id === 'quiz-cry' && row.option_id === 'quiz-both-at-once')
      ).length;
    }).toBeGreaterThanOrEqual(2);
    await expect.poll(async () => {
      const response = await restFetch(restUrl('interactive_suggestions', {
        select: 'id,suggestion_text',
        site_slug: `eq.${proofSiteSlug}`,
        suggestion_text: `eq.${suggestionText}`,
      }));
      if (!response.ok) return [];
      return await response.json() as Array<{ id: string; suggestion_text: string }>;
    }).toHaveLength(1);
  } finally {
    if (siteId) {
      await restFetch(restUrl('guest_prospect_optins', { email: `eq.${guestEmail}` }), { method: 'DELETE' });
      await restFetch(restUrl('guestbook_entries', { message: `eq.${guestbookMessage}` }), { method: 'DELETE' });
      await restFetch(restUrl('interactive_suggestions', { site_slug: `eq.${proofSiteSlug}`, suggestion_text: `eq.${suggestionText}` }), { method: 'DELETE' });
    }
  }
});
