import { expect, test } from '@playwright/test';
import { signInAsOwner } from './liveOwnerSession';
import { resolveLiveGuestHubProofContext } from './liveGuestHubProofContext';
import { resolveLiveGuestPreviewVisibilityPair } from './liveGuestPreviewProofContext';

async function expectGuestsDashboard(page: import('@playwright/test').Page) {
  await expect(page).toHaveURL(/\/dashboard\/guests(?:\?|$)/);
  await expect(page.getByRole('heading', { name: /^People, replies, and details\.$/i })).toBeVisible();
}

test('live owner guest preview opens real guest-facing routes without token leakage in UI chrome', async ({ page, context }) => {
  test.setTimeout(180_000);

  await signInAsOwner(page);
  const proofContext = await resolveLiveGuestHubProofContext(page);
  await page.goto('/dashboard/guests?bypassPayment=1&guestPreviewQa=1', { waitUntil: 'domcontentloaded' });
  await expectGuestsDashboard(page);

  await expect(page.locator('body')).not.toContainText(/invite_token=|token-[a-z0-9]/i);

  const searchInput = page.getByPlaceholder('Search guests...');
  await searchInput.fill(proofContext.guestEmail ?? proofContext.guestName);

  const rowMatcher = proofContext.guestEmail ?? proofContext.guestName;
  const guestRow = page.locator('tr', { hasText: rowMatcher }).first();
  await expect(guestRow).toBeVisible();
  await guestRow.getByRole('button', { name: 'Events' }).first().click();

  const guestDrawer = page.getByRole('dialog', { name: new RegExp(`${proofContext.guestName} guest drawer`, 'i') });
  await expect(guestDrawer).toBeVisible();
  await expect(guestDrawer.getByText(new RegExp(`Previewing as ${proofContext.guestName}`, 'i'))).toBeVisible();
  await expect(page.locator('body')).not.toContainText(proofContext.guestInviteToken);

  const openSitePreviewButton = guestDrawer.getByRole('button', { name: /Open public site view/i });
  await openSitePreviewButton.scrollIntoViewIfNeeded();
  const [sitePreviewPage] = await Promise.all([
    context.waitForEvent('page'),
    openSitePreviewButton.click(),
  ]);

  await sitePreviewPage.waitForLoadState('domcontentloaded');
  await expect(sitePreviewPage).toHaveURL(/\/site\/.+previewGuest=.+previewSurface=public/);
  await expect(sitePreviewPage.getByText(/owner preview mode/i)).toBeVisible();
  await expect(sitePreviewPage.locator('body')).not.toContainText(proofContext.guestInviteToken);
  await sitePreviewPage.close();

  const rsvpPreviewButton = guestDrawer.getByRole('button', { name: /Open RSVP as guest/i });
  if (await rsvpPreviewButton.count()) {
    await rsvpPreviewButton.scrollIntoViewIfNeeded();
    const [rsvpPreviewPage] = await Promise.all([
      context.waitForEvent('page'),
      rsvpPreviewButton.click(),
    ]);
    await rsvpPreviewPage.waitForLoadState('domcontentloaded');
    await expect(rsvpPreviewPage).toHaveURL(/\/rsvp\?token=.+previewGuest=.+previewSurface=rsvp/);
    await expect(rsvpPreviewPage.locator('body')).not.toContainText(proofContext.guestInviteToken);
    await rsvpPreviewPage.close();
  }
});

test('live guest preview drawer proves an event is visible to the right guest and hidden from the wrong guest', async ({ page }) => {
  test.setTimeout(180_000);

  await signInAsOwner(page);
  const proofPair = await resolveLiveGuestPreviewVisibilityPair(page);
  await page.goto('/dashboard/guests?bypassPayment=1&guestPreviewQa=1', { waitUntil: 'domcontentloaded' });
  await expectGuestsDashboard(page);

  const searchInput = page.getByPlaceholder('Search guests...');

  await searchInput.fill(proofPair.rightGuest.guestEmail ?? proofPair.rightGuest.guestName);
  const rightRow = page.locator('tr', { hasText: proofPair.rightGuest.guestEmail ?? proofPair.rightGuest.guestName }).first();
  await expect(rightRow).toBeVisible();
  await rightRow.getByRole('button', { name: 'Events' }).first().click();

  const rightDrawer = page.getByRole('dialog', { name: new RegExp(`${proofPair.rightGuest.guestName} guest drawer`, 'i') });
  await expect(rightDrawer).toBeVisible();
  await expect(rightDrawer.getByText(new RegExp(`Visible to this guest:.*${proofPair.visibleEventName}`, 'i')).first()).toBeVisible();
  await expect(rightDrawer.getByText(new RegExp(`Hidden from this guest:.*${proofPair.visibleEventName}`, 'i'))).toHaveCount(0);
  await rightDrawer.getByRole('button', { name: 'Close guest drawer' }).click();
  await expect(rightDrawer).toHaveCount(0);

  await searchInput.fill(proofPair.wrongGuest.guestEmail ?? proofPair.wrongGuest.guestName);
  const wrongRow = page.locator('tr', { hasText: proofPair.wrongGuest.guestEmail ?? proofPair.wrongGuest.guestName }).first();
  await expect(wrongRow).toBeVisible();
  await wrongRow.getByRole('button', { name: 'Events' }).first().click();

  const wrongDrawer = page.getByRole('dialog', { name: new RegExp(`${proofPair.wrongGuest.guestName} guest drawer`, 'i') });
  await expect(wrongDrawer).toBeVisible();
  await expect(wrongDrawer.getByText(new RegExp(`Hidden from this guest:.*${proofPair.visibleEventName}`, 'i')).first()).toBeVisible();
  await expect(wrongDrawer.getByText(new RegExp(`Visible to this guest:.*${proofPair.visibleEventName}`, 'i'))).toHaveCount(0);
});
