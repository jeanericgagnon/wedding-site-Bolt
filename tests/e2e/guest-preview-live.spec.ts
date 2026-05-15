import { expect, test } from '@playwright/test';
import { signInAsOwner } from './liveOwnerSession';
import { resolveLiveGuestHubProofContext } from './liveGuestHubProofContext';

test('live owner guest preview opens real guest-facing routes without token leakage in UI chrome', async ({ page, context }) => {
  test.setTimeout(180_000);

  await signInAsOwner(page);
  const proofContext = await resolveLiveGuestHubProofContext(page);
  await page.goto('/dashboard/guests?bypassPayment=1&guestPreviewQa=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /know who is coming|guests & rsvp/i })).toBeVisible();

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
