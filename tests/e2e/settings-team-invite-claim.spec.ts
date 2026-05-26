import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

test.skip(process.env.LIVE_SETTINGS_TEAM_INVITE_CLAIM !== '1', 'Set LIVE_SETTINGS_TEAM_INVITE_CLAIM=1 to create, claim, and clean up a production collaborator invite.');

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

test('invited signed-in teammate can claim a collaborator invite', async ({ page }) => {
  test.setTimeout(120_000);
  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const runId = process.env.LIVE_SETTINGS_TEAM_INVITE_CLAIM_RUN_ID || `${Date.now()}`;
  const inviteName = `QA Claim ${runId}`;
  let accessToken = '';
  let userId = '';
  let inviteId = '';
  let weddingSiteId = '';
  let hadExistingCollaboratorRow = false;

  const authHeaders = () => ({
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${accessToken || supabaseAnonKey}`,
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

  const cleanup = async () => {
    if (weddingSiteId && userId && !hadExistingCollaboratorRow) {
      await restFetch(restUrl('wedding_site_collaborators', {
        wedding_site_id: `eq.${weddingSiteId}`,
        user_id: `eq.${userId}`,
      }), {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
    }

    if (inviteId) {
      await restFetch(restUrl('wedding_site_collaborator_invites', { id: `eq.${inviteId}` }), {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
    }
  };

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('your@email.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  const authState = await page.evaluate(() => {
    for (const [key, value] of Object.entries(window.localStorage)) {
      if (!key.includes('auth-token')) continue;
      try {
        const parsed = JSON.parse(String(value)) as {
          access_token?: string;
          user?: { id?: string };
          currentSession?: { access_token?: string; user?: { id?: string } };
        };
        const token = parsed.access_token || parsed.currentSession?.access_token || '';
        const id = parsed.user?.id || parsed.currentSession?.user?.id || '';
        if (token) return { token, id };
      } catch {
        // Keep scanning.
      }
    }
    return { token: '', id: '' };
  });
  accessToken = authState.token;
  userId = authState.id;
  expect(accessToken || supabaseAnonKey).toBeTruthy();
  expect(userId).toBeTruthy();

  try {
    await page.goto('/dashboard/settings?bypassPayment=1&tab=team&settingsTeamClaimQa=' + runId, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Settings' }).first()).toBeVisible();
    await expect(page.getByText('Planner access')).toBeVisible();

    await page.getByRole('button', { name: 'Coordinator' }).click();
    await page.getByLabel('Planner name').fill(inviteName);
    await page.getByLabel('Planner email').fill(email);
    await page.getByRole('button', { name: 'Create invite link' }).click();
    await expect(page.getByText('Collaborator invite link created.')).toBeVisible();

    const inviteResponse = await restFetch(restUrl('wedding_site_collaborator_invites', {
      select: 'id,wedding_site_id,invite_email,invite_name,role,status,invite_token,permissions',
      invite_name: `eq.${inviteName}`,
      limit: '1',
    }));
    const inviteText = await inviteResponse.text();
    expect(inviteResponse.ok, inviteText).toBeTruthy();
    const [invite] = JSON.parse(inviteText) as Array<{
      id: string;
      wedding_site_id: string;
      invite_email: string;
      invite_name: string | null;
      role: string;
      status: string;
      invite_token: string;
      permissions: string[];
    }>;
    expect(invite?.invite_token).toEqual(expect.any(String));
    inviteId = invite.id;
    weddingSiteId = invite.wedding_site_id;

    const preExistingResponse = await restFetch(restUrl('wedding_site_collaborators', {
      select: 'wedding_site_id,user_id',
      wedding_site_id: `eq.${weddingSiteId}`,
      user_id: `eq.${userId}`,
      limit: '1',
    }));
    expect(preExistingResponse.ok).toBeTruthy();
    hadExistingCollaboratorRow = ((await preExistingResponse.json()) as unknown[]).length > 0;

    await page.goto(`/accept-collaborator-invite?token=${invite.invite_token}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Join this wedding|Overview/ })).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/overview/, { timeout: 30_000 });

    const acceptedResponse = await restFetch(restUrl('wedding_site_collaborator_invites', {
      select: 'status,accepted_user_id,accepted_at,permissions',
      id: `eq.${inviteId}`,
      limit: '1',
    }));
    expect(acceptedResponse.ok).toBeTruthy();
    const [acceptedInvite] = await acceptedResponse.json() as Array<{
      status: string;
      accepted_user_id: string | null;
      accepted_at: string | null;
      permissions: string[];
    }>;
    expect(acceptedInvite).toMatchObject({
      status: 'accepted',
      accepted_user_id: userId,
    });
    expect(acceptedInvite.accepted_at).toEqual(expect.any(String));
    expect(acceptedInvite.permissions).toEqual(['guests', 'messages', 'planning', 'seating', 'timeline', 'coordinator', 'photos']);

    const collaboratorResponse = await restFetch(restUrl('wedding_site_collaborators', {
      select: 'wedding_site_id,user_id,role,permissions',
      wedding_site_id: `eq.${weddingSiteId}`,
      user_id: `eq.${userId}`,
      limit: '1',
    }));
    expect(collaboratorResponse.ok).toBeTruthy();
    const [collaborator] = await collaboratorResponse.json() as Array<{
      wedding_site_id: string;
      user_id: string;
      role: string;
      permissions: string[];
    }>;
    expect(collaborator).toMatchObject({
      wedding_site_id: weddingSiteId,
      user_id: userId,
      role: 'coordinator',
    });
    expect(collaborator.permissions).toEqual(['guests', 'messages', 'planning', 'seating', 'timeline', 'coordinator', 'photos']);
  } finally {
    await cleanup();
  }
});
