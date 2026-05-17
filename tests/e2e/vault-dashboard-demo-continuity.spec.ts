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

async function enterVaultRoute(page: Page, runId: string) {
  const targetPath = `/dashboard/vault?bypassPayment=1&vaultOwnerQa=${runId}`;
  await page.goto(targetPath, { waitUntil: 'domcontentloaded' });

  const tryDemo = page.getByRole('button', { name: /try demo/i });
  if (await tryDemo.isVisible().catch(() => false)) {
    await Promise.all([
      page.waitForURL(/\/dashboard\//),
      tryDemo.click(),
    ]);
    await page.goto(targetPath, { waitUntil: 'domcontentloaded' });
  }
}

test('demo vault dashboard clears the loading shell and stays ready after reload', async ({ page }) => {
  const runId = String(Date.now());

  await enableLocalDemo(page);
  await enterVaultRoute(page, runId);

  await expect(page.getByRole('heading', { name: 'Memory Vaults' })).toBeVisible();
  await expect(page.getByText('Private keepsakes', { exact: true })).toBeVisible();
  await expect(page.getByText('How Vaults work')).toBeVisible();
  await expect(page.getByText('Loading vaults…')).toHaveCount(0);
  await expect(page.getByText('Couldn’t open vaults right now')).toHaveCount(0);

  await page.reload({ waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'Memory Vaults' })).toBeVisible();
  await expect(page.getByText('Private keepsakes', { exact: true })).toBeVisible();
  await expect(page.getByText('How Vaults work')).toBeVisible();
  await expect(page.getByText('Loading vaults…')).toHaveCount(0);
  await expect(page.getByText('Couldn’t open vaults right now')).toHaveCount(0);
});
