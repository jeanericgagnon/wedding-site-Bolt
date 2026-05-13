import { expect, test } from '@playwright/test';

test('name-change planner route loads the saved planning runtime surfaces', async ({ page }) => {
  test.setTimeout(120_000);

  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('your@email.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto('/dashboard/planning?tab=nameChange&bypassPayment=1&nameChangeRuntimeProof=1', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('Resume any time')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Post-wedding name change roadmap' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Milestones and progress' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Prewritten update templates' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Case setup' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'State playbook' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Institution coverage map' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Wedding identity exports' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy action packet' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Current first name' })).toBeVisible();

  const dualPartnerToggle = page.getByLabel('Both partners changing name');
  await dualPartnerToggle.check();
  await expect(page.getByRole('heading', { name: 'Dual-partner rollout' })).toBeVisible();

  const saveButton = page.getByRole('button', { name: /Save and come back later|Save planner case/i }).first();
  await saveButton.click();
  await expect(saveButton).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('Both partners changing name')).toBeChecked();
  await expect(page.getByRole('heading', { name: 'Dual-partner rollout' })).toBeVisible();
});
