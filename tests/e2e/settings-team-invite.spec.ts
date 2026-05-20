import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

test.skip(process.env.LIVE_SETTINGS_TEAM_INVITE !== '1', 'Set LIVE_SETTINGS_TEAM_INVITE=1 to create and clean up a production collaborator invite.');

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

test('owner can create, persist permissions for, and revoke a collaborator invite', async ({ page }) => {
  test.setTimeout(120_000);
  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const runId = process.env.LIVE_SETTINGS_TEAM_INVITE_RUN_ID || `${Date.now()}`;
  const inviteEmail = `qa-collab-${runId}@example.com`;
  const inviteName = `QA Collab ${runId}`;
  let ownerAccessToken = '';
  let inviteId = '';

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

  const cleanupInvite = async () => {
    if (!inviteId) return;
    await restFetch(restUrl('wedding_site_collaborator_invites', { id: `eq.${inviteId}` }), {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    });
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

  try {
    await page.goto('/dashboard/settings?bypassPayment=1&settingsTeamQa=' + runId, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Settings' }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Team Access' }).click();
    await expect(page.getByText('Planner access')).toBeVisible();

    await page.getByRole('button', { name: 'Coordinator' }).click();
    await page.getByLabel('Planner name').fill(inviteName);
    await page.getByLabel('Planner email').fill(inviteEmail);
    await page.getByRole('button', { name: 'Create invite link' }).click();
    await expect(page.getByText('Collaborator invite link created.')).toBeVisible();
    await expect(page.getByText(inviteEmail)).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Guests View and manage guest list + RSVP data.' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Messages Draft and send guest communication.' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Planning Work inside planning boards and tasks.' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Seating Edit seating charts and assignments.' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Timeline Update itinerary and event schedule.' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Day-of coordination Use day-of view and live support tools.' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Photos & media Manage uploads, vault, and media flows.' })).toBeChecked();

    const inviteResponse = await restFetch(restUrl('wedding_site_collaborator_invites', {
      select: 'id,invite_email,invite_name,role,status,invite_token,permissions',
      invite_email: `eq.${inviteEmail}`,
      limit: '1',
    }));
    const inviteText = await inviteResponse.text();
    expect(inviteResponse.ok, inviteText).toBeTruthy();
    const [invite] = JSON.parse(inviteText) as Array<{
      id: string;
      invite_email: string;
      invite_name: string | null;
      role: string;
      status: string;
      invite_token: string;
      permissions: string[];
    }>;
    expect(invite?.id).toBeTruthy();
    inviteId = invite.id;
    expect(invite).toMatchObject({
      invite_email: inviteEmail,
      invite_name: inviteName,
      role: 'coordinator',
      status: 'pending',
    });
    expect(invite.invite_token).toEqual(expect.any(String));
    expect(invite.permissions).toEqual(['guests', 'messages', 'planning', 'seating', 'timeline', 'coordinator', 'photos']);

    const inviteRow = page
      .locator('p')
      .filter({ hasText: inviteEmail })
      .first()
      .locator('xpath=ancestor::div[.//button[contains(normalize-space(.), "Revoke")]][1]');
    await expect(inviteRow).toBeVisible();
    await inviteRow.getByRole('button', { name: 'Revoke' }).click();
    await expect(page.getByText('Collaborator invite revoked.')).toBeVisible();

    const revokedResponse = await restFetch(restUrl('wedding_site_collaborator_invites', {
      select: 'status,revoked_at',
      id: `eq.${inviteId}`,
      limit: '1',
    }));
    expect(revokedResponse.ok).toBeTruthy();
    const [revoked] = await revokedResponse.json() as Array<{ status: string; revoked_at: string | null }>;
    expect(revoked.status).toBe('revoked');
    expect(revoked.revoked_at).toEqual(expect.any(String));
  } finally {
    await cleanupInvite();
  }
});
