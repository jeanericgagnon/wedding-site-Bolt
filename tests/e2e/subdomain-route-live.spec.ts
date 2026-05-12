import { expect, test, type Page } from '@playwright/test';

test.skip(process.env.V1_SUBDOMAIN_ROUTE_LIVE !== '1', 'Set V1_SUBDOMAIN_ROUTE_LIVE=1 to verify the live .dayof.love subdomain route.');

const proofHost = process.env.V1_SUBDOMAIN_ROUTE_HOST || 'testandkaras.dayof.love';
const proofCouplePattern = new RegExp(process.env.V1_SUBDOMAIN_ROUTE_COUPLE_PATTERN || 'Maya.*Leo|Maya & Leo', 'i');
const proofDatePattern = new RegExp(process.env.V1_SUBDOMAIN_ROUTE_DATE_PATTERN || 'June 6, 2027|Sunday, June 6, 2027', 'i');

async function detectPublicState(page: Page) {
  if (await page.getByRole('heading', { name: /Coming soon/i }).isVisible().catch(() => false)) {
    return 'coming-soon';
  }
  if (await page.getByText(/This wedding site is not ready to view yet/i).isVisible().catch(() => false)) {
    return 'not-ready';
  }
  if (await page.getByText(proofCouplePattern).first().isVisible().catch(() => false)) {
    return 'public-site';
  }
  return 'unknown';
}

test('live .dayof.love host resolves and keeps the privacy/publish gate fail-closed without wrong-site leakage', async ({ page }) => {
  test.setTimeout(90_000);

  await page.goto(`https://${proofHost}?subdomainRouteQa=1`, { waitUntil: 'networkidle' });

  const url = new URL(page.url());
  expect(url.host).toBe(proofHost);
  const hostState = await detectPublicState(page);
  expect(hostState).not.toBe('unknown');
  const hostBody = await page.locator('body').innerText();
  expect(hostBody).not.toMatch(/Site not found|This page could not be found/i);
  expect(hostBody).not.toMatch(/Alex Thompson.*Jordan Rivera|You\s*&\s*Partner/i);

  if (hostState === 'public-site') {
    await expect(page.getByText(proofCouplePattern).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(proofDatePattern).first()).toBeVisible();
  } else if (hostState === 'coming-soon') {
    await expect(page.getByRole('heading', { name: /Coming soon/i })).toBeVisible();
    await expect(page.getByText(/The couple is putting the final touches on their wedding site/i)).toBeVisible();
  } else {
    await expect(page.getByText(/This wedding site is not ready to view yet/i)).toBeVisible();
  }
});
