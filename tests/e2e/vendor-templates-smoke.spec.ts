import { expect, test } from '@playwright/test';

test.skip(process.env.LIVE_VENDOR_TEMPLATES_SMOKE !== '1', 'Set LIVE_VENDOR_TEMPLATES_SMOKE=1 to smoke the vendor template browser.');

test('vendor template environment filters and previews vendor page designs', async ({ page }) => {
  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('your@email.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto('/vendor-templates?vendorTemplateQa=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Pick a page style\./i })).toBeVisible();
  await expect(page.getByText('Check photos, notes, and ways to reply before you save.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Photo and video Photography/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Flowers and decor Floral and decor/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Venues Venue/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Catering, cakes, and bar Food and drinks/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Beauty, getting ready, and jewelry Beauty and getting ready/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Music and entertainment Music and entertainment/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Planning help Planning help/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Travel and guest movement Travel and guest movement/i })).toBeVisible();

  await page.getByPlaceholder('Search name, flowers, location...').fill('flowers');
  await expect(page.getByRole('button', { name: /Marigold Floral House/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Everlight Studio/i })).toHaveCount(0);

  await page.getByPlaceholder('Search name, flowers, location...').fill('');
  await page.locator('select').nth(0).selectOption('Transportation');
  await expect(page.getByRole('button', { name: /Northstar Transit Co/i })).toBeVisible();
  await expect(page.locator('span').filter({ hasText: /^Add photos$/ }).first()).toBeVisible();

  await page.getByRole('button', { name: /Travel and guest movement Travel and guest movement/i }).click();
  await expect(page.getByRole('main').getByText('Travel and guest movement')).toBeVisible();
  await expect(page.getByRole('main').getByText('Route clarity')).toBeVisible();
  await expect(page.getByRole('main').getByRole('button', { name: 'Plan schedule' })).toBeVisible();

  await page.locator('select').nth(0).selectOption('All');
  await page.locator('select').nth(2).selectOption('Website');
  await expect(page.getByRole('button', { name: /Everlight Studio/i })).toBeVisible();
  await expect(page.locator('#review').getByText('Quick check')).toBeVisible();
  await expect(page.getByText('Notes sent from pages appear here.')).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Notes$/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Check again|Loading/i })).toBeVisible();
});
