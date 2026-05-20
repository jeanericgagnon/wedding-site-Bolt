import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

test.skip(process.env.LIVE_SEATING_WRITE_READ !== '1', 'Set LIVE_SEATING_WRITE_READ=1 to create, assign, check in, verify, and clean up production QA seating data.');

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

async function revealCreatedTable(page: import('@playwright/test').Page, tableName: string) {
  const label = page.getByText(tableName, { exact: true }).last();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (await label.isVisible().catch(() => false)) {
      await label.scrollIntoViewIfNeeded().catch(() => undefined);
      return;
    }
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(250);
  }
}

test('owner seating board persists table assignment, check-in, and auto-seat data', async ({ page }) => {
  test.setTimeout(180_000);

  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const proofSiteSlug = process.env.V1_PROOF_SITE_SLUG || 'maya-and-leo';
  const runId = process.env.LIVE_SEATING_RUN_ID || `${Date.now()}`;
  const tableName = `QA Round ${runId}`;
  let ownerAccessToken = '';
  let siteId = '';
  let seatingEventId = '';
  let createdTableIds: string[] = [];

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

  const fetchQaTables = async () => {
    const response = await restFetch(restUrl('seating_tables', {
      select: 'id,table_name,capacity,table_shape,seating_event_id',
      table_name: `ilike.*${runId}*`,
      order: 'created_at.desc',
    }));
    expect(response.ok).toBeTruthy();
    return await response.json() as Array<{ id: string; table_name: string; capacity: number; table_shape: string | null; seating_event_id: string }>;
  };

  const fetchAllQaRoundTables = async () => {
    const response = await restFetch(restUrl('seating_tables', {
      select: 'id,table_name,capacity,table_shape,seating_event_id',
      table_name: 'ilike.*QA Round*',
      order: 'created_at.desc',
    }));
    expect(response.ok).toBeTruthy();
    return await response.json() as Array<{ id: string; table_name: string; capacity: number; table_shape: string | null; seating_event_id: string }>;
  };

  const cleanupQaRows = async () => {
    for (const table of await fetchAllQaRoundTables().catch(() => [])) {
      await restFetch(restUrl('seating_tables', { id: `eq.${table.id}` }), { method: 'DELETE' });
    }
    createdTableIds = [];
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

  const siteResponse = await restFetch(restUrl('wedding_sites', {
    select: 'id',
    site_slug: `eq.${proofSiteSlug}`,
    limit: '1',
  }));
  expect(siteResponse.ok).toBeTruthy();
  const [site] = await siteResponse.json() as Array<{ id: string }>;
  expect(site?.id).toBeTruthy();
  siteId = site.id;

  try {
    await cleanupQaRows();

    await page.goto(`/dashboard/seating?bypassPayment=1&seatingQa=${runId}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Seating' })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /Add Table/i }).first().click();
    await page.getByPlaceholder('Optional label').fill(tableName);
    await page.locator('input[type="number"]').first().fill('2');
    await page.getByRole('button', { name: /^Save$/ }).click();

    let createdTable: { id: string; table_name: string; capacity: number; table_shape: string | null; seating_event_id: string } | undefined;
    await expect.poll(async () => {
      [createdTable] = await fetchQaTables();
      return createdTable?.id ?? null;
    }, {
      timeout: 15_000,
      message: 'The seating board should persist the newly created QA table',
    }).not.toBeNull();
    expect(createdTable).toMatchObject({
      table_name: tableName,
      capacity: 2,
      table_shape: 'round',
    });
    seatingEventId = createdTable!.seating_event_id;
    createdTableIds.push(createdTable!.id);

    await revealCreatedTable(page, tableName);
    const createdTableCard = page
      .getByText(tableName, { exact: true })
      .locator('xpath=ancestor::div[.//button[contains(normalize-space(.), "Seat 1")]][1]')
      .last();
    await expect(createdTableCard).toBeVisible({ timeout: 10_000 });
    await createdTableCard.getByRole('button', { name: 'Seat 1' }).click({ force: true });
    await expect(page.getByRole('heading', { name: /Map a guest to seat 1/i })).toBeVisible();
    const seatPickerPanel = page
      .getByRole('heading', { name: /Map a guest to seat 1/i })
      .locator('xpath=ancestor::div[.//button[contains(normalize-space(.), "Guest")]][1]');
    const guestOption = seatPickerPanel.getByRole('button', { name: /Guest$/ }).first();
    await expect(guestOption).toBeVisible({ timeout: 10_000 });
    const guestName = (((await guestOption.textContent()) ?? '').replace(/Guest\s*$/, '')).trim();
    expect(guestName).toBeTruthy();
    await guestOption.click();
    await expect(page.getByRole('heading', { name: /Map a guest to seat 1/i })).toBeHidden({ timeout: 10_000 });
    await expect(page.getByText(guestName).first()).toBeVisible({ timeout: 10_000 });

    let assignmentResponse: Response | null = null;
    let assignment: { id: string; guest_id: string; table_id: string; seat_index: number; checked_in_at: string | null; is_valid: boolean } | undefined;
    await expect.poll(async () => {
      assignmentResponse = await restFetch(restUrl('seating_assignments', {
        select: 'id,guest_id,table_id,seat_index,checked_in_at,is_valid',
        seating_event_id: `eq.${seatingEventId}`,
        table_id: `eq.${createdTable!.id}`,
        seat_index: 'eq.1',
        limit: '1',
      }));
      if (!assignmentResponse.ok) return null;
      [assignment] = await assignmentResponse.json() as Array<{ id: string; guest_id: string; table_id: string; seat_index: number; checked_in_at: string | null; is_valid: boolean }>;
      return assignment?.id ?? null;
    }, {
      timeout: 15_000,
      message: 'Seat assignment should persist to seating_assignments',
    }).not.toBeNull();
    expect(assignment).toMatchObject({
      table_id: createdTable!.id,
      seat_index: 1,
      checked_in_at: null,
      is_valid: true,
    });

    await page.getByRole('button', { name: /Check-in Mode/i }).click();
    await page.getByTitle('Mark arrived').last().click({ force: true });
    await page.waitForTimeout(1_500);

    await expect.poll(async () => {
      assignmentResponse = await restFetch(restUrl('seating_assignments', {
        select: 'checked_in_at',
        id: `eq.${assignment!.id}`,
        limit: '1',
      }));
      if (!assignmentResponse.ok) return null;
      const [row] = await assignmentResponse.json() as Array<{ checked_in_at: string | null }>;
      return row?.checked_in_at ? 'arrived' : null;
    }, {
      timeout: 15_000,
      message: 'Seating check-in should persist to seating_assignments.checked_in_at',
    }).toBe('arrived');

    const allAssignmentsResponse = await restFetch(restUrl('seating_assignments', {
      select: 'guest_id,table_id,seat_index,checked_in_at,is_valid',
      seating_event_id: `eq.${seatingEventId}`,
      table_id: `eq.${createdTable!.id}`,
      order: 'seat_index.asc',
    }));
    expect(allAssignmentsResponse.ok).toBeTruthy();
    const allAssignments = await allAssignmentsResponse.json() as Array<{ guest_id: string; table_id: string; seat_index: number; checked_in_at: string | null; is_valid: boolean }>;
    expect(allAssignments).toHaveLength(1);
    expect(allAssignments[0]).toMatchObject({
      guest_id: assignment.guest_id,
      table_id: createdTable!.id,
      seat_index: 1,
      is_valid: true,
    });
    expect(allAssignments[0].checked_in_at).toBeTruthy();
  } finally {
    await cleanupQaRows();
  }
});
