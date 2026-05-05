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
  await expect(page.getByRole('heading', { name: /Choose how each vendor should feel/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Photography Portfolio/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Floral Lookbook/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Venue Estate/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Food and Beverage/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Beauty Atelier/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Entertainment Stage/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Planner Concierge/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Travel Logistics/i })).toBeVisible();

  await page.getByPlaceholder('Search vendor, flowers, location...').fill('flowers');
  await expect(page.getByRole('button', { name: /Marigold Floral House/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Everlight Studio/i })).toHaveCount(0);

  await page.getByPlaceholder('Search vendor, flowers, location...').fill('');
  await page.locator('select').nth(0).selectOption('Transportation');
  await expect(page.getByRole('button', { name: /Northstar Transit Co/i })).toBeVisible();
  await expect(page.locator('span').filter({ hasText: /^Needs images$/ }).first()).toBeVisible();

  await page.getByRole('button', { name: /Travel Logistics/i }).click();
  await expect(page.getByText('Direct email and inquiry-only modes')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm logistics' })).toBeVisible();
  await expect(page.getByText('Route clarity')).toBeVisible();

  await page.locator('select').nth(0).selectOption('All');
  await page.locator('select').nth(2).selectOption('Website ready');
  await expect(page.getByRole('button', { name: /Everlight Studio/i })).toBeVisible();
  await expect(page.locator('#review').getByText('Review checklist')).toBeVisible();
  await expect(page.getByText('Inquiry inbox')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Recent vendor inquiries/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Refresh|Refreshing/i })).toBeVisible();
});
