import { expect, test, type Page } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 390, height: 844 };

async function enableLocalFirstSessionAuth(page: Page) {
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

async function expectSignedOutEntryPath(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /a calmer wedding operating system/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /start your wedding site draft/i }).first()).toBeVisible();
  await page.getByRole('button', { name: /start your wedding site draft/i }).first().click();

  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole('heading', { name: /start your wedding/i })).toBeVisible();
  await expect(page.getByText(/create your account, then/i)).toBeVisible();

  await page.goto('/product', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /start with the website\. keep the rest close\./i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /what couples can rely on right now/i })).toBeVisible();
}

async function expectSignedInFirstSessionPath(page: Page) {
  await page.goto('/onboarding/celebration?bypassPayment=1', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveURL(/\/onboarding\/celebration(?:\?|$)/);
  await expect(page.getByRole('heading', { name: /congratulations/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /start ai-assisted setup/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /open editor guide/i })).toBeVisible();

  await page.getByRole('button', { name: /start ai-assisted setup/i }).click();
  await expect(page).toHaveURL(/\/onboarding\/quick-start\?bypassPayment=1/);
  await expect(page.getByRole('heading', { name: /who['’]s getting married\?/i })).toBeVisible();
  await expect(page.getByText(/use the names exactly how you want guests to see them on the site/i)).toBeVisible();

  await page.goto('/dashboard/guests?bypassPayment=1&fromQuickStart=1&next=photos', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/dashboard\/guests\?bypassPayment=1&fromQuickStart=1&next=photos/);
  await expect(page.getByRole('heading', { name: /guests (&|and) rsvp/i }).first()).toBeVisible();
  await expect(page.getByText(/next up: import guests, then add photos/i)).toBeVisible();
  await page.getByRole('button', { name: /skip to photos/i }).click();

  await expect(page).toHaveURL(/\/dashboard\/photos\?bypassPayment=1&fromQuickStart=1&next=review/);
  await expect(page.getByText(/next up: add photos, then review your draft/i)).toBeVisible();
  await page.getByRole('button', { name: /continue to review/i }).click();

  await expect(page).toHaveURL(/\/dashboard\/overview\?bypassPayment=1&fromQuickStart=1/);
  await expect(page.getByRole('heading', { name: /^overview$/i }).first()).toBeVisible();
  await expect(page.getByRole('main').getByText(/your wedding at a glance/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /open shared website/i }).first()).toBeVisible();
  await expect(page.getByText(/shared and visible to guests/i).first()).toBeVisible();

  await page.goto('/dashboard/builder-guide?bypassPayment=1', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/dashboard\/builder-guide(?:\?|$)/);
  await expect(page.getByRole('heading', { name: /choose the right editor for the next step/i })).toBeVisible();
}

test.describe('first-session local smoke', () => {
  test('signed-out entry routes carry a clear first-session path', async ({ page, baseURL }) => {
    test.skip(!isLocalBaseURL(baseURL), 'This smoke is tracked against localhost proof.');

    await expectSignedOutEntryPath(page);
  });

  test('signed-in first-session route moves from setup into build and review/share next steps', async ({ page, baseURL }) => {
    test.skip(!isLocalBaseURL(baseURL), 'Local auth bypass is only valid on localhost.');

    await enableLocalFirstSessionAuth(page);
    await expectSignedInFirstSessionPath(page);
  });

  test('signed-in first-session route stays usable on mobile', async ({ page, baseURL }) => {
    test.skip(!isLocalBaseURL(baseURL), 'Local auth bypass is only valid on localhost.');

    await page.setViewportSize(MOBILE_VIEWPORT);
    await enableLocalFirstSessionAuth(page);
    await expectSignedInFirstSessionPath(page);
  });
});
