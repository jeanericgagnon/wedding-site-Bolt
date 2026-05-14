import { expect, test, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

async function enableLocalDemo(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('dayof_e2e_local_auth', '1');
    if (!window.sessionStorage.getItem('dayof_rsvp_access_qa_seeded')) {
      window.localStorage.removeItem('dayof_demo_rsvp_custom_questions_v1');
      window.localStorage.removeItem('dayof_demo_rsvp_meal_config_v1');
      window.localStorage.removeItem('dayof_demo_rsvp_access_config_v1');
      window.sessionStorage.setItem('dayof_rsvp_access_qa_seeded', '1');
    }
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
    await route.continue();
  });
}

async function enterRsvpSettings(page: Page, runId: string) {
  await page.goto(`/dashboard/guests?bypassPayment=1&rsvpAccessQa=${runId}`, { waitUntil: 'domcontentloaded' });

  const tryDemo = page.getByRole('button', { name: /try demo/i });
  if (await tryDemo.isVisible().catch(() => false)) {
    await Promise.all([
      page.waitForURL(/\/dashboard/),
      tryDemo.click(),
    ]);
    await page.goto(`/dashboard/guests?bypassPayment=1&rsvpAccessQa=${runId}`, { waitUntil: 'domcontentloaded' });
  }

  await page.getByRole('button', { name: /rsvp settings/i }).click();
  await expect(page.getByRole('heading', { name: /ask only what you truly need from guests/i })).toBeVisible();
}

async function readStoredRsvpConfig(page: Page) {
  return page.evaluate(() => {
    const parseEnvelope = <T,>(key: string): T | null => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as { value?: T };
        return parsed?.value ?? null;
      } catch {
        return null;
      }
    };

    return {
      access: parseEnvelope<Record<string, unknown>>('dayof_demo_rsvp_access_config_v1'),
      questions: parseEnvelope<Array<{ label?: string }>>('dayof_demo_rsvp_custom_questions_v1'),
    };
  });
}

test('guest RSVP settings persist supported access truth while future modes stay planned', async ({ page }) => {
  const runId = String(Date.now());
  await enableLocalDemo(page);
  await enterRsvpSettings(page, runId);

  await expect(page.getByText(/Guest codes, shared passwords, and open RSVP stay planned/i)).toBeVisible();
  await expect(page.getByText(/Phone or email recovery plan/i)).toBeVisible();
  await expect(page.getByText(/Setup proof checklist/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dietary notes' })).toBeVisible();

  await page.getByRole('button', { name: 'Use as primary access' }).click();
  await expect(page.getByText(/Guests reply through private RSVP links only\./i)).toBeVisible();

  const backupCheckbox = page.getByRole('checkbox', { name: /Keep name lookup as the backup/i });
  await expect(backupCheckbox).toBeEnabled();
  await backupCheckbox.check();
  await expect(page.getByText(/Guests reply through private RSVP links, with name lookup kept on as the backup for misplaced invites\./i)).toBeVisible();

  await page.getByRole('button', { name: 'Dietary notes' }).click();
  await expect(page.getByRole('button', { name: 'Dietary notes added' })).toBeDisabled();
  await expect(page.getByPlaceholder('Question prompt')).toHaveValue(/allergies or dietary notes/i);

  await page.getByRole('button', { name: 'Save Now' }).click();
  await expect(page.getByText(/RSVP settings saved \(demo\)\./i).first()).toBeVisible();

  await expect
    .poll(async () => readStoredRsvpConfig(page))
    .toMatchObject({
      access: {
        primary_mode: 'private_link',
        allow_name_lookup_backup: true,
      },
      questions: [
        {
          label: 'Any allergies or dietary notes we should know?',
        },
      ],
    });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /rsvp settings/i }).click();
  await expect(page.getByRole('heading', { name: /ask only what you truly need from guests/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Selected as primary' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /Keep name lookup as the backup/i })).toBeChecked();
  await expect(page.getByText(/This keeps search-by-name recovery on without changing your primary RSVP path\./i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dietary notes added' })).toBeDisabled();
  await expect(page.getByPlaceholder('Question prompt')).toHaveValue(/allergies or dietary notes/i);
  await expect(page.getByText(/Guest codes, shared passwords, and open RSVP stay planned/i)).toBeVisible();
});
