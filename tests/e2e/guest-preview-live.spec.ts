import { expect, test } from '@playwright/test';
import { signInAsOwner } from './liveOwnerSession';

test('live owner guest preview opens real guest-facing routes without token leakage in UI chrome', async ({ page, context }) => {
  test.setTimeout(180_000);

  await signInAsOwner(page);
  await page.goto('/dashboard/guests?bypassPayment=1&guestPreviewQa=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /know who is coming|guests & rsvp/i })).toBeVisible();

  await expect(page.locator('body')).not.toContainText(/invite_token=|token-[a-z0-9]/i);

  let sitePreviewPage;
  const guestViewButton = page.getByRole('button', { name: /Guest view/i }).first();
  if (await guestViewButton.count()) {
    await expect(guestViewButton).toBeVisible();
    [sitePreviewPage] = await Promise.all([
      context.waitForEvent('page'),
      guestViewButton.click(),
    ]);
  } else {
    const eventsButton = page.getByRole('button', { name: 'Events' }).first();
    await expect(eventsButton).toBeVisible();
    await eventsButton.click();

    const guestDrawer = page.getByRole('dialog').filter({ hasText: /Previewing as/i }).first();
    await expect(guestDrawer).toBeVisible();
    await expect(guestDrawer.getByText(/Previewing as/i)).toBeVisible();

    const openSitePreviewButton = guestDrawer.getByRole('button', { name: /Open public site view/i });
    await openSitePreviewButton.scrollIntoViewIfNeeded();
    [sitePreviewPage] = await Promise.all([
      context.waitForEvent('page'),
      openSitePreviewButton.click(),
    ]);
  }

  await sitePreviewPage.waitForLoadState('domcontentloaded');
  await expect(sitePreviewPage).toHaveURL(/\/site\/.+previewGuest=.+previewSurface=public/);
  await expect(sitePreviewPage.getByText(/owner preview mode/i)).toBeVisible();
  await expect(sitePreviewPage.locator('body')).not.toContainText(/invite_token=|token-[a-z0-9]/i);
  await sitePreviewPage.close();
});
