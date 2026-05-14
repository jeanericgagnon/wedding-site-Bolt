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

async function enterPlanningRoute(page: Page, tab: 'budget' | 'vendors', runId: string) {
  const targetPath = `/dashboard/planning?bypassPayment=1&tab=${tab}&budgetVendorLedgerQa=${runId}`;
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

test('demo planning ledger keeps owner vendor and budget CRUD changes across reloads', async ({ page }) => {
  const runId = String(Date.now());
  const vendorName = `QA Ledger Florals ${runId}`;
  const updatedVendorContact = `Iris Bloom ${runId}`;
  const budgetName = `QA Ledger Deposit ${runId}`;

  await enableLocalDemo(page);

  await enterPlanningRoute(page, 'vendors', runId);
  await expect(page.getByText(/vendor reminder ledger/i)).toBeVisible();

  await page.getByRole('button', { name: /add vendor/i }).click();
  await page.getByLabel('Type *').selectOption('Florist');
  await page.getByLabel('Business Name *').fill(vendorName);
  await page.getByLabel('Contact Name').fill('Iris Bloom');
  await page.getByLabel('Email').fill(`ledger.${runId}@example.com`);
  await page.getByLabel('Contract Total ($)').fill('2400');
  await page.getByLabel('Amount Paid ($)').fill('600');
  await page.getByRole('button', { name: 'Save Vendor' }).click();
  await expect(page.getByRole('button', { name: `Edit vendor ${vendorName}` })).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: `Edit vendor ${vendorName}` })).toBeVisible();

  await page.getByRole('button', { name: `Edit vendor ${vendorName}` }).click();
  await page.getByLabel('Contact Name').fill(updatedVendorContact);
  await page.getByLabel('Amount Paid ($)').fill('900');
  await page.getByRole('button', { name: 'Save Vendor' }).click();
  await expect(page.getByText(updatedVendorContact)).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText(updatedVendorContact)).toBeVisible();

  await page.getByRole('button', { name: `Delete vendor ${vendorName}` }).click();
  await expect(page.getByRole('button', { name: `Edit vendor ${vendorName}` })).toHaveCount(0);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: `Edit vendor ${vendorName}` })).toHaveCount(0);

  await enterPlanningRoute(page, 'budget', runId);
  await expect(page.getByText(/budget and vendor ledger/i)).toBeVisible();

  await page.getByRole('button', { name: /add expense/i }).click();
  await page.getByLabel('Category *').selectOption('Florals & Decor');
  await page.getByLabel('Item Name *').fill(budgetName);
  await page.getByLabel('Estimated ($)').fill('1800');
  await page.getByLabel('Actual ($)').fill('1200');
  await page.getByLabel('Paid ($)').fill('500');
  await page.getByLabel('Notes').fill('Proof budget continuity');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: `Edit budget item ${budgetName}` })).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: `Edit budget item ${budgetName}` })).toBeVisible();

  await page.getByRole('button', { name: `Edit budget item ${budgetName}` }).click();
  await page.getByLabel('Actual ($)').fill('1400');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('$1,400', { exact: true })).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('$1,400', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: `Delete budget item ${budgetName}` }).click();
  await expect(page.getByRole('button', { name: `Edit budget item ${budgetName}` })).toHaveCount(0);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: `Edit budget item ${budgetName}` })).toHaveCount(0);
});
