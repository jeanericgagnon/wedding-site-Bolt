import { expect, test } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

test.skip(process.env.LIVE_RSVP_WRITE_READ !== '1', 'Set LIVE_RSVP_WRITE_READ=1 to create, RSVP, verify, and delete production QA guests.');

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

test('public RSVP writes details and owner data reads them back', async ({ page }) => {
  test.setTimeout(120_000);
  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const cleanupOnlyRunId = process.env.LIVE_RSVP_CLEANUP_RUN_ID;
  const runId = cleanupOnlyRunId || process.env.LIVE_RSVP_RUN_ID || `${Date.now()}`;
  const submitOnly = process.env.LIVE_RSVP_SUBMIT_ONLY === '1';
  const expectSubmittedOnCleanup = process.env.LIVE_RSVP_EXPECT_SUBMITTED === '1';
  const inviteToken = `rsvp-writeqa-${runId}`;
  const guest = {
    name: `Riley RsvpQA ${runId}`,
    email: `dayof.rsvpqa.${runId}@example.com`,
    plusOneName: `Morgan RsvpQA ${runId}`,
    notes: `QA dietary note ${runId}: no peanuts`,
    customAnswer: `Custom RSVP QA ${runId}`,
  };
  const searchNeedle = `dayof.rsvpqa.${runId}`;
  let ownerAccessToken = '';
  const artifactDir = join(process.cwd(), '.tmp', 'e2e-artifacts', 'rsvp-write-read');
  mkdirSync(artifactDir, { recursive: true });
  const csvPath = join(artifactDir, `rsvp-write-read-${runId}.csv`);
  writeFileSync(
    csvPath,
    [
      'Full Name;Email;Invite Token;Plus One Allowed;Children Allowed;Children Count;RSVP Status',
      `${guest.name};${guest.email};${inviteToken};Yes;Yes;2;Pending`,
    ].join('\n'),
  );

  const loginOwner = async () => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('your@email.com').fill(email);
    await page.getByPlaceholder('Enter your password').fill(password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
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

  const fetchQaGuestRows = async () => {
    const response = await restFetch(restUrl('guests', {
      select: 'id,email,rsvp_status,plus_one_allowed,children_allowed,max_children,max_additional_guests',
      email: `eq.${guest.email}`,
    }));
    expect(response.ok).toBeTruthy();
    return await response.json() as Array<{ id: string; email: string; rsvp_status: string; plus_one_allowed: boolean; children_allowed: boolean; max_children: number; max_additional_guests: number }>;
  };

  const cleanupQaGuest = async () => {
    const rows = await fetchQaGuestRows();
    if (expectSubmittedOnCleanup && rows.length > 0) {
      await verifySavedRsvp(rows[0]);
    }
    for (const row of rows) {
      await restFetch(restUrl('rsvps', { guest_id: `eq.${row.id}` }), { method: 'DELETE' });
      await restFetch(restUrl('event_invitations', { guest_id: `eq.${row.id}` }), { method: 'DELETE' });
      await restFetch(restUrl('guests', { id: `eq.${row.id}` }), { method: 'DELETE' });
    }
    expect(await fetchQaGuestRows()).toHaveLength(0);
  };

  const forceListTableView = async () => {
    await page.getByRole('button', { name: 'Check-in mode' }).click();
    await page.getByRole('button', { name: 'Check-in mode' }).click();
    await expect(page.locator('table')).toBeVisible();
  };

  const verifySavedRsvp = async (savedGuest: { id: string; email: string; rsvp_status: string; plus_one_allowed: boolean; children_allowed: boolean; max_children: number }) => {
    expect(savedGuest).toMatchObject({
      email: guest.email,
      rsvp_status: 'confirmed',
      plus_one_allowed: true,
      children_allowed: true,
      max_children: 2,
    });

    const rsvpResponse = await restFetch(restUrl('rsvps', {
      select: 'attending,attending_ceremony,attending_reception,meal_choice,plus_one_name,plus_one_count,children_count,notes,custom_answers',
      guest_id: `eq.${savedGuest.id}`,
    }));
    expect(rsvpResponse.ok).toBeTruthy();
    const [savedRsvp] = await rsvpResponse.json() as Array<{
      attending: boolean;
      attending_ceremony: boolean;
      attending_reception: boolean;
      meal_choice: string | null;
      plus_one_name: string | null;
      plus_one_count: number | null;
      children_count: number | null;
      notes: string | null;
      custom_answers: Record<string, string | string[]> | null;
    }>;
    expect(savedRsvp).toMatchObject({
      attending: true,
      attending_ceremony: true,
      attending_reception: true,
      meal_choice: 'Vegetarian',
      plus_one_name: guest.plusOneName,
      plus_one_count: 1,
      children_count: 2,
      notes: guest.notes,
    });
    expect(Object.values(savedRsvp.custom_answers ?? {})).toContain(guest.customAnswer);
  };

  await loginOwner();
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

  if (cleanupOnlyRunId) {
    await cleanupQaGuest();
    return;
  }

  try {
    await page.goto(`/dashboard/guests?bypassPayment=1&rsvpImportE2e=${runId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Guests & RSVP' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import Guests' })).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles(csvPath);
    await expect(page.getByRole('heading', { name: 'Match columns' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue to Review' }).click();
    await expect(page.getByRole('heading', { name: 'Review Import' })).toBeVisible();
    await expect(page.getByText('1 guest ready to import', { exact: true })).toBeVisible();
    await expect(page.getByText('Children: 2')).toBeVisible();
    await page.getByRole('button', { name: 'Import 1 Guest' }).click();
    await expect(page.getByText(/Imported 1 guest\b/i)).toBeVisible();

    await page.goto(`/rsvp?token=${encodeURIComponent(inviteToken)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: new RegExp(`Welcome, ${guest.name}!`) })).toBeVisible();
    await page.getByRole('button', { name: 'Continue to details' }).click();

    await page.locator('select').first().selectOption({ label: 'Vegetarian' });
    await page.getByPlaceholder('Plus-one full name').fill(guest.plusOneName);
    await page.locator('select').nth(1).selectOption('2');

    const customInput = page.getByPlaceholder('Your answer').first();
    if (await customInput.isVisible().catch(() => false)) {
      await customInput.fill(guest.customAnswer);
    }

    await page.getByPlaceholder('Dietary restrictions, accessibility needs, or special requests').fill(guest.notes);
    await page.getByRole('button', { name: 'Continue to review' }).click();
    await expect(page.getByText('Meal')).toBeVisible();
    await expect(page.getByText('Vegetarian', { exact: true })).toBeVisible();
    await expect(page.getByText(guest.plusOneName)).toBeVisible();
    await expect(page.getByText('Children')).toBeVisible();
    await page.getByRole('button', { name: 'Submit RSVP' }).click({ noWaitAfter: true, timeout: 5_000 }).catch(async (error) => {
      if (await page.getByRole('heading', { name: "You're confirmed!" }).isVisible().catch(() => false)) return;
      throw error;
    });
    await expect(page.getByRole('heading', { name: "You're confirmed!" })).toBeVisible();
    if (submitOnly) return;

    const [savedGuest] = await fetchQaGuestRows();
    await verifySavedRsvp(savedGuest);

    await page.goto(`/dashboard/guests?bypassPayment=1&rsvpOwnerReadE2e=${runId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Guests & RSVP' })).toBeVisible();
    await page.getByRole('button', { name: /^All/i }).click();
    await forceListTableView();
    await page.getByPlaceholder('Search guests...').fill(searchNeedle);

    const ownerGuestRow = page.locator('tr', { hasText: guest.email });
    await expect(ownerGuestRow).toBeVisible();
    await expect(ownerGuestRow.getByText('Confirmed', { exact: true })).toBeVisible();
    await expect(ownerGuestRow.getByText('Plus-one confirmed')).toBeVisible();
    await expect(ownerGuestRow.getByText('Vegetarian')).toBeVisible();
    await expect(ownerGuestRow.getByText('Custom answers saved')).toBeVisible();

    await ownerGuestRow.locator('td').first().click();
    const ownerDrawer = page.locator('.fixed.right-0').filter({ hasText: guest.name });
    await expect(ownerDrawer.getByRole('heading', { name: guest.name })).toBeVisible();
    await expect(ownerDrawer.getByText('RSVP details')).toBeVisible();
    await expect(ownerDrawer.getByText('Status:')).toBeVisible();
    await expect(ownerDrawer.getByText('confirmed', { exact: true })).toBeVisible();
    await expect(ownerDrawer.getByText('Meal:')).toBeVisible();
    await expect(ownerDrawer.getByText('Vegetarian')).toBeVisible();
    await expect(ownerDrawer.getByText('Plus-one guest:')).toBeVisible();
    await expect(ownerDrawer.getByText(guest.plusOneName)).toBeVisible();
    await expect(ownerDrawer.getByText('Children:')).toBeVisible();
    await expect(ownerDrawer.getByText('Children: 2')).toBeVisible();
    await expect(ownerDrawer.getByText(guest.notes)).toBeVisible();
    await expect(ownerDrawer.getByText(guest.customAnswer)).toBeVisible();

    await page.goto('/dashboard/rsvp-board?bypassPayment=1&rsvpOwnerBoardE2e=' + runId, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Guest replies' })).toBeVisible();
    await expect(page.getByText('Confirmed')).toBeVisible();
    await expect(page.getByText('Ceremony + reception', { exact: true })).toBeVisible();
  } finally {
    if (!submitOnly) await cleanupQaGuest();
  }
});
