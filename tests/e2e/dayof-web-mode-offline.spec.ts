import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';

test.use({ serviceWorkers: 'allow' });

const mobileViewport = { width: 390, height: 844 };
const hubPath = '/event/alex-jordan-demo?invite_token=token-c-2&guestLang=fr&offlineProof=1';

async function expectNoMeaningfulHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(0, doc.scrollWidth - doc.clientWidth);
  });
  expect(overflow).toBeLessThanOrEqual(8);
}

async function waitForGuestHubSnapshot(page: Page) {
  await page.waitForFunction(() => {
    const value = window.localStorage.getItem('dayof.guestHub.offline.alex-jordan-demo');
    return Boolean(value && value.includes('savedAt'));
  });
}

async function waitForServiceWorkerControl(page: Page) {
  await page.waitForFunction(async () => {
    if (!('serviceWorker' in navigator)) return false;
    await navigator.serviceWorker.ready;
    return true;
  });

  const hasController = await page.evaluate(() => Boolean(navigator.serviceWorker?.controller));
  if (!hasController) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  }
}

async function warmGuestHub(page: Page) {
  await page.setViewportSize(mobileViewport);
  await page.goto(hubPath, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Everything guests need in one place\./i })).toBeVisible();
  await expect(page.getByText('Travel plan from this link')).toBeVisible();
  await expect(page.getByText('Access from this link')).toBeVisible();
  await expect(page.getByText('Guest-specific link')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('token-c-2');
  await waitForGuestHubSnapshot(page);
  await waitForServiceWorkerControl(page);
}

async function abortGuestHubRuntimeRequests(page: Page) {
  await page.route('**/functions/v1/**', async (route: Route) => {
    await route.abort('failed');
  });
  await page.route('**/rest/v1/**', async (route: Route) => {
    await route.abort('failed');
  });
}

async function goOffline(context: BrowserContext) {
  await context.setOffline(true);
}

async function goOnline(context: BrowserContext) {
  await context.setOffline(false);
}

test('guest hub keeps the saved in-app day-of snapshot usable offline', async ({ page, context }) => {
  await warmGuestHub(page);
  await abortGuestHubRuntimeRequests(page);
  await page.goto(`${hubPath}&hubQaRetryProof=1`, { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('Showing the saved guest hub')).toBeVisible();
  await expect(page.getByText('Travel plan from this link')).toBeVisible();
  await expect(page.getByText('Guest-specific link')).toBeVisible();
  await expect(page.getByRole('button', { name: /Try again/i })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('token-c-2');
  await expectNoMeaningfulHorizontalOverflow(page);
});

test('service worker serves the cached guest-hub offline shell for event navigation', async ({ page, context }) => {
  await warmGuestHub(page);
  await goOffline(context);

  await page.goto('/event/alex-jordan-demo/offline-shell-proof', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveTitle(/DayOf offline guest hub/i);
  await expect(page.getByText(/DayOf offline guest hub/i)).toBeVisible();
  await expect(page.getByText(/You are offline\. The last saved wedding hub is still available for travel, RSVP, and day-of status details\./i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Try live hub again/i })).toBeVisible();
  await expect(page.getByText('Travel quick plan')).toBeVisible();
  await expect(page.getByText('Saved travel details')).toBeVisible();
  await expect(page.getByText('Link access')).toBeVisible();
  await expect(page.getByText('Guest-specific link')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('token-c-2');
  await expectNoMeaningfulHorizontalOverflow(page);

  await goOnline(context);
});
