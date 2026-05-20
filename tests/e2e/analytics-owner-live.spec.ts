import { expect, test } from '@playwright/test';
import { signInAsOwner } from './liveOwnerSession';

test('live owner overview reads analytics with privacy-safe copy', async ({ page }) => {
  test.setTimeout(120_000);

  await signInAsOwner(page);
  await page.goto('/dashboard?bypassPayment=1&analyticsLive=1', { waitUntil: 'domcontentloaded' });

  await page.getByRole('button', { name: /show more detail/i }).click();
  await expect(page.getByRole('heading', { name: 'Website and invite analytics' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Guest journey funnel' })).toBeVisible();
  await expect(page.getByText(/Show owner\/planner summaries only; public and guest routes should not reveal analytics detail/i)).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/invite_token=|token-[a-z0-9]/i);
});
