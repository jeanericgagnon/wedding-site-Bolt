import { expect, test, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

const mobileViewport = { width: 390, height: 844 };

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

async function expectNoMeaningfulHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(0, doc.scrollWidth - doc.clientWidth);
  });
  expect(overflow).toBeLessThanOrEqual(8);
}

test('mobile guest drawer preview opens photo, travel, registry, and site routes without leaking raw tokens', async ({ page, context }) => {
  await page.setViewportSize(mobileViewport);
  await enableLocalDemo(page);
  await page.goto('/dashboard/guests?bypassPayment=1&guestPreviewQa=1', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /All \(120\)/i }).click();
  if (await page.locator('table').count() === 0) {
    await page.getByRole('button', { name: 'Households' }).click();
  }

  const searchInput = page.getByPlaceholder('Search guests...');
  await searchInput.fill('Noah Waters');

  const noahRow = page.locator('tr', { hasText: 'noah.waters+1@dayof.demo' }).first();
  await expect(noahRow).toBeVisible();
  await noahRow.getByRole('button', { name: 'Events' }).first().click();

  const noahDrawer = page.getByRole('dialog', { name: 'Noah Waters guest drawer' });
  await expect(noahDrawer.getByText('2 of 4 events visible')).toBeVisible();
  await expect(noahDrawer.getByText(/Hidden from this guest: Welcome Dinner, Sunday Brunch/i)).toBeVisible();

  const openPhotoButton = noahDrawer.getByRole('button', { name: 'Open photo upload as guest' });
  await openPhotoButton.scrollIntoViewIfNeeded();
  const [photoPage] = await Promise.all([
    context.waitForEvent('page'),
    openPhotoButton.click(),
  ]);
  await photoPage.waitForLoadState('domcontentloaded');
  await expect(photoPage).toHaveURL(/\/photos\/upload\?site=alex-jordan-demo&hub=1&invite_token=token-c-2&previewGuest=confirmed-guest-1&previewSurface=photos/);
  await expect(photoPage.getByRole('heading', { name: /share your photos/i })).toBeVisible();
  await expect(photoPage.locator('body')).not.toContainText('token-c-2');
  await expectNoMeaningfulHorizontalOverflow(photoPage);
  await photoPage.close();

  const openTravelButton = noahDrawer.getByRole('button', { name: 'Open travel section as guest' });
  await openTravelButton.scrollIntoViewIfNeeded();
  const [travelPage] = await Promise.all([
    context.waitForEvent('page'),
    openTravelButton.click(),
  ]);
  await travelPage.waitForLoadState('domcontentloaded');
  await expect(travelPage).toHaveURL(/\/site\/alex-jordan-demo\?previewGuest=confirmed-guest-1&previewSurface=travel#travel/);
  await expect(travelPage.getByText(/owner preview mode/i)).toBeVisible();
  await expect(travelPage.locator('body')).not.toContainText('token-c-2');
  await expectNoMeaningfulHorizontalOverflow(travelPage);
  await travelPage.close();

  const openRegistryButton = noahDrawer.getByRole('button', { name: 'Open registry section as guest' });
  await openRegistryButton.scrollIntoViewIfNeeded();
  const [registryPage] = await Promise.all([
    context.waitForEvent('page'),
    openRegistryButton.click(),
  ]);
  await registryPage.waitForLoadState('domcontentloaded');
  await expect(registryPage).toHaveURL(/\/site\/alex-jordan-demo\?previewGuest=confirmed-guest-1&previewSurface=registry#registry/);
  await expect(registryPage.getByText(/owner preview mode/i)).toBeVisible();
  await expect(registryPage.locator('body')).not.toContainText('token-c-2');
  await expectNoMeaningfulHorizontalOverflow(registryPage);
  await registryPage.close();

  const openPublicSiteButton = noahDrawer.getByRole('button', { name: 'Open public site view' });
  await openPublicSiteButton.scrollIntoViewIfNeeded();
  const [sitePreviewPage] = await Promise.all([
    context.waitForEvent('page'),
    openPublicSiteButton.click(),
  ]);
  await sitePreviewPage.waitForLoadState('domcontentloaded');
  await expect(sitePreviewPage).toHaveURL(/\/site\/alex-jordan-demo\?previewGuest=confirmed-guest-1&previewSurface=public/);
  await expect(sitePreviewPage.getByText(/owner preview mode/i)).toBeVisible();
  await expect(sitePreviewPage.locator('body')).not.toContainText('token-c-2');
  await expectNoMeaningfulHorizontalOverflow(sitePreviewPage);
  await sitePreviewPage.close();
});
