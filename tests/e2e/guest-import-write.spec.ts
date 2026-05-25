import { expect, test } from '@playwright/test';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test.skip(process.env.LIVE_GUEST_IMPORT_WRITE !== '1', 'Set LIVE_GUEST_IMPORT_WRITE=1 to import and delete production QA guests.');

function envValue(key: string, fallback = '') {
  if (process.env[key]) return String(process.env[key]);
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) return fallback;
  const match = readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .find((line) => line.startsWith(`${key}=`));
  if (!match) return fallback;
  return match.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, '');
}

test('guest import writes household RSVP data and deletes only its QA guests', async ({ page }) => {
  test.setTimeout(120_000);
  const importRpcLogs: Array<{ url: string; status: number; body: string }> = [];
  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const cleanupOnlyRunId = process.env.LIVE_GUEST_IMPORT_CLEANUP_RUN_ID;
  const runId = cleanupOnlyRunId || `${Date.now()}`;
  const guestOne = {
    name: `Jordan WriteQA ${runId}`,
    email: `dayof.writeqa.${runId}.1@example.com`,
    plusOneName: `Sam WriteQA ${runId}`,
  };
  const guestTwo = {
    name: `Alex WriteQA ${runId}`,
    email: `dayof.writeqa.${runId}.2@example.com`,
  };
  const searchNeedle = `dayof.writeqa.${runId}`;
  let ownerAccessToken = '';
  const artifactDir = mkdtempSync(join(tmpdir(), 'guest-import-write-'));
  const csvPath = join(artifactDir, `guest-import-write-${runId}.csv`);
  writeFileSync(
    csvPath,
    [
      'Full Name;Email;Household ID;Household Name;Plus One Name;Children Count;RSVP Status;Meal Choice',
      `${guestOne.name};${guestOne.email};HH-WRITE-${runId};WriteQA Household ${runId};${guestOne.plusOneName};2;Confirmed;Vegetarian`,
      `${guestTwo.name};${guestTwo.email};HH-WRITE-${runId};WriteQA Household ${runId};;;Pending;`,
    ].join('\n'),
  );

  page.on('response', async (response) => {
    const url = response.url();
    if (!url.includes('/rest/v1/rpc/')) return;
    if (
      !url.includes('guest_dashboard_import_guests')
      && !url.includes('guest_dashboard_guest_write')
      && !url.includes('guest_dashboard_guest_bulk_patch')
      && !url.includes('guest_dashboard_event_invitation_insert_many')
      && !url.includes('guest_dashboard_rsvp_replace_many')
    ) {
      return;
    }
    let body = '';
    try {
      body = await response.text();
    } catch {
      body = '<unreadable>';
    }
    importRpcLogs.push({
      url,
      status: response.status(),
      body: body.slice(0, 500),
    });
    console.error(`[guest-import-rpc] ${response.status()} ${url} ${body.slice(0, 200)}`);
  });

  const deleteVisibleGuestByEmail = async (guestEmail: string) => {
    const row = page.locator('tr', { hasText: guestEmail });
    await expect(row).toBeVisible();
    const deleteButton = row.getByRole('button', { name: 'Delete' });
    await deleteButton.click();
    await row.getByRole('button', { name: 'Confirm?' }).click();
    await expect(row).toHaveCount(0);
  };
  const authHeaders = () => ({
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${ownerAccessToken || supabaseAnonKey}`,
    'Content-Type': 'application/json',
  });
  const restUrl = (table: string, params: Record<string, string>) => {
    const search = new URLSearchParams(params);
    return `${supabaseUrl}/rest/v1/${table}?${search.toString()}`;
  };
  const restFetch = async (url: string, init: RequestInit = {}) => fetch(url, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(10_000),
  });
  const cleanupQaGuestsByEmail = async () => {
    for (const guestEmail of [guestOne.email, guestTwo.email]) {
      await restFetch(restUrl('guests', { email: `eq.${guestEmail}` }), { method: 'DELETE' });
    }
  };
  const countQaGuestsByEmail = async () => {
    const response = await restFetch(restUrl('guests', {
      select: 'id,email',
      email: `in.(${guestOne.email},${guestTwo.email})`,
    }));
    if (!response.ok) return -1;
    const rows = await response.json() as Array<{ id: string; email: string | null }>;
    return rows.length;
  };
  const forceListTableView = async () => {
    await page.getByRole('button', { name: 'Check-in mode' }).click();
    await page.getByRole('button', { name: 'Check-in mode' }).click();
    await expect(page.locator('table')).toBeVisible();
  };

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('your@email.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  ownerAccessToken = await page.evaluate(() => {
    for (const [key, value] of Object.entries(window.localStorage)) {
      if (!key.includes('auth-token')) continue;
      try {
        const parsed = JSON.parse(String(value)) as { access_token?: string; currentSession?: { access_token?: string } };
        const token = parsed.access_token || parsed.currentSession?.access_token || '';
        if (token) return token;
      } catch {
        // Keep scanning.
      }
    }
    return '';
  });
  expect(ownerAccessToken || supabaseAnonKey).toBeTruthy();
  await cleanupQaGuestsByEmail();

  await page.goto(`/dashboard/guests?bypassPayment=1&guestImportWriteE2e=${runId}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /People, replies, and details\./i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Import Guests' })).toBeVisible();

  if (cleanupOnlyRunId) {
    await page.getByRole('button', { name: /^All/i }).click();
    await forceListTableView();
    await page.getByPlaceholder('Search guests...').fill(searchNeedle);
    if (await page.getByText(guestOne.email).isVisible().catch(() => false)) {
      await deleteVisibleGuestByEmail(guestOne.email);
    }
    if (await page.getByText(guestTwo.email).isVisible().catch(() => false)) {
      await deleteVisibleGuestByEmail(guestTwo.email);
    }
    await cleanupQaGuestsByEmail();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText(guestOne.email)).toHaveCount(0);
    await expect(page.getByText(guestTwo.email)).toHaveCount(0);
    return;
  }

  try {
    await page.locator('input[type="file"]').setInputFiles(csvPath);
    await expect(page.getByRole('heading', { name: 'Match columns' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue to Review' }).click();

    await expect(page.getByRole('heading', { name: 'Review Import' })).toBeVisible();
    await expect(page.getByText('2 guests ready to import', { exact: true })).toBeVisible();
    await expect(page.getByText(guestOne.name)).toBeVisible();
    await expect(page.getByText(`+1: ${guestOne.plusOneName}`)).toBeVisible();
    await expect(page.getByText('Children: 2')).toBeVisible();
    await expect(page.getByText(`Household: WriteQA Household ${runId}`)).toHaveCount(2);

    const importGuestsButton = page.getByRole('button', { name: 'Import 2 Guests' });
    await importGuestsButton.scrollIntoViewIfNeeded();
    await expect(importGuestsButton).toBeEnabled();
    await importGuestsButton.click();
    await expect.poll(async () => {
      const response = await restFetch(restUrl('guests', {
        select: 'id,email',
        email: `in.(${guestOne.email},${guestTwo.email})`,
      }));
      if (!response.ok) return -1;
      const rows = await response.json() as Array<{ id: string; email: string | null }>;
      return rows.length;
    }, { timeout: 30_000 }).toBe(2);
    await expect(page.getByRole('heading', { name: 'Review Import' })).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByRole('button', { name: /^All/i })).toBeVisible();

    await page.getByRole('button', { name: /^All/i }).click();
    await forceListTableView();
    await page.getByPlaceholder('Search guests...').fill(searchNeedle);

    await expect(page.getByText(guestOne.email)).toBeVisible();
    await expect(page.getByText(guestTwo.email)).toBeVisible();
    await expect(page.locator('tr', { hasText: guestOne.email }).getByText('Confirmed', { exact: true })).toBeVisible();
    await expect(page.locator('tr', { hasText: guestOne.email }).getByText('Plus-one confirmed')).toBeVisible();
    await expect(page.locator('tr', { hasText: guestOne.email }).getByText('Vegetarian')).toBeVisible();
    await expect(page.locator('tr', { hasText: guestTwo.email }).getByText('Pending', { exact: true })).toBeVisible();

    const [previewPage] = await Promise.all([
      page.context().waitForEvent('page'),
      page.locator('tr', { hasText: guestTwo.email }).getByRole('button', { name: /Guest view|Preview/i }).first().click(),
    ]);
    await previewPage.waitForLoadState('domcontentloaded');
    await expect(previewPage).toHaveURL(/\/site\/.*\?previewGuest=.*previewSurface=public/);
    await expect(previewPage.getByText('Owner preview mode')).toBeVisible();
    await expect(previewPage.getByRole('button', { name: 'RSVP' })).toBeVisible();
    await previewPage.close();
  } finally {
    if (importRpcLogs.length > 0) {
      console.error(`[guest-import-rpc-summary] ${JSON.stringify(importRpcLogs, null, 2)}`);
    }
    await cleanupQaGuestsByEmail();
    await expect.poll(countQaGuestsByEmail, { timeout: 30_000 }).toBe(0);
  }
});
