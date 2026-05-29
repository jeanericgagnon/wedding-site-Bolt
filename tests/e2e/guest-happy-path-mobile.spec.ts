import { expect, test, type Page } from '@playwright/test';

const mobileViewport = { width: 390, height: 844 };

function expectNoGuestFacingInternalLeaks(text: string) {
  expect(text).not.toMatch(/invite_token|previewGuest|previewSurface|provider|bucket|metadata|service role|supabase|openai|telnyx|debug|functions\/v1|internal/i);
}

async function expectNoMeaningfulHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(0, doc.scrollWidth - doc.clientWidth);
  });
  expect(overflow).toBeLessThanOrEqual(8);
}

async function expectGuestSafeSurface(page: Page) {
  expectNoGuestFacingInternalLeaks(await page.locator('body').innerText());
  await expectNoMeaningfulHorizontalOverflow(page);
}

test.describe('guest journey mobile proof', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(mobileViewport);
  });

  test('guest happy path keeps core surfaces connected on mobile', async ({ page }) => {
    await page.goto('/site/alex-jordan-demo?publicQualitySmoke=guest-journey&previewGuest=guest-1&previewSurface=public&invite_token=invite-123', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Alex Thompson.*Jordan Rivera|Alex Thompson & Jordan Rivera/i }).first()).toBeVisible();
    await expect(page.getByText(/June 15, 2026/i).first()).toBeVisible();
    await expect(page.getByText(/Sunset Gardens Estate/i).first()).toBeVisible();
    await expect(page.getByText(/Ceremony/i).first()).toBeVisible();
    await expectGuestSafeSurface(page);

    await page.goto('/rsvp?previewGuest=guest-1&previewSurface=rsvp', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /^RSVP$/i })).toBeVisible();
    await expect(page.getByText(/Please let us know if you can attend/i)).toBeVisible();
    await expect(page.getByText(/use the code from your invitation email/i)).toBeVisible();
    await expectGuestSafeSurface(page);

    await page.goto('/guest-contact/ericandkaras?invite_token=invite-123&previewGuest=guest-1&previewSurface=contact', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /update contact.*rsvp/i })).toBeVisible();
    await expect(page.getByRole('region', { name: /guest journey/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Wedding hub' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'RSVP' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Photo sharing' })).toBeVisible();
    await expectGuestSafeSurface(page);

    await page.goto('/photos/upload?site=ericandkaras&hub=1&invite_token=invite-123&previewGuest=guest-1&previewSurface=photos', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /share your photos/i })).toBeVisible();
    await expect(page.locator('#photo-upload-token')).toHaveCount(0);
    await expect(page.getByRole('region', { name: /guest journey/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Wedding hub' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Travel details' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'RSVP' })).toBeVisible();
    await expectGuestSafeSurface(page);

    await page.goto('/site/alex-jordan-demo?publicQualitySmoke=guest-journey&previewGuest=guest-1&previewSurface=registry&invite_token=invite-123#registry', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Registry/i).first()).toBeVisible();
    await expect(page.getByText(/Your presence is the best gift/i)).toBeVisible();
    await expect(page.getByText(/Registry links and gift details will appear/i)).toHaveCount(0);
    await expectGuestSafeSurface(page);

    await page.goto('/vault/maya-and-leo/1?vaultQaOpen=1&invite_token=invite-123&previewGuest=guest-1&previewSurface=vault', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /anniversary vault/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /save in vault/i })).toBeVisible();
    await expect(page.getByRole('region', { name: /guest journey/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Wedding hub' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Travel details' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'RSVP' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Photo sharing' })).toBeVisible();
    await expectGuestSafeSurface(page);
  });

  test('guest recovery copy stays calm when a link is stale or incomplete', async ({ page }) => {
    await page.goto('/events', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/No invitation link found\. Please use the link from your invitation email\./i)).toBeVisible();
    await expectGuestSafeSurface(page);

    await page.goto('/guest-contact/ericandkaras', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Please use the contact update link from your invitation email\./i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^find$/i })).toBeDisabled();
    await expect(page.getByRole('button', { name: /save update/i })).toBeDisabled();
    await expectGuestSafeSurface(page);

    await page.goto('/vault/not-a-real-site/1?vaultQaOpen=1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/This link may be invalid or the vault is no longer accepting contributions\./i)).toBeVisible();
    await expectGuestSafeSurface(page);
  });
});
