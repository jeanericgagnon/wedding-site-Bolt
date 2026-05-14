import { expect, test } from '@playwright/test';
import { signInAsOwner } from './liveOwnerSession';

test('live owner overview reads analytics with privacy-safe copy', async ({ page }) => {
  test.setTimeout(120_000);

  await signInAsOwner(page);
  await page.goto('/dashboard?bypassPayment=1&analyticsLive=1', { waitUntil: 'domcontentloaded' });

  await page.getByRole('button', { name: /show more detail/i }).click();
  await expect(page.getByText(/Website and invite analytics/i)).toBeVisible();
  await expect(page.getByText(/Guest journey funnel/i)).toBeVisible();
  await expect(page.getByText(/Show owner\/planner summaries only; public and guest routes should not reveal analytics detail/i)).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/invite_token=|token-[a-z0-9]/i);
});
