import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

test.skip(process.env.LIVE_REGISTRY_WRITE_READ !== '1', 'Set LIVE_REGISTRY_WRITE_READ=1 to create, edit, purchase, verify, and delete a production QA registry item.');

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

test('registry owner edits and public purchase state persist end to end', async ({ page, browser }) => {
  test.setTimeout(180_000);

  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const proofSiteSlug = process.env.V1_PROOF_SITE_SLUG || 'maya-and-leo';
  const cleanupOnlyRunId = process.env.LIVE_REGISTRY_CLEANUP_RUN_ID;
  const runId = cleanupOnlyRunId || process.env.LIVE_REGISTRY_RUN_ID || `${Date.now()}`;
  const importedFixtureName = 'DayOf QA Ceramic Serving Bowl';
  const editedItemName = `Registry QA Serving Bowl ${runId}`;
  const purchaserName = `Registry Guest QA ${runId}`;
  const appBaseUrl = process.env.PLAYWRIGHT_BASE_URL || 'https://dayof.love';
  const registryFixtureOrigin = /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?/i.test(appBaseUrl)
    ? 'https://dayof.love'
    : appBaseUrl;
  const registryFixtureUrl = `${registryFixtureOrigin}/qa/registry-product.html?run=${runId}`;
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'https://dayof.love';
  let ownerAccessToken = '';

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

  const fetchQaItems = async () => {
    const response = await restFetch(restUrl('registry_items', {
      select: 'id,item_name,merchant,price_amount,notes,image_url,quantity_needed,quantity_purchased,purchase_status,purchaser_name,hide_when_purchased',
      item_name: `ilike.*Registry QA*${runId}*`,
      order: 'created_at.desc',
    }));
    expect(response.ok).toBeTruthy();
    return await response.json() as Array<{
      id: string;
      item_name: string;
      merchant: string | null;
      price_amount: number | null;
      notes: string | null;
      image_url: string | null;
      quantity_needed: number;
      quantity_purchased: number;
      purchase_status: string;
      purchaser_name: string | null;
      hide_when_purchased: boolean;
    }>;
  };

  const cleanupQaItems = async () => {
    const rows = await fetchQaItems().catch(() => []);
    for (const row of rows) {
      await restFetch(restUrl('registry_items', { id: `eq.${row.id}` }), { method: 'DELETE' });
    }
  };

  const closePublicContext = async (context: Awaited<ReturnType<typeof browser.newContext>>) => {
    try {
      await context.close();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('ENOENT') || !message.includes('.trace')) {
        throw error;
      }
    }
  };

  const expectDashboardShell = async () => {
    await expect(page.getByRole('navigation', { name: 'Dashboard navigation' })).toBeVisible({ timeout: 15_000 }).catch(async () => {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
      await expect(page.getByRole('navigation', { name: 'Dashboard navigation' })).toBeVisible({ timeout: 20_000 });
    });
  };

  const gotoRegistryDashboard = async (qaParam: string) => {
    await page.goto(`/dashboard/registry?bypassPayment=1&${qaParam}=${runId}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Registry' }).first()).toBeVisible({ timeout: 15_000 }).catch(async () => {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
      await expect(page.getByRole('heading', { name: 'Registry' }).first()).toBeVisible({ timeout: 20_000 });
    });
    await expect(page.getByText('Loading registry…')).toHaveCount(0, { timeout: 20_000 });
  };

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('your@email.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expectDashboardShell();

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
  await cleanupQaItems();

  if (cleanupOnlyRunId) {
    expect(await fetchQaItems()).toHaveLength(0);
    return;
  }

  try {
    await gotoRegistryDashboard('registryQa');
    await page.getByRole('button', { name: 'Add gift' }).click();
    await expect(page.getByRole('heading', { name: 'Add Registry Item' })).toBeVisible();

    await page.getByPlaceholder(/amazon\.com\/product/i).fill(registryFixtureUrl);
    await page.getByRole('button', { name: 'Fill details' }).click();
    await expect(page.getByText(/Auto-filled|Please review/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByPlaceholder('e.g. KitchenAid Stand Mixer')).toHaveValue(importedFixtureName);
    await expect(page.getByPlaceholder('0.00')).toHaveValue('64');
    await expect(page.getByPlaceholder('e.g. Amazon, Target')).toHaveValue(/DayOf QA Store|Dayof/);
    await expect(page.getByPlaceholder('https://…/product-image.jpg')).toHaveValue(/preview-photos|images\.weserv\.nl|ui-avatars/);
    await page.getByPlaceholder('e.g. KitchenAid Stand Mixer').fill(editedItemName);
    await page.getByPlaceholder('0.00').fill('48.75');
    await page.getByPlaceholder('e.g. Amazon, Target').fill('QA Home Store');
    await page.locator('input[type="number"]').nth(1).fill('2');
    await page.getByPlaceholder(/Any notes for guests/i).fill(`Registry QA note ${runId}`);
    await page.getByRole('button', { name: 'Add to Registry' }).click();
    await expect(page.getByText('Item added to registry')).toBeVisible();

    await page.getByPlaceholder(/Search by name or store/i).fill(editedItemName);
    const ownerCard = page.getByTestId('owner-registry-item-card').filter({ hasText: editedItemName }).first();
    await expect(ownerCard).toBeVisible();
    const editButton = ownerCard.getByRole('button', { name: 'Edit' });
    await editButton.scrollIntoViewIfNeeded();
    await editButton.click();
    await expect(page.getByRole('heading', { name: 'Edit Registry Item' })).toBeVisible();
    await page.getByPlaceholder(/Any notes for guests/i).fill(`Registry QA note ${runId} edited`);
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Item updated')).toBeVisible();

    const [edited] = await fetchQaItems();
    expect(edited).toMatchObject({
      item_name: editedItemName,
      merchant: 'QA Home Store',
      price_amount: 48.75,
      notes: `Registry QA note ${runId} edited`,
      image_url: expect.stringMatching(/preview-photos|images\.weserv\.nl|ui-avatars/),
      quantity_needed: 2,
      quantity_purchased: 0,
      purchase_status: 'available',
    });

    const publicContext = await browser.newContext({ baseURL: baseUrl });
    try {
      const publicPage = await publicContext.newPage();
      await publicPage.goto(`/site/${proofSiteSlug}?registryQa=${runId}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await expect(publicPage.getByText(editedItemName)).toBeVisible({ timeout: 20_000 });
      const publicCard = publicPage
        .locator('div', { hasText: editedItemName })
        .filter({ hasText: 'QA Home Store' })
        .filter({ has: publicPage.getByRole('button', { name: /Mark as purchasing/i }) })
        .last();
      await expect(publicPage.getByRole('img', { name: editedItemName })).toHaveAttribute('src', /preview-photos|images\.weserv\.nl|ui-avatars/);
      await expect(publicCard.getByText('$48.75')).toBeVisible();
      await publicCard.getByRole('button', { name: /Mark as purchasing/i }).click();
      await expect(publicPage.getByRole('heading', { name: 'Mark as purchasing' })).toBeVisible();
      await publicPage.getByPlaceholder('e.g. Aunt Susan').fill(purchaserName);
      await publicPage.getByRole('button', { name: 'Confirm purchase' }).click();
      await expect(publicPage.getByText('Thank you!')).toBeVisible();
      await expect(publicPage.getByText('You marked this from this browser.')).toBeVisible({ timeout: 5_000 });
      const rememberedCookie = await publicPage.evaluate(() => document.cookie);
      expect(rememberedCookie).toContain('dayof_registry_purchases_v1=');
      const rememberedStorage = await publicPage.evaluate(() => window.localStorage.getItem('dayof_registry_purchase_memory_v1') || '');
      expect(rememberedStorage).toContain(edited.id);
      await publicPage.reload({ waitUntil: 'domcontentloaded' });
      await expect(publicPage.getByText('You marked this from this browser.')).toBeVisible({ timeout: 10_000 });
      await publicPage.close();
    } finally {
      await closePublicContext(publicContext);
    }

    let [partial] = await fetchQaItems();
    expect(partial).toMatchObject({
      item_name: editedItemName,
      quantity_needed: 2,
      quantity_purchased: 1,
      purchase_status: 'partial',
      purchaser_name: purchaserName,
    });

    await gotoRegistryDashboard('registryOwnerReadQa');
    await page.getByPlaceholder(/Search by name or store/i).fill(editedItemName);
    await expect(page.getByText('Partial — 1/2 bought')).toBeVisible();
    await expect(page.getByText(`by ${purchaserName}`)).toBeVisible();
    await page.getByRole('button', { name: 'Mark as purchased' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByText(`"${editedItemName}" marked as fully purchased`)).toBeVisible();

    const [purchased] = await fetchQaItems();
    expect(purchased).toMatchObject({
      quantity_needed: 2,
      quantity_purchased: 2,
      purchase_status: 'purchased',
    });
  } finally {
    await cleanupQaItems();
    expect(await fetchQaItems()).toHaveLength(0);
  }
});
