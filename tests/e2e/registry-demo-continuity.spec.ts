import { expect, test, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

const REGISTRY_STORAGE_KEY = 'dayof.demo.registry.state.v1';

async function enableLocalDemo(page: Page, seedRegistryState = false) {
  await page.addInitScript(({ shouldSeed, storageKey }) => {
    window.localStorage.setItem('dayof_e2e_local_auth', '1');

    if (!shouldSeed || window.localStorage.getItem(storageKey)) return;

    const nowIso = new Date().toISOString();
    const seededItems = [
      {
        id: 'registry-bad-import',
        wedding_site_id: 'demo-site-id',
        item_type: 'product',
        source_type: 'link',
        item_name: 'Page not found',
        price_label: null,
        price_amount: null,
        store_name: null,
        merchant: null,
        item_url: 'https://crateandbarrel.com/wedding/proof-serving-bowl',
        canonical_url: 'https://crateandbarrel.com/wedding/proof-serving-bowl',
        image_url: null,
        description: null,
        notes: null,
        quantity_needed: 1,
        quantity_purchased: 0,
        purchaser_name: null,
        purchase_status: 'available',
        hide_when_purchased: false,
        sort_order: 0,
        priority: 'medium',
        availability: null,
        metadata_last_checked_at: null,
        metadata_fetch_status: 'blocked',
        metadata_confidence_score: 0.22,
        metadata_source_method: 'manual',
        metadata_retailer: 'crate-and-barrel',
        previous_price_amount: null,
        price_last_changed_at: null,
        next_refresh_at: null,
        last_auto_refreshed_at: null,
        refresh_fail_count: 3,
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: 'registry-duplicate-1',
        wedding_site_id: 'demo-site-id',
        item_type: 'product',
        source_type: 'link',
        item_name: 'Breville Espresso Machine',
        price_label: '$699',
        price_amount: 699,
        store_name: 'Williams Sonoma',
        merchant: 'Williams Sonoma',
        item_url: 'https://www.williams-sonoma.com/products/breville-espresso-machine',
        canonical_url: 'https://www.williams-sonoma.com/products/breville-espresso-machine',
        image_url: 'https://images.example.com/espresso-1.jpg',
        description: 'Primary owner-approved listing.',
        notes: null,
        quantity_needed: 1,
        quantity_purchased: 0,
        purchaser_name: null,
        purchase_status: 'available',
        hide_when_purchased: false,
        sort_order: 1,
        priority: 'high',
        availability: null,
        metadata_last_checked_at: nowIso,
        metadata_fetch_status: 'success',
        metadata_confidence_score: 0.92,
        metadata_source_method: 'adapter',
        metadata_retailer: 'williams-sonoma',
        previous_price_amount: null,
        price_last_changed_at: null,
        next_refresh_at: null,
        last_auto_refreshed_at: nowIso,
        refresh_fail_count: 0,
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: 'registry-duplicate-2',
        wedding_site_id: 'demo-site-id',
        item_type: 'product',
        source_type: 'link',
        item_name: 'Breville Espresso Machine',
        price_label: '$699',
        price_amount: 699,
        store_name: 'Williams Sonoma',
        merchant: 'Williams Sonoma',
        item_url: 'https://www.williams-sonoma.com/products/breville-espresso-machine?sku=proof',
        canonical_url: 'https://www.williams-sonoma.com/products/breville-espresso-machine',
        image_url: null,
        description: null,
        notes: 'Imported duplicate.',
        quantity_needed: 1,
        quantity_purchased: 1,
        purchaser_name: 'Duplicate Buyer',
        purchase_status: 'purchased',
        hide_when_purchased: false,
        sort_order: 2,
        priority: 'medium',
        availability: null,
        metadata_last_checked_at: null,
        metadata_fetch_status: 'error',
        metadata_confidence_score: 0.41,
        metadata_source_method: 'manual',
        metadata_retailer: 'williams-sonoma',
        previous_price_amount: null,
        price_last_changed_at: null,
        next_refresh_at: null,
        last_auto_refreshed_at: null,
        refresh_fail_count: 2,
        created_at: nowIso,
        updated_at: nowIso,
      },
    ];

    window.localStorage.setItem(storageKey, JSON.stringify({
      savedAtISO: nowIso,
      value: {
        items: seededItems,
        thankYouLedger: {},
      },
    }));
  }, { shouldSeed: seedRegistryState, storageKey: REGISTRY_STORAGE_KEY });

  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.includes('/auth/v1/user')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'demo-local-user', email: 'demo@dayof.love' }),
      });
      return;
    }
    await route.continue();
  });
}

async function enterRegistryRoute(page: Page, runId: string) {
  const targetPath = `/dashboard/registry?bypassPayment=1&registryDemoContinuityQa=${runId}`;
  await page.goto(targetPath, { waitUntil: 'domcontentloaded' });

  const tryDemo = page.getByRole('button', { name: /try demo/i });
  if (await tryDemo.isVisible().catch(() => false)) {
    await Promise.all([
      page.waitForURL(/\/dashboard/),
      tryDemo.click(),
    ]);
    await page.goto(targetPath, { waitUntil: 'domcontentloaded' });
  }
}

test('demo registry purchase state and thank-you follow-up survive reloads', async ({ page }) => {
  const runId = String(Date.now());
  const purchaserName = `Alex Proof ${runId}`;

  await enableLocalDemo(page);
  await enterRegistryRoute(page, runId);

  await expect(page.getByRole('heading', { name: 'Gifts and funds, clearly shared.' })).toBeVisible();

  const mixerCard = page.locator('[data-testid="owner-registry-item-card"]').filter({ hasText: 'KitchenAid Stand Mixer' }).first();
  await expect(mixerCard).toBeVisible();
  await mixerCard.getByRole('button', { name: /mark as purchased/i }).click();
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(mixerCard.getByRole('button', { name: /clear purchase state/i })).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(
    page
      .locator('[data-testid="owner-registry-item-card"]')
      .filter({ hasText: 'KitchenAid Stand Mixer' })
      .first()
      .getByRole('button', { name: /clear purchase state/i }),
  ).toBeVisible();

  const dutchOvenCard = page.locator('[data-testid="owner-registry-item-card"]').filter({ hasText: 'Le Creuset Dutch Oven' }).first();
  await expect(dutchOvenCard).toBeVisible();
  await dutchOvenCard.getByRole('button', { name: 'Edit' }).click();

  const purchaserInput = page.getByLabel(/purchaser name/i);
  await purchaserInput.fill(purchaserName);
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(dutchOvenCard.getByText(`Purchased by ${purchaserName}`)).toBeVisible();

  const reviewDetails = page.locator('details').filter({ hasText: 'Gift snapshot and review details' }).first();
  await reviewDetails.locator('summary').click();
  await expect(page.getByRole('button', { name: /save thank-you updates/i })).toBeVisible();
  await page.getByRole('button', { name: /save thank-you updates/i }).click();
  await page.getByRole('button', { name: /mark sent/i }).click();
  await expect(page.getByRole('button', { name: /clear sent/i })).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('details').filter({ hasText: 'Gift snapshot and review details' }).first().locator('summary').click();
  await expect(
    page
      .locator('[data-testid="owner-registry-item-card"]')
      .filter({ hasText: 'Le Creuset Dutch Oven' })
      .first()
      .getByText(`Purchased by ${purchaserName}`),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /clear sent/i })).toBeVisible();
});

test('demo registry cleanup and duplicate merge survive reloads', async ({ page }) => {
  const runId = `repair-${Date.now()}`;

  await enableLocalDemo(page, true);
  await enterRegistryRoute(page, runId);

  await expect(page.getByText('Detail touchups', { exact: true })).toBeVisible();
  await expect(page.getByText('Possible repeat group')).toBeVisible();
  await expect(page.locator('[data-testid="owner-registry-item-card"]').filter({ hasText: 'Gift link needs review' })).toHaveCount(1);

  await page.getByRole('button', { name: /clean up imported gifts/i }).first().click();
  await expect(page.locator('[data-testid="owner-registry-item-card"]').filter({ hasText: 'Proof Serving Bowl' })).toHaveCount(1);
  await expect(page.getByText('Gift link needs review')).toHaveCount(0);

  await page.getByRole('button', { name: /merge 2 items/i }).click();
  await expect(page.getByText('Possible repeat group')).toHaveCount(0);
  const espressoCards = page.locator('[data-testid="owner-registry-item-card"]').filter({ hasText: 'Breville Espresso Machine' });
  await expect(espressoCards).toHaveCount(1);
  await expect(espressoCards.first()).toContainText('Purchased by Duplicate Buyer');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Possible repeat group')).toHaveCount(0);
  await expect(page.locator('[data-testid="owner-registry-item-card"]').filter({ hasText: 'Breville Espresso Machine' })).toHaveCount(1);
  await expect(page.locator('[data-testid="owner-registry-item-card"]').filter({ hasText: 'Proof Serving Bowl' })).toHaveCount(1);
});
