import { expect, test, type Page } from '@playwright/test';

const viewports = [
  { label: 'mobile', width: 390, height: 844 },
  { label: 'tablet', width: 820, height: 1180 },
  { label: 'desktop', width: 1440, height: 1024 },
] as const;

async function expectNoMeaningfulHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(0, doc.scrollWidth - doc.clientWidth);
  });
  expect(overflow).toBeLessThanOrEqual(8);
}

async function signIn(page: Page) {
  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('your@email.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function expectCoordinatorSurface(page: Page) {
  await page.goto('/dashboard/coordinator?bypassPayment=1&coordinatorDayofProof=1&fullSuiteResponsive=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Day-of view' })).toBeVisible({ timeout: 15_000 }).catch(async () => {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Day-of view' })).toBeVisible({ timeout: 20_000 });
  });
  await expect(page.getByText(/^Staffing handoff$/).first()).toBeVisible();
  await expect(page.getByText(/^Issue desk$/).first()).toBeVisible();
  await expect(page.getByText(/^Guest continuity$/).first()).toBeVisible();
  await expect(page.getByText(/^Runner board$/).first()).toBeVisible();
  await expect(page.getByText(/^Shift snapshot$/).first()).toBeVisible();
  await expectNoMeaningfulHorizontalOverflow(page);
}

async function expectNameChangeSurface(page: Page) {
  await page.goto('/dashboard/planning?tab=nameChange&bypassPayment=1&nameChangeRuntimeProof=1&fullSuiteResponsive=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Post-wedding name change roadmap' })).toBeVisible({ timeout: 15_000 }).catch(async () => {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Post-wedding name change roadmap' })).toBeVisible({ timeout: 20_000 });
  });
  await expect(page.getByRole('heading', { name: 'Institution handoff packets' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Wedding identity exports' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy action packet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy proof gap packet' })).toBeVisible();
  await expectNoMeaningfulHorizontalOverflow(page);
}

async function expectRegistrySurface(page: Page) {
  await page.goto('/dashboard/registry?bypassPayment=1&fullSuiteResponsive=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Registry' }).first()).toBeVisible({ timeout: 15_000 }).catch(async () => {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Registry' }).first()).toBeVisible({ timeout: 20_000 });
  });
  await expect(page.getByRole('heading', { name: 'Gifts and funds, clearly shared.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add gift' })).toBeVisible();
  await page.getByRole('button', { name: 'Add gift' }).click();
  await expect(page.getByRole('heading', { name: 'Add Registry Item' })).toBeVisible();
  await page.getByRole('button', { name: 'Scan barcode' }).click();
  await expect(page.getByText('Scan a barcode')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Use photo' })).toBeVisible();
  await expect(page.getByPlaceholder('UPC, EAN, GTIN, or ISBN')).toBeVisible();
  await expectNoMeaningfulHorizontalOverflow(page);
}

test('the three full-suite lanes stay usable across mobile, tablet, and desktop', async ({ page }) => {
  test.setTimeout(180_000);

  await signIn(page);

  for (const viewport of viewports) {
    await test.step(`responsive check: ${viewport.label}`, async () => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await expectCoordinatorSurface(page);
      await expectNameChangeSurface(page);
      await expectRegistrySurface(page);
    });
  }
});
