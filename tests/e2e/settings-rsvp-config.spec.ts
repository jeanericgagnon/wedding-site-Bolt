import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

test.skip(process.env.LIVE_SETTINGS_RSVP_CONFIG !== '1', 'Set LIVE_SETTINGS_RSVP_CONFIG=1 to save and restore production RSVP settings.');

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

test('owner can save RSVP meal choices and custom questions from settings', async ({ page }) => {
  test.setTimeout(120_000);
  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const proofSiteSlug = process.env.V1_PROOF_SITE_SLUG || 'maya-and-leo';
  const runId = process.env.LIVE_SETTINGS_RSVP_RUN_ID || `${Date.now()}`;
  const qaQuestion = `QA RSVP settings question ${runId}`;
  const qaMeal = `QA Meal ${runId}`;
  let ownerAccessToken = '';
  let siteId = '';
  let originalQuestions: unknown = [];
  let originalMealConfig: unknown = null;

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
        rsvp_custom_questions: originalQuestions,
        rsvp_meal_config: originalMealConfig,
      }),
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
    select: 'id,rsvp_custom_questions,rsvp_meal_config',
    site_slug: `eq.${proofSiteSlug}`,
    limit: '1',
  }));
  expect(siteResponse.ok).toBeTruthy();
  const [site] = await siteResponse.json() as Array<{ id: string; rsvp_custom_questions: unknown; rsvp_meal_config: unknown }>;
  expect(site?.id).toBeTruthy();
  siteId = site.id;
  originalQuestions = site.rsvp_custom_questions ?? [];
  originalMealConfig = site.rsvp_meal_config ?? { enabled: true, options: ['Chicken', 'Beef', 'Fish', 'Vegetarian', 'Vegan'] };

  try {
    await page.goto('/dashboard/settings?bypassPayment=1&tab=rsvp&settingsRsvpQa=' + runId, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Settings' }).first()).toBeVisible();
    await expect(page.getByText('Meal Choice')).toBeVisible();

    await page.getByRole('button', { name: 'Show' }).first().click();
    await expect(page.getByText('Collect meal choice on RSVP form')).toBeVisible();
    const mealOptions = page.getByPlaceholder(/Meal option/i);
    const mealOptionCount = await mealOptions.count();
    await page.getByRole('button', { name: 'Add meal option' }).click();
    await expect(mealOptions).toHaveCount(mealOptionCount + 1);
    await mealOptions.last().fill(qaMeal);
    await expect(mealOptions.last()).toHaveValue(qaMeal);

    await page.getByRole('button', { name: 'Show advanced RSVP' }).click();
    const prompts = page.getByLabel('Prompt');
    const promptCount = await prompts.count();
    await page.getByRole('button', { name: 'Add Question' }).click();
    await expect(prompts).toHaveCount(promptCount + 1);
    await prompts.last().fill(qaQuestion);
    await page.getByLabel('Type').last().selectOption('single_choice');
    await page.getByPlaceholder('Option 1', { exact: true }).last().fill('Yes please');
    await page.getByPlaceholder('Option 2', { exact: true }).last().fill('No thanks');
    await page.getByLabel('Required').last().check();
    await page.getByRole('button', { name: 'Save RSVP Settings' }).click();
    await expect(page.getByText('RSVP settings saved.')).toBeVisible();

    let savedRow: { rsvp_custom_questions: Array<{ label?: string; type?: string; required?: boolean; options?: string[] }>; rsvp_meal_config: { enabled?: boolean; options?: string[] } } | null = null;
    await expect.poll(async () => {
      const savedResponse = await restFetch(restUrl('wedding_sites', {
        select: 'rsvp_custom_questions,rsvp_meal_config',
        id: `eq.${siteId}`,
      }));
      if (!savedResponse.ok) return null;
      const [row] = await savedResponse.json() as Array<{ rsvp_custom_questions: Array<{ label?: string; type?: string; required?: boolean; options?: string[] }>; rsvp_meal_config: { enabled?: boolean; options?: string[] } }>;
      if ((row?.rsvp_meal_config?.options ?? []).includes(qaMeal)) {
        savedRow = row;
        return 'saved';
      }
      return null;
    }, {
      timeout: 15_000,
      message: 'RSVP meal config should include the newly saved QA meal option',
    }).toBe('saved');
    expect(savedRow).not.toBeNull();
    expect(savedRow.rsvp_meal_config?.enabled).toBe(true);
    expect(savedRow.rsvp_meal_config?.options ?? []).toContain(qaMeal);
    const savedQuestion = (savedRow.rsvp_custom_questions ?? []).find((question) => question.label === qaQuestion);
    expect(savedQuestion).toMatchObject({
      label: qaQuestion,
      type: 'single_choice',
      required: true,
      options: ['Yes please', 'No thanks'],
    });
  } finally {
    await restoreOriginalSettings();
  }
});
