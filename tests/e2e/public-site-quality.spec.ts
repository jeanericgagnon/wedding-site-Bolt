import { expect, test, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

const placeholderFragments = [
  'Image unavailable',
  'Date TBD',
  'The couple',
  'will appear here once',
  'More of our story will be shared here soon',
  'Venue details will appear',
  'Registry links and gift details will appear',
  'Schedule details will appear',
];

const proofSiteSlug = process.env.V1_PUBLIC_PROOF_SITE_SLUG || 'alex-jordan-demo';
const proofCouplePattern = new RegExp(process.env.V1_PUBLIC_PROOF_COUPLE_PATTERN || 'Alex Thompson.*Jordan Rivera|Alex Thompson & Jordan Rivera', 'i');
const proofDatePattern = new RegExp(process.env.V1_PUBLIC_PROOF_DATE_PATTERN || 'June 15, 2026|Monday, June 15, 2026', 'i');

async function expectNoMeaningfulHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(0, doc.scrollWidth - doc.clientWidth);
  });
  expect(overflow).toBeLessThanOrEqual(8);
}

async function expectGuestReadyPublicSite(page: Page) {
  await expect(page.getByRole('heading', { name: /Alex Thompson.*Jordan Rivera|Alex Thompson & Jordan Rivera/i }).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/June 15, 2026/i).first()).toBeVisible();
  await expect(page.getByText(/Sunset Gardens Estate/i).first()).toBeVisible();
  await expect(page.getByText(/Ceremony/i).first()).toBeVisible();

  const bodyText = await page.locator('body').innerText();
  for (const fragment of placeholderFragments) {
    expect(bodyText).not.toContain(fragment);
  }

  const brokenImageCount = await page.evaluate(() => {
    return Array.from(document.images).filter((image) => image.complete && image.naturalWidth === 0).length;
  });
  expect(brokenImageCount).toBe(0);
  await expectNoMeaningfulHorizontalOverflow(page);
}

async function expectCanonicalProofSiteIdentity(page: Page) {
  await expect(page.getByText(proofCouplePattern).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(proofDatePattern).first()).toBeVisible();

  const bodyText = await page.locator('body').innerText();
  expect(bodyText).not.toMatch(/Eric\s*&\s*Kara|Eric and Kara/i);
  expect(bodyText).not.toMatch(/January\s+17,\s+2027|Jan(?:uary)?\s+17,\s+2027/i);
  await expectNoMeaningfulHorizontalOverflow(page);
}

test.describe('public site quality', () => {
  test('canonical demo renders guest-ready copy on desktop', async ({ page }) => {
    await page.goto('/site/alex-jordan-demo?publicQualitySmoke=desktop', { waitUntil: 'domcontentloaded' });
    await expectGuestReadyPublicSite(page);
  });

  test('canonical demo renders guest-ready copy on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/site/alex-jordan-demo?publicQualitySmoke=mobile', { waitUntil: 'domcontentloaded' });
    await expectGuestReadyPublicSite(page);
  });

  test('public site owner preview banner is visible and removable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/site/alex-jordan-demo?publicQualitySmoke=preview&previewGuest=guest-1&previewSurface=public', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/owner preview mode/i)).toBeVisible();
    await expect(page.getByText(/private event access still follows/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /leave preview/i })).toHaveAttribute('href', '/site/alex-jordan-demo?publicQualitySmoke=preview');
    await expectGuestReadyPublicSite(page);
  });

  test('proof site uses canonical row identity instead of stale embedded snapshots', async ({ page }) => {
    await page.goto(`/site/${proofSiteSlug}?publicQualitySmoke=canonical-row`, { waitUntil: 'domcontentloaded' });
    await expectCanonicalProofSiteIdentity(page);
  });
});
