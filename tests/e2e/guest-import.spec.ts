import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

test('guest import previews household and plus-one spreadsheet data from hidden file input', async ({ page }) => {
  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';
  const artifactDir = join(process.cwd(), 'test-results', 'guest-import');
  mkdirSync(artifactDir, { recursive: true });
  const csvPath = join(artifactDir, 'guest-import-preview.csv');
  writeFileSync(
    csvPath,
    [
      'Full Name;Email;Household ID;Household Name;Plus One Name;Children Count;RSVP Status;Meal Choice',
      'Jordan ImportQA;jordan.importqa@example.com;HH-QA-1;ImportQA Household;Sam ImportQA;2;Confirmed;Vegetarian',
      'Alex ImportQA;alex.importqa@example.com;HH-QA-1;ImportQA Household;;;Pending;',
    ].join('\n'),
  );

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('your@email.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto('/dashboard/guests?bypassPayment=1&guestImportE2e=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Guests & RSVP' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Import Guests' })).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles(csvPath);
  await expect(page.getByRole('heading', { name: 'Match columns' })).toBeVisible();
  await expect(page.getByText('guest-import-preview.csv', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue to Review' }).click();

  await expect(page.getByRole('heading', { name: 'Review Import' })).toBeVisible();
  await expect(page.getByText('2 guests ready to import', { exact: true })).toBeVisible();
  await expect(page.getByText('Jordan ImportQA')).toBeVisible();
  await expect(page.getByText('+1: Sam ImportQA')).toBeVisible();
  await expect(page.getByText('Children: 2')).toBeVisible();
  await expect(page.getByText('Household: ImportQA Household')).toHaveCount(2);
  await expect(page.getByText(/Meal: Vegetarian/i)).toBeVisible();
});
