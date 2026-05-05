import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test('vendor template browser shows category-specific premium families', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('dayof_e2e_local_auth', '1');
  });

  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.includes('/auth/v1/user')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'demo-local-user', email: 'demo@dayof.love' }),
      });
      return;
    }
    if (url.includes('/rest/v1/vendor_profile_inquiries')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
      return;
    }
    await route.continue();
  });

  await page.goto('/vendor-templates', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /Choose how each vendor should feel/i })).toBeVisible();
  for (const templateName of [
    'Photography Portfolio',
    'Floral Lookbook',
    'Venue Estate',
    'Food and Beverage',
    'Beauty Atelier',
    'Entertainment Stage',
    'Planner Concierge',
    'Travel Logistics',
  ]) {
    await expect(page.getByRole('button', { name: new RegExp(templateName, 'i') })).toBeVisible();
  }

  await page.getByRole('button', { name: /Food and Beverage/i }).click();
  await expect(page.getByRole('button', { name: 'Request tasting' })).toBeVisible();
  await expect(page.getByText('Menu confidence')).toBeVisible();

  await page.getByRole('button', { name: /Beauty Atelier/i }).click();
  await expect(page.getByRole('button', { name: 'Book a trial' })).toBeVisible();
  await expect(page.getByText('Wedding morning timing')).toBeVisible();

  await page.getByRole('button', { name: /Entertainment Stage/i }).click();
  await expect(page.getByRole('button', { name: 'Hear sample set' })).toBeVisible();
  await expect(page.getByText('Reception energy')).toBeVisible();

  await page.getByRole('button', { name: /Travel Logistics/i }).click();
  await expect(page.getByRole('button', { name: 'Confirm logistics' })).toBeVisible();
  await expect(page.getByText('Route clarity')).toBeVisible();

  await page.locator('select').nth(0).selectOption('Catering');
  await expect(page.getByRole('button', { name: /Sage Table Catering/i })).toBeVisible();

  await page.locator('select').nth(0).selectOption('Entertainment');
  await expect(page.getByRole('button', { name: /Afterglow Sound/i })).toBeVisible();
});
