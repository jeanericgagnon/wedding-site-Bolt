import { expect, test, type Page } from '@playwright/test';
import { signInAsOwner } from './liveOwnerSession';
import { resolveLiveGuestHubProofContext } from './liveGuestHubProofContext';

const mobileViewport = { width: 390, height: 844 };

async function expectNoMeaningfulHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(0, doc.scrollWidth - doc.clientWidth);
  });
  expect(overflow).toBeLessThanOrEqual(8);
}

async function expectGuestsDashboard(page: Page) {
  await expect(page).toHaveURL(/\/dashboard\/guests(?:\?|$)/);
  await expect(page.getByRole('heading', { name: /^People, replies, and details\.$/i })).toBeVisible();
}

test('live mobile guest drawer preview opens guest-facing routes without leaking raw tokens', async ({ page, context }) => {
  test.setTimeout(180_000);

  await page.setViewportSize(mobileViewport);
  await signInAsOwner(page);
  const proofContext = await resolveLiveGuestHubProofContext(page);

  await page.goto('/dashboard/guests?bypassPayment=1&guestPreviewQa=1', { waitUntil: 'domcontentloaded' });
  await expectGuestsDashboard(page);
  await expect(page.locator('body')).not.toContainText(proofContext.guestInviteToken);

  const searchInput = page.getByPlaceholder('Search guests...');
  await searchInput.fill(proofContext.guestEmail ?? proofContext.guestName);

  const rowMatcher = proofContext.guestEmail ?? proofContext.guestName;
  const guestRow = page.locator('tr', { hasText: rowMatcher }).first();
  await expect(guestRow).toBeVisible();
  await guestRow.getByRole('button', { name: 'Events' }).first().click();

  const guestDrawer = page.getByRole('dialog', { name: new RegExp(`${proofContext.guestName} guest drawer`, 'i') });
  await expect(guestDrawer).toBeVisible();
  await expect(guestDrawer.getByText(new RegExp(`Previewing as ${proofContext.guestName}`, 'i'))).toBeVisible();

  const openPhotoButton = guestDrawer.getByRole('button', { name: 'Open photo upload as guest' });
  await openPhotoButton.scrollIntoViewIfNeeded();
  const [photoPage] = await Promise.all([
    context.waitForEvent('page'),
    openPhotoButton.click(),
  ]);
  await photoPage.waitForLoadState('domcontentloaded');
  await expect(photoPage).toHaveURL(/\/photos\/upload\?.*previewGuest=.+previewSurface=photos/);
  await expect(photoPage.locator('body')).not.toContainText(proofContext.guestInviteToken);
  await expectNoMeaningfulHorizontalOverflow(photoPage);
  await photoPage.close();

  const openTravelButton = guestDrawer.getByRole('button', { name: 'Open travel section as guest' });
  await openTravelButton.scrollIntoViewIfNeeded();
  const [travelPage] = await Promise.all([
    context.waitForEvent('page'),
    openTravelButton.click(),
  ]);
  await travelPage.waitForLoadState('domcontentloaded');
  await expect(travelPage).toHaveURL(/\/site\/.+previewGuest=.+previewSurface=travel/);
  await expect(travelPage.getByText(/owner preview mode/i)).toBeVisible();
  await expect(travelPage.locator('body')).not.toContainText(proofContext.guestInviteToken);
  await expectNoMeaningfulHorizontalOverflow(travelPage);
  await travelPage.close();

  const openRegistryButton = guestDrawer.getByRole('button', { name: 'Open registry section as guest' });
  await openRegistryButton.scrollIntoViewIfNeeded();
  const [registryPage] = await Promise.all([
    context.waitForEvent('page'),
    openRegistryButton.click(),
  ]);
  await registryPage.waitForLoadState('domcontentloaded');
  await expect(registryPage).toHaveURL(/\/site\/.+previewGuest=.+previewSurface=registry/);
  await expect(registryPage.getByText(/owner preview mode/i)).toBeVisible();
  await expect(registryPage.locator('body')).not.toContainText(proofContext.guestInviteToken);
  await expectNoMeaningfulHorizontalOverflow(registryPage);
  await registryPage.close();

  const openPublicSiteButton = guestDrawer.getByRole('button', { name: 'Open public site view' });
  await openPublicSiteButton.scrollIntoViewIfNeeded();
  const [sitePreviewPage] = await Promise.all([
    context.waitForEvent('page'),
    openPublicSiteButton.click(),
  ]);
  await sitePreviewPage.waitForLoadState('domcontentloaded');
  await expect(sitePreviewPage).toHaveURL(/\/site\/.+previewGuest=.+previewSurface=public/);
  await expect(sitePreviewPage.getByText(/owner preview mode/i)).toBeVisible();
  await expect(sitePreviewPage.locator('body')).not.toContainText(proofContext.guestInviteToken);
  await expectNoMeaningfulHorizontalOverflow(sitePreviewPage);
  await sitePreviewPage.close();
});
