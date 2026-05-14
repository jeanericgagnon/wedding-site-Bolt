import { expect, test, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

async function enableLocalDemo(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('dayof_e2e_local_auth', '1');
  });

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

  await expect(page.getByRole('heading', { name: /keep gifts helpful, optional, and easy for guests/i })).toBeVisible();

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
  await expect(page.getByRole('button', { name: /save thank-you list/i })).toBeVisible();
  await page.getByRole('button', { name: /save thank-you list/i }).click();
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
