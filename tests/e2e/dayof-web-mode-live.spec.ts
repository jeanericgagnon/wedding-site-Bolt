import { expect, test } from '@playwright/test';
import { resolveLiveGuestHubProofContext } from './liveGuestHubProofContext';

test('live guest hub owner auth resolves a real invite-scoped proof context', async () => {
  test.setTimeout(180_000);

  const proofContext = await resolveLiveGuestHubProofContext();

  expect(proofContext.siteId).toBeTruthy();
  expect(proofContext.siteSlug).toBeTruthy();
  expect(proofContext.guestInviteToken).toBeTruthy();
  expect(proofContext.guestName).toBeTruthy();
});

test('live guest hub proves private day-of visibility, coordinator handoff, and map deep links without token leakage', async ({ page, context }) => {
  test.setTimeout(180_000);

  const proofContext = await resolveLiveGuestHubProofContext();
  const publicHubPath = `/event/${encodeURIComponent(proofContext.siteSlug)}?guestLang=fr&dayofLive=1`;
  const privateHubPath = `/event/${encodeURIComponent(proofContext.siteSlug)}?invite_token=${encodeURIComponent(proofContext.guestInviteToken)}&guestLang=fr&dayofLive=1`;

  await page.goto(publicHubPath, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Everything guests need in one place\./i })).toBeVisible();
  await expect(page.getByText('Travel plan from this link')).toBeVisible();
  await expect(page.getByText('Access from this link')).toBeVisible();
  await expect(page.getByText('This link is public only and does not include private event details or guest-specific readback.')).toBeVisible();
  await expect(page.getByText('Your status on this link')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(proofContext.guestInviteToken);

  await page.goto(privateHubPath, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('link', { name: /Latest update/i })).toBeVisible();
  await expect(page.getByText('Guest-specific link')).toBeVisible();
  await expect(page.getByText('10 guest actions are ready from this link.')).toBeVisible();
  await expect(page.getByText('This link is ready for guest-specific RSVP and check-in readback.')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(proofContext.guestInviteToken);

  const mapsLink = page.locator('a[href*="maps.google.com"]').first();
  await expect(mapsLink).toBeVisible();
  const [mapsPage] = await Promise.all([
    context.waitForEvent('page'),
    mapsLink.click(),
  ]);
  await mapsPage.waitForLoadState('domcontentloaded');
  await expect(mapsPage).toHaveURL(/google\.com\/maps/);
  await mapsPage.close();
});
