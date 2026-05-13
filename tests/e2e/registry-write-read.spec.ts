import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

test.skip(process.env.LIVE_REGISTRY_WRITE_READ !== '1', 'Set LIVE_REGISTRY_WRITE_READ=1 to create, verify, and delete a production QA registry item.');

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

test('registry owner add persists and public registry endpoint stays readable', async ({ page }) => {
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
  const duplicateEditedItemName = `Registry QA Duplicate Merge ${runId}`;
  const barcodeSourceValue = '5449000000996';
  const barcodeEditedItemName = `Registry QA Barcode Gift ${runId}`;
  const appBaseUrl = process.env.PLAYWRIGHT_BASE_URL || 'https://dayof.love';
  const registryFixtureOrigin = /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?/i.test(appBaseUrl)
    ? 'https://dayof.love'
    : appBaseUrl;
  const registryFixtureUrl = `${registryFixtureOrigin}/qa/registry-product.html?run=${runId}`;
  let ownerAccessToken = '';
  let proofSiteId = '';
  let publicSiteInviteToken = '';
  let readablePublicSiteId = '';
  let readablePublicInviteToken = '';

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
      select: 'id,wedding_site_id,item_name,merchant,price_amount,notes,image_url,quantity_needed,quantity_purchased,purchase_status,purchaser_name,hide_when_purchased,source_type,barcode,selected_retailer,selected_product_url,estimated_price_cents,product_metadata',
      item_name: `ilike.*Registry QA*${runId}*`,
      order: 'created_at.desc',
    }));
    expect(response.ok).toBeTruthy();
    return await response.json() as Array<{
      id: string;
      wedding_site_id: string;
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
      source_type: string | null;
      barcode: string | null;
      selected_retailer: string | null;
      selected_product_url: string | null;
      estimated_price_cents: number | null;
      product_metadata: Record<string, unknown> | null;
    }>;
  };

  const cleanupQaItems = async () => {
    await expect.poll(async () => {
      const rows = await fetchQaItems().catch(() => []);
      for (const row of rows) {
        const response = await restFetch(restUrl('registry_items', { id: `eq.${row.id}` }), { method: 'DELETE' });
        expect(response.ok, `expected cleanup delete for registry item ${row.id} to succeed`).toBeTruthy();
      }
      const remaining = await fetchQaItems().catch(() => []);
      return remaining.length;
    }, {
      timeout: 20_000,
      message: 'expected QA registry cleanup to remove live proof rows',
    }).toBe(0);
  };

  const fetchPublicRegistryItems = async () => {
    const response = await fetch(`${supabaseUrl}/functions/v1/public-registry-items`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wedding_site_id: readablePublicSiteId || proofSiteId,
        inviteToken: readablePublicInviteToken || publicSiteInviteToken || null,
        limit: 500,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    expect(response.ok).toBeTruthy();
    const payload = await response.json() as { items?: Array<{ id: string; item_name: string; quantity_purchased: number; purchase_status: string; purchaser_name: string | null }> };
    return payload.items ?? [];
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
    await expect(page.getByRole('button', { name: 'Add gift' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByPlaceholder(/Search by name or store/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Loading registry…')).toHaveCount(0, { timeout: 30_000 }).catch(async () => {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
      await expect(page.getByText('Loading registry…')).toHaveCount(0, { timeout: 30_000 });
    });
  };

  const waitForRegistryPersistence = async () => {
    await expect.poll(async () => {
      const rows = await fetchQaItems();
      return rows.length;
    }, {
      timeout: 20_000,
      message: 'expected QA registry item to persist after add',
    }).toBeGreaterThan(0);

    const [savedItem] = await fetchQaItems();
    expect(savedItem).toBeTruthy();
    return savedItem;
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

  const siteResponse = await restFetch(restUrl('wedding_sites', {
    select: 'id,privacy_mode,guest_access_token',
    site_slug: `eq.${proofSiteSlug}`,
    limit: '1',
  }));
  expect(siteResponse.ok).toBeTruthy();
  const [site] = await siteResponse.json() as Array<{ id: string; privacy_mode: string | null; guest_access_token: string | null }>;
  expect(site?.id).toBeTruthy();
  proofSiteId = site.id;
  publicSiteInviteToken = typeof site.guest_access_token === 'string' ? site.guest_access_token : '';

  const readableSiteResponse = await restFetch(restUrl('wedding_sites', {
    select: 'id,guest_access_token',
    is_published: 'eq.true',
    limit: '25',
  }));
  expect(readableSiteResponse.ok).toBeTruthy();
  const readableSites = await readableSiteResponse.json() as Array<{ id: string; guest_access_token: string | null }>;
  for (const candidate of readableSites) {
    const response = await fetch(`${supabaseUrl}/functions/v1/public-registry-items`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wedding_site_id: candidate.id,
        inviteToken: candidate.guest_access_token || null,
        limit: 1,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) continue;
    const payload = await response.json() as { items?: Array<unknown> };
    if (Array.isArray(payload.items) && payload.items.length > 0) {
      readablePublicSiteId = candidate.id;
      readablePublicInviteToken = candidate.guest_access_token || '';
      break;
    }
  }

  await cleanupQaItems();

  if (cleanupOnlyRunId) {
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

    const created = await waitForRegistryPersistence();
    proofSiteId = created.wedding_site_id;
    const [edited] = await fetchQaItems();
    expect(edited).toMatchObject({
      item_name: editedItemName,
      merchant: 'QA Home Store',
      price_amount: 48.75,
      notes: `Registry QA note ${runId}`,
      image_url: expect.stringMatching(/preview-photos|images\.weserv\.nl|ui-avatars/),
      quantity_needed: 2,
      quantity_purchased: 0,
      purchase_status: 'available',
    });

    await page.getByRole('button', { name: 'Add gift' }).click();
    await expect(page.getByRole('heading', { name: 'Add Registry Item' })).toBeVisible();
    await page.getByRole('button', { name: /add manually/i }).click();
    await page.getByPlaceholder('e.g. KitchenAid Stand Mixer').fill(duplicateEditedItemName);
    await page.getByPlaceholder('0.00').fill('52.00');
    await page.getByPlaceholder('e.g. Amazon, Target').fill('QA Home Store');
    await page.getByPlaceholder('https://store.com/product').fill(registryFixtureUrl);
    await page.getByPlaceholder(/Any notes for guests/i).fill(`Registry QA duplicate note ${runId}`);
    await page.getByRole('button', { name: 'Add to Registry' }).click();
    await expect(page.getByText('Item added to registry')).toBeVisible();

    await expect.poll(async () => {
      const rows = await fetchQaItems();
      return rows.length;
    }, {
      timeout: 20_000,
      message: 'expected duplicate QA registry item to persist after add',
    }).toBe(2);

    await expect(page.getByRole('button', { name: /merge 2 items/i })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /merge 2 items/i }).click();
    await expect(page.getByText(/merged 2 duplicate gifts into/i)).toBeVisible({ timeout: 20_000 });

    await expect.poll(async () => {
      const rows = await fetchQaItems();
      return {
        length: rows.length,
        notes: rows[0]?.notes || '',
        quantityNeeded: rows[0]?.quantity_needed ?? 0,
        itemName: rows[0]?.item_name || '',
      };
    }, {
      timeout: 20_000,
      message: 'expected duplicate registry merge to collapse the duplicate pair',
    }).toMatchObject({
      length: 1,
      quantityNeeded: 2,
      itemName: expect.stringMatching(new RegExp(runId)),
    });

    const rowsAfterMerge = await fetchQaItems();
    expect(rowsAfterMerge[0]?.notes || '').toContain(`Registry QA note ${runId}`);
    expect(rowsAfterMerge[0]?.notes || '').toContain(`Registry QA duplicate note ${runId}`);

    await page.getByRole('button', { name: 'Add gift' }).click();
    await expect(page.getByRole('heading', { name: 'Add Registry Item' })).toBeVisible();
    await page.getByRole('button', { name: /scan barcode/i }).click();
    await page.getByPlaceholder(/UPC, EAN, GTIN, or ISBN/i).fill(barcodeSourceValue);
    await page.getByRole('button', { name: 'Look up' }).click();
    await expect(page.getByPlaceholder('e.g. KitchenAid Stand Mixer')).not.toHaveValue('', { timeout: 20_000 });
    await page.getByPlaceholder('e.g. KitchenAid Stand Mixer').fill(barcodeEditedItemName);
    await page.getByPlaceholder(/Any notes for guests/i).fill(`Registry QA barcode note ${runId}`);
    await page.getByRole('button', { name: 'Add to Registry' }).click();
    await expect(page.getByText('Item added to registry')).toBeVisible();

    await expect.poll(async () => {
      const rows = await fetchQaItems();
      return rows.some((row) => row.barcode === barcodeSourceValue || row.item_name === barcodeEditedItemName);
    }, {
      timeout: 20_000,
      message: 'expected barcode-backed registry item to persist after add',
    }).toBe(true);

    const rowsAfterBarcode = await fetchQaItems();
    expect(rowsAfterBarcode).toHaveLength(2);
    const barcodeRow = rowsAfterBarcode.find((row) => row.barcode === barcodeSourceValue || row.item_name === barcodeEditedItemName);
    expect(barcodeRow).toBeTruthy();
    expect(barcodeRow).toMatchObject({
      item_name: barcodeEditedItemName,
      source_type: 'barcode',
      barcode: barcodeSourceValue,
      purchase_status: 'available',
    });
    expect(barcodeRow?.selected_retailer || barcodeRow?.merchant).toBeTruthy();
    expect((barcodeRow?.selected_product_url || '').length > 0 || (barcodeRow?.product_metadata && Object.keys(barcodeRow.product_metadata).length > 0)).toBeTruthy();

    const publicItems = await fetchPublicRegistryItems();
    expect(Array.isArray(publicItems)).toBe(true);
    await expect.poll(async () => {
      const publicItems = await fetchPublicRegistryItems();
      return publicItems.length;
    }, {
      timeout: 20_000,
      message: 'expected public registry items endpoint to remain readable',
    }).toBeGreaterThanOrEqual(0);
  } finally {
    await cleanupQaItems();
  }
});
