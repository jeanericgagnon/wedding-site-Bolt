import { expect, test } from '@playwright/test';
import { signInAsOwner } from './liveOwnerSession';
import { resolveLiveGuestHubProofContext } from './liveGuestHubProofContext';

test('live guest hub proves private day-of visibility, coordinator handoff, and map deep links without token leakage', async ({ page, context }) => {
  test.setTimeout(180_000);

  await signInAsOwner(page);
  const proofContext = await resolveLiveGuestHubProofContext(page);
  const publicHubPath = `/event/${encodeURIComponent(proofContext.siteSlug)}?guestLang=fr&dayofLive=1`;
  const privateHubPath = `/event/${encodeURIComponent(proofContext.siteSlug)}?invite_token=${encodeURIComponent(proofContext.guestInviteToken)}&guestLang=fr&dayofLive=1`;

  await page.goto(publicHubPath, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Everything guests need in one place\./i })).toBeVisible();
  await expect(page.getByText('Travel quick plan')).toBeVisible();
  await expect(page.getByText('Your day-of status')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(proofContext.guestInviteToken);

  await page.goto(privateHubPath, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Latest update')).toBeVisible();
  await expect(page.getByText('Coordinator handoff')).toBeVisible();
  await expect(page.getByText('Your day-of status')).toBeVisible();
  await expect(page.getByText(proofContext.guestName)).toBeVisible();
  await expect(page.locator('body')).not.toContainText(proofContext.guestInviteToken);

  const mapsLink = page.locator('a[href*="maps.google.com"]').first();
  await expect(mapsLink).toBeVisible();
  const [mapsPage] = await Promise.all([
    context.waitForEvent('page'),
    mapsLink.click(),
  ]);
  await mapsPage.waitForLoadState('domcontentloaded');
  await expect(mapsPage).toHaveURL(/maps\.google\.com/);
  await mapsPage.close();
});
