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

test('live mobile guest preview routes render without leaking raw tokens', async ({ page }) => {
  test.setTimeout(180_000);

  await page.setViewportSize(mobileViewport);
  await signInAsOwner(page);
  const proofContext = await resolveLiveGuestHubProofContext(page);
  await page.goto('/dashboard/guests?bypassPayment=1&guestPreviewQa=1', { waitUntil: 'domcontentloaded' });
  await expectGuestsDashboard(page);
  await expect(page.locator('body')).not.toContainText(proofContext.guestInviteToken);

  const encodedSiteSlug = encodeURIComponent(proofContext.siteSlug);
  const encodedGuestId = encodeURIComponent(proofContext.guestId);
  const encodedInviteToken = encodeURIComponent(proofContext.guestInviteToken);

  await page.goto(
    `/photos/upload?site=${encodedSiteSlug}&hub=1&invite_token=${encodedInviteToken}&previewGuest=${encodedGuestId}&previewSurface=photos`,
    { waitUntil: 'domcontentloaded' },
  );
  await expect(page).toHaveURL(/\/photos\/upload\?.*previewGuest=.+previewSurface=photos/);
  await expect(page.locator('body')).not.toContainText(proofContext.guestInviteToken);
  await expectNoMeaningfulHorizontalOverflow(page);

  await page.goto(
    `/site/${encodedSiteSlug}?previewGuest=${encodedGuestId}&previewSurface=travel#travel`,
    { waitUntil: 'domcontentloaded' },
  );
  await expect(page).toHaveURL(/\/site\/.+previewGuest=.+previewSurface=travel/);
  await expect(page.getByText(/owner preview mode/i)).toBeVisible();
  await expect(page.locator('body')).not.toContainText(proofContext.guestInviteToken);
  await expectNoMeaningfulHorizontalOverflow(page);

  await page.goto(
    `/site/${encodedSiteSlug}?previewGuest=${encodedGuestId}&previewSurface=registry#registry`,
    { waitUntil: 'domcontentloaded' },
  );
  await expect(page).toHaveURL(/\/site\/.+previewGuest=.+previewSurface=registry/);
  await expect(page.getByText(/owner preview mode/i)).toBeVisible();
  await expect(page.locator('body')).not.toContainText(proofContext.guestInviteToken);
  await expectNoMeaningfulHorizontalOverflow(page);

  await page.goto(
    `/site/${encodedSiteSlug}?previewGuest=${encodedGuestId}&previewSurface=public`,
    { waitUntil: 'domcontentloaded' },
  );
  await expect(page).toHaveURL(/\/site\/.+previewGuest=.+previewSurface=public/);
  await expect(page.getByText(/owner preview mode/i)).toBeVisible();
  await expect(page.locator('body')).not.toContainText(proofContext.guestInviteToken);
  await expectNoMeaningfulHorizontalOverflow(page);
});
