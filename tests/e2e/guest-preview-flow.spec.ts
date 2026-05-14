import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

async function enableLocalDemo(page: import('@playwright/test').Page) {
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

test('guests drawer preview shows visible vs hidden event access and opens real guest-facing routes', async ({ page, context }) => {
  await enableLocalDemo(page);
  await page.goto('/dashboard/guests?bypassPayment=1&guestPreviewQa=1', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /know who is coming and who still needs a gentle nudge/i })).toBeVisible();
  await page.getByRole('button', { name: 'Households' }).click();

  const searchInput = page.getByPlaceholder('Search guests...');

  await searchInput.fill('Emma Waters');
  const emmaRow = page.locator('tr', { hasText: 'emma.waters+0@dayof.demo' }).first();
  await expect(emmaRow).toBeVisible();
  await emmaRow.getByRole('button', { name: 'Events' }).click();

  const emmaDrawer = page.getByRole('dialog', { name: 'Emma Waters guest drawer' });
  await expect(emmaDrawer.getByText('Previewing as Emma Waters')).toBeVisible();
  await expect(emmaDrawer.getByText('4 of 4 events visible')).toBeVisible();
  await expect(emmaDrawer.locator('span').filter({ hasText: 'Welcome Dinner' }).first()).toBeVisible();
  await expect(emmaDrawer.locator('span').filter({ hasText: 'Sunday Brunch' }).first()).toBeVisible();

  const openSitePreviewButton = emmaDrawer.getByRole('button', { name: 'Open public site view' });
  await openSitePreviewButton.scrollIntoViewIfNeeded();

  const [sitePreviewPage] = await Promise.all([
    context.waitForEvent('page'),
    openSitePreviewButton.click(),
  ]);
  await sitePreviewPage.waitForLoadState('domcontentloaded');
  await expect(sitePreviewPage).toHaveURL(/\/site\/alex-jordan-demo\?previewGuest=confirmed-guest-0&previewSurface=public/);
  await expect(sitePreviewPage.getByText(/owner preview mode/i)).toBeVisible();
  await sitePreviewPage.close();

  await emmaDrawer.getByRole('button', { name: 'Close guest drawer' }).click();
  await expect(page.getByRole('dialog', { name: 'Emma Waters guest drawer' })).toHaveCount(0);

  await searchInput.fill('Noah Waters');
  const noahRow = page.locator('tr', { hasText: 'noah.waters+1@dayof.demo' }).first();
  await expect(noahRow).toBeVisible();
  await noahRow.getByRole('button', { name: 'Events' }).click();

  const noahDrawer = page.getByRole('dialog', { name: 'Noah Waters guest drawer' });
  await expect(noahDrawer.getByText('Previewing as Noah Waters')).toBeVisible();
  await expect(noahDrawer.getByText('2 of 4 events visible')).toBeVisible();
  await expect(noahDrawer.getByText(/Hidden from this guest: Welcome Dinner, Sunday Brunch/i)).toBeVisible();

  const openRsvpPreviewButton = noahDrawer.getByRole('button', { name: 'Open RSVP as guest' });
  await openRsvpPreviewButton.scrollIntoViewIfNeeded();

  const [rsvpPreviewPage] = await Promise.all([
    context.waitForEvent('page'),
    openRsvpPreviewButton.click(),
  ]);
  await rsvpPreviewPage.waitForLoadState('domcontentloaded');
  await expect(rsvpPreviewPage).toHaveURL(/\/rsvp\?token=token-c-2&previewGuest=confirmed-guest-1&previewSurface=rsvp/);
  await expect(rsvpPreviewPage.getByText(/your event access details/i)).toBeVisible();
  await rsvpPreviewPage.close();
});
