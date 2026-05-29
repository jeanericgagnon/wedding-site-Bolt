import { expect, test, type Page } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 390, height: 844 };

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

async function expectBuilderV2PrimaryRoute(page: Page) {
  await page.goto('/dashboard/builder', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveURL(/\/dashboard\/builder(?:\?|$)/);
  await expect(page.getByRole('heading', { name: /structured editing with (visible|live) preview/i })).toBeVisible();
  await expect(page.getByText(/^site editor$/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /back to editor guide/i })).toBeVisible();
}

async function expectBuilderGuideRoute(page: Page) {
  await page.goto('/dashboard/builder-guide', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveURL(/\/dashboard\/builder-guide(?:\?|$)/);
  await expect(page.getByRole('heading', { name: /choose the right editor for the next step/i })).toBeVisible();
  await expect(page.getByText(/builder v2 is the structured editing lane we are deepening/i)).toBeVisible();
  await expect(page.getByText(/continue in the current legacy editor/i)).toBeVisible();
}

async function expectLegacyFallbackRoute(page: Page) {
  await page.goto('/dashboard/builder-v1?photoTips=1#builder-concierge', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveURL(/\/dashboard\/builder-v1(?:\?|#|$)/);
  const concierge = page.locator('#builder-concierge');
  await expect(concierge).toBeVisible();
  await expect(concierge.getByText(/builder concierge/i)).toBeVisible();
  await expect(concierge.getByText(/best next move/i).first()).toBeVisible();
}

test.describe('builder cutover signed local smoke', () => {
  test('promoted Builder V2 route opens the live editor for a local auth session', async ({ page, baseURL }) => {
    test.skip(!isLocalBaseURL(baseURL), 'Local auth bypass is only valid on localhost.');

    await enableLocalBuilderAuth(page);
    await expectBuilderV2PrimaryRoute(page);
  });

  test('explicit builder guide route stays on the guide for a local auth session', async ({ page, baseURL }) => {
    test.skip(!isLocalBaseURL(baseURL), 'Local auth bypass is only valid on localhost.');

    await enableLocalBuilderAuth(page);
    await expectBuilderGuideRoute(page);
  });

  test('legacy builder fallback stays understandable for a local auth session', async ({ page, baseURL }) => {
    test.skip(!isLocalBaseURL(baseURL), 'Local auth bypass is only valid on localhost.');

    await enableLocalBuilderAuth(page);
    await expectLegacyFallbackRoute(page);
  });

  test('promoted Builder V2 and guide routes stay usable on a mobile viewport', async ({ page, baseURL }) => {
    test.skip(!isLocalBaseURL(baseURL), 'Local auth bypass is only valid on localhost.');

    await page.setViewportSize(MOBILE_VIEWPORT);
    await enableLocalBuilderAuth(page);
    await expectBuilderV2PrimaryRoute(page);
    await expectBuilderGuideRoute(page);
  });
});
