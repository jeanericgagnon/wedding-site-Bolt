import { expect, test } from '@playwright/test';

test.skip(process.env.LIVE_PAYMENT_SUCCESS_MAIN !== '1', 'Set LIVE_PAYMENT_SUCCESS_MAIN=1 to verify the payment success celebration screen exposes a main landmark.');

test('payment success celebration screen exposes a main landmark', async ({ page }) => {
  test.setTimeout(60_000);

  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('your@email.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto('/payment/success', { waitUntil: 'domcontentloaded' });
  await page.waitForURL(/\/onboarding\/celebration/, { timeout: 20_000 });
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Congratulations!' })).toBeVisible();
});
