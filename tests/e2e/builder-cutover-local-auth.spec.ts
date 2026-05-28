import { expect, test, type Page } from '@playwright/test';

async function enableLocalBuilderAuth(page: Page) {
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

function isLocalBaseURL(baseURL: string | undefined) {
  if (!baseURL) return false;
  return /127\.0\.0\.1|localhost/i.test(baseURL);
}

test.describe('builder cutover signed local smoke', () => {
  test('promoted Builder V2 route opens the live editor for a local auth session', async ({ page, baseURL }) => {
    test.skip(!isLocalBaseURL(baseURL), 'Local auth bypass is only valid on localhost.');

    await enableLocalBuilderAuth(page);
    await page.goto('/dashboard/builder', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/dashboard\/builder(?:\?|$)/);
    await expect(page.getByRole('heading', { name: /structured editing with live preview/i })).toBeVisible();
    await expect(page.getByText(/site editor/i)).toBeVisible();
  });

  test('explicit builder guide route stays on the guide for a local auth session', async ({ page, baseURL }) => {
    test.skip(!isLocalBaseURL(baseURL), 'Local auth bypass is only valid on localhost.');

    await enableLocalBuilderAuth(page);
    await page.goto('/dashboard/builder-guide', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/dashboard\/builder-guide(?:\?|$)/);
    await expect(page.getByRole('heading', { name: /choose the right editor for the next step/i })).toBeVisible();
    await expect(page.getByText(/builder v2 is the structured editing lane we are deepening/i)).toBeVisible();
  });
});
