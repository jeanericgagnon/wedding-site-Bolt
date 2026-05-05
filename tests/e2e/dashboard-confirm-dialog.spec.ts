import { expect, test } from '@playwright/test';

async function installNativeDialogTrap(page: Parameters<typeof test>[0]['page']) {
  const nativeDialogs: string[] = [];
  page.on('dialog', async (dialog) => {
    nativeDialogs.push(`${dialog.type()}: ${dialog.message()}`);
    await dialog.dismiss();
  });
  return nativeDialogs;
}

async function signIn(page: Parameters<typeof test>[0]['page']) {
  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('your@email.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe('confirmation dialog smoke', () => {
  test('Builder V2 bulk duplicate uses the DayOf confirmation dialog, not a native browser confirm', async ({ page }) => {
    const nativeDialogs = await installNativeDialogTrap(page);

    await page.goto('/builder-v2-lab', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /reorder or add sections/i }).click();
    await page.getByRole('button', { name: /story\s+timeline/i }).click({ modifiers: ['ControlOrMeta'] });
    await page.getByRole('button', { name: /schedule\s+dayTabs/i }).click({ modifiers: ['ControlOrMeta'] });

    await expect(page.getByText('2 sections selected')).toBeVisible();
    await page.getByRole('button', { name: 'Duplicate' }).click();

    await expect(page.getByRole('dialog', { name: /duplicate selected sections/i })).toBeVisible();
    await expect(page.getByText(/create copies of 2 selected sections/i)).toBeVisible();
    await expect(nativeDialogs).toEqual([]);

    await page.getByRole('button', { name: /duplicate sections/i }).click();
    await expect(page.getByRole('dialog', { name: /duplicate selected sections/i })).toBeHidden();
    await expect(page.getByRole('button', { name: /Story Copy\s+timeline/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Schedule Copy\s+dayTabs/i }).first()).toBeVisible();
    await expect(nativeDialogs).toEqual([]);
  });
});

test.describe('authenticated dashboard route smoke', () => {
  test.skip(process.env.DASHBOARD_CONFIRM_E2E !== '1', 'Set DASHBOARD_CONFIRM_E2E=1 to smoke-test authenticated dashboard routes.');

  test('changed dashboard surfaces load after login without native browser dialogs', async ({ page }) => {
    const nativeDialogs = await installNativeDialogTrap(page);
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') pageErrors.push(message.text());
    });

    await signIn(page);

    const routes = [
      { path: '/dashboard/overview?bypassPayment=1&confirmSmoke=1', heading: /overview/i },
      { path: '/dashboard/guests?bypassPayment=1&confirmSmoke=1', heading: /guests & rsvp/i },
      { path: '/dashboard/itinerary?bypassPayment=1&confirmSmoke=1', heading: /schedule|rhythm of the wedding weekend/i },
      { path: '/dashboard/seating?bypassPayment=1&confirmSmoke=1', heading: /seating/i },
    ];

    for (const route of routes) {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible();
    }

    expect(nativeDialogs).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
