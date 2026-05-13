import { expect, test } from '@playwright/test';

test('coordinator day-of route loads the core event-day runtime surfaces', async ({ page }) => {
  test.setTimeout(120_000);

  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('your@email.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto('/dashboard/coordinator?bypassPayment=1&coordinatorDayofProof=1', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'Day-of view' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Give helpers the next useful thing, not every planning detail\./i })).toBeVisible();
  await expect(page.getByText(/^Check-in queue$/).first()).toBeVisible();
  await expect(page.getByText(/^Run-of-show timeline/).first()).toBeVisible();
  await expect(page.getByText(/^Day-of message$/).first()).toBeVisible();
  await expect(page.getByText(/^Guest questions/).first()).toBeVisible();
  await expect(page.getByText(/^Timeline board$/).first()).toBeVisible();
  await expect(page.getByText(/^Q&A board$/).first()).toBeVisible();
});
