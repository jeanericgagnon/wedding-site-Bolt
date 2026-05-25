import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

test.skip(process.env.LIVE_PLANNER_STARTER_SUITE_WRITE_READ !== '1', 'Set LIVE_PLANNER_STARTER_SUITE_WRITE_READ=1 to apply and undo starter-suite QA rows on production.');

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

test('planner starter suite preview can apply and undo bounded QA rows', async ({ page }) => {
  test.setTimeout(120_000);
  const planningRpcLogs: Array<{ url: string; status: number; body: string }> = [];
  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const proofSiteSlug = process.env.V1_PROOF_SITE_SLUG || 'maya-and-leo';
  const runId = process.env.LIVE_PLANNER_STARTER_SUITE_RUN_ID || `${Date.now()}`;
  const qaNeedle = `QA ${runId}`;
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
    headers: { ...authHeaders(), ...(init.headers || {}) },
    signal: AbortSignal.timeout(15_000),
  });
  const cleanup = async () => {
    if (!siteId) return;
    await restFetch(restUrl('planning_tasks', { wedding_site_id: `eq.${siteId}`, title: `like.%${qaNeedle}%` }), { method: 'DELETE' });
    await restFetch(restUrl('planning_budget_items', { wedding_site_id: `eq.${siteId}`, item_name: `like.%${qaNeedle}%` }), { method: 'DELETE' });
    await restFetch(restUrl('planning_vendors', { wedding_site_id: `eq.${siteId}`, name: `like.%${qaNeedle}%` }), { method: 'DELETE' });
  };
  const countRows = async () => {
    const [tasksResponse, budgetResponse, vendorsResponse] = await Promise.all([
      restFetch(restUrl('planning_tasks', { select: 'id,title', wedding_site_id: `eq.${siteId}`, title: `like.%${qaNeedle}%` })),
      restFetch(restUrl('planning_budget_items', { select: 'id,item_name', wedding_site_id: `eq.${siteId}`, item_name: `like.%${qaNeedle}%` })),
      restFetch(restUrl('planning_vendors', { select: 'id,name', wedding_site_id: `eq.${siteId}`, name: `like.%${qaNeedle}%` })),
    ]);
    expect(tasksResponse.ok).toBeTruthy();
    expect(budgetResponse.ok).toBeTruthy();
    expect(vendorsResponse.ok).toBeTruthy();
    return {
      tasks: (await tasksResponse.json() as unknown[]).length,
      budget: (await budgetResponse.json() as unknown[]).length,
      vendors: (await vendorsResponse.json() as unknown[]).length,
    };
  };

  page.on('response', async (response) => {
    const url = response.url();
    if (!url.includes('/rest/v1/rpc/')) return;
    if (!url.includes('planning_budget_item_write') && !url.includes('planning_task_write') && !url.includes('planning_vendor_write')) {
      return;
    }
    let body = '';
    try {
      body = await response.text();
    } catch {
      body = '<unreadable>';
    }
    planningRpcLogs.push({
      url,
      status: response.status(),
      body: body.slice(0, 500),
    });
    console.error(`[starter-suite-rpc] ${response.status()} ${url} ${body.slice(0, 200)}`);
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
  siteId = site.id;
  expect(siteId).toBeTruthy();
  await cleanup();

  try {
    await page.goto(`/dashboard/planning?bypassPayment=1&starterSuiteQa=${runId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Planner' }).first()).toBeVisible();
    await expect(page.getByText('Planner starter set')).toBeVisible();
    await expect(page.getByText(/checklist items/)).toBeVisible();
    await expect(page.getByText(/timeline ideas/)).toBeVisible();
    await expect(page.getByText(/photo albums/)).toBeVisible();

    await page.getByRole('button', { name: 'Add starter set' }).click();
    await expect.poll(countRows).toMatchObject({
      tasks: expect.any(Number),
      budget: expect.any(Number),
      vendors: expect.any(Number),
    });
    const counts = await countRows();
    expect(counts.tasks).toBeGreaterThan(0);
    expect(counts.budget).toBeGreaterThan(0);
    expect(counts.vendors).toBeGreaterThan(0);
    await expect(page.getByRole('button', { name: 'Undo starter suite' })).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: 'Undo starter suite' }).click();
    await expect.poll(countRows).toEqual({ tasks: 0, budget: 0, vendors: 0 });
  } finally {
    if (planningRpcLogs.length > 0) {
      console.error(`[starter-suite-rpc-summary] ${JSON.stringify(planningRpcLogs, null, 2)}`);
    }
    await cleanup();
  }
});
