import { expect, test } from '@playwright/test';

const publicSiteSlug = process.env.V1_PUBLIC_PROOF_SITE_SLUG || 'alex-jordan-demo';
const hubSiteSlug = process.env.V1_PROOF_SITE_SLUG || 'maya-and-leo';
const analyticsLeakPattern = /Website and invite analytics|Aggregate analytics are active|retention window|guest-hub events|invite-link opens|QR entries come from tracked guest-hub events/i;

async function expectNoOwnerAnalyticsLeak(page: import('@playwright/test').Page) {
  await expect(page.locator('body')).not.toContainText(analyticsLeakPattern);
}

test('public and guest-facing routes do not expose owner analytics detail', async ({ page }) => {
  await page.goto(`/site/${publicSiteSlug}?analyticsPrivacy=site`, { waitUntil: 'networkidle' });
  await expect(page.getByText(/Alex Thompson.*Jordan Rivera|Alex Thompson & Jordan Rivera/i).first()).toBeVisible();
  await expectNoOwnerAnalyticsLeak(page);

  await page.goto(`/event/${hubSiteSlug}?analyticsPrivacy=hub`, { waitUntil: 'networkidle' });
  await expect(page.getByText(/DayOf guest hub|Centro de invitados DayOf|Maya & Leo/i).first()).toBeVisible();
  await expectNoOwnerAnalyticsLeak(page);

  await page.goto('/rsvp?guestLang=es-MX&analyticsPrivacy=rsvp', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Respond in a minute and get back to celebrating|Responde en un minuto y vuelve a celebrar/i })).toBeVisible();
  await expectNoOwnerAnalyticsLeak(page);

  await page.goto(`/photos/upload?site=${hubSiteSlug}&hub=1&guestLang=es-MX&analyticsPrivacy=photos`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Share your photos|Comparte tus fotos/i })).toBeVisible();
  await expectNoOwnerAnalyticsLeak(page);
});
