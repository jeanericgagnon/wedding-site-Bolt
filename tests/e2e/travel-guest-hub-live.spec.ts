import { expect, test, type Page } from '@playwright/test';
import { resolveLiveGuestHubProofContext } from './liveGuestHubProofContext';

const mobileViewport = { width: 390, height: 844 };

async function expectNoMeaningfulHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(0, doc.scrollWidth - doc.clientWidth);
  });
  expect(overflow).toBeLessThanOrEqual(8);
}

test('live invite-scoped guest hub keeps travel, RSVP, and photos continuity mobile-safe', async ({ page }) => {
  test.setTimeout(180_000);

  const proofContext = await resolveLiveGuestHubProofContext();
  const hubPath = `/event/${encodeURIComponent(proofContext.siteSlug)}?invite_token=${encodeURIComponent(proofContext.guestInviteToken)}&guestLang=fr&mobileSmoke=1`;

  await page.setViewportSize(mobileViewport);
  await page.goto(hubPath, { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /Everything guests need in one place\./i })).toBeVisible();
  await expect(page.getByText(/Travel (plan|path) from this link/i)).toBeVisible();
  await expect(page.locator('body')).not.toContainText(proofContext.guestInviteToken);
  await expectNoMeaningfulHorizontalOverflow(page);

  await page.getByRole('link', { name: /Open travel (details|page)/i }).click();
  await expect(page).toHaveURL(new RegExp(`/site/${proofContext.siteSlug}\\?invite_token=.*&guestLang=fr#travel`));
  await expect(page.locator('body')).not.toContainText(proofContext.guestInviteToken);
  await expectNoMeaningfulHorizontalOverflow(page);

  await page.goto(hubPath, { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /Reply.*Confirm attendance and any event-specific details from the same hub\./i }).click();
  await expect(page).toHaveURL(new RegExp(`/site/${proofContext.siteSlug}\\?invite_token=.*&guestLang=fr#rsvp`));
  await expect(page.locator('body')).not.toContainText(proofContext.guestInviteToken);
  await expectNoMeaningfulHorizontalOverflow(page);

  await page.goto(hubPath, { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: /Upload photos.*Share photos or videos without installing an app\./i }).click();
  await expect(page).toHaveURL(new RegExp(`/photos/upload\\?site=${proofContext.siteSlug}&hub=1&invite_token=.*&guestLang=fr`));
  await expect(page.getByLabel(/Your name|Tu nombre|Votre nom/i)).toBeVisible();
  await expect(page.locator('body')).not.toContainText(proofContext.guestInviteToken);
  await expectNoMeaningfulHorizontalOverflow(page);
});
