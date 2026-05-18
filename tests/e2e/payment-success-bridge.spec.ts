import { expect, test } from '@playwright/test';

test('payment success bridge routes an authenticated owner forward without getting stuck on the thin confirmation page', async ({ page }) => {
  test.setTimeout(90_000);

  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('your@email.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto('/payment/success', { waitUntil: 'domcontentloaded' });

  await expect
    .poll(async () => page.url(), {
      timeout: 15_000,
      message: 'Authenticated owners should bridge forward from /payment/success instead of lingering there.',
    })
    .not.toContain('/payment/success');

  await expect(page).toHaveURL(/\/dashboard\/overview\?from=payment-success|\/onboarding\/celebration\?from=checkout/);
  await expect(page.getByText(/Payment confirmed/i)).toHaveCount(0);
  await expect(page.getByRole('main')).toBeVisible();
});
