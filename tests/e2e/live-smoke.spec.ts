import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page, baseURL }) => {
  await page.goto(baseURL || 'https://dayof.love', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle(/WeddingSite|Dayof|DayOf/i);
});

test('login page loads', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
});

test('collaborator invite page loads with token param', async ({ page }) => {
  await page.goto('/accept-collaborator-invite?token=test-token', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /join this wedding team/i })).toBeVisible();
  await expect(page.getByText(/checking invite/i)).toBeVisible();
});
