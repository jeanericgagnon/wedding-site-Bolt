import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

test.skip(process.env.LIVE_COLLABORATOR_PERMISSION_RLS !== '1', 'Set LIVE_COLLABORATOR_PERMISSION_RLS=1 to create a limited collaborator and prove permission-key RLS.');

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

async function readAuthState(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
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
}

test('limited collaborator can write allowed guest records but cannot directly write forbidden messages', async ({ browser }) => {
  test.setTimeout(150_000);
  const ownerEmail = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const ownerPassword = process.env.V1_OWNER_PASSWORD || '12345678';
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const runId = process.env.LIVE_COLLABORATOR_PERMISSION_RLS_RUN_ID || `${Date.now()}`;
  const collaboratorEmail = `qa-permission-${runId}@example.com`;
  const collaboratorPassword = `DayOf${runId}!`;
  const inviteName = `QA Permission ${runId}`;
  const guestName = `QA Permission Guest ${runId}`;
  let ownerAccessToken = '';
  let collaboratorAccessToken = '';
  let collaboratorUserId = '';
  let inviteId = '';
  let weddingSiteId = '';
  let guestId = '';

  const restUrl = (table: string, params: Record<string, string> = {}) => {
    const search = new URLSearchParams(params);
    return `${supabaseUrl}/rest/v1/${table}${search.toString() ? `?${search.toString()}` : ''}`;
  };

  const restFetch = async (token: string, url: string, init: RequestInit = {}) => fetch(url, {
    ...init,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(10_000),
  });

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  const collaboratorContext = await browser.newContext();
  const collaboratorPage = await collaboratorContext.newPage();

  const cleanup = async () => {
    if (!ownerAccessToken) return;
    if (guestId) {
      await restFetch(ownerAccessToken, restUrl('guests', { id: `eq.${guestId}` }), {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
    }
    if (weddingSiteId && collaboratorUserId) {
      await restFetch(ownerAccessToken, restUrl('wedding_site_collaborators', {
        wedding_site_id: `eq.${weddingSiteId}`,
        user_id: `eq.${collaboratorUserId}`,
      }), {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
    }
    if (inviteId) {
      await restFetch(ownerAccessToken, restUrl('wedding_site_collaborator_invites', { id: `eq.${inviteId}` }), {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
    }
  };

  try {
    await ownerPage.goto('/login', { waitUntil: 'domcontentloaded' });
    await ownerPage.getByPlaceholder('your@email.com').fill(ownerEmail);
    await ownerPage.getByPlaceholder('Enter your password').fill(ownerPassword);
    await ownerPage.getByRole('button', { name: 'Sign In' }).click();
    await expect(ownerPage).toHaveURL(/\/dashboard/);
    const ownerAuthState = await readAuthState(ownerPage);
    ownerAccessToken = ownerAuthState.token;
    expect(ownerAccessToken).toBeTruthy();

    await ownerPage.goto('/dashboard/settings?bypassPayment=1&permissionRlsQa=' + runId, { waitUntil: 'domcontentloaded' });
    await expect(ownerPage.getByRole('heading', { name: 'Settings' }).first()).toBeVisible();
    await ownerPage.getByRole('button', { name: 'Team Access' }).click();
    await ownerPage.getByRole('button', { name: 'Read only' }).click();
    await ownerPage.getByLabel('Planner name').fill(inviteName);
    await ownerPage.getByLabel('Planner email').fill(collaboratorEmail);
    await ownerPage.getByRole('button', { name: 'Create invite link' }).click();
    await expect(ownerPage.getByText('Collaborator invite link created.')).toBeVisible();

    const inviteResponse = await restFetch(ownerAccessToken, restUrl('wedding_site_collaborator_invites', {
      select: 'id,wedding_site_id,invite_token',
      invite_email: `eq.${collaboratorEmail}`,
      limit: '1',
    }));
    const inviteText = await inviteResponse.text();
    expect(inviteResponse.ok, inviteText).toBeTruthy();
    const [invite] = JSON.parse(inviteText) as Array<{ id: string; wedding_site_id: string; invite_token: string }>;
    inviteId = invite.id;
    weddingSiteId = invite.wedding_site_id;

    const permissionUpdate = await restFetch(ownerAccessToken, restUrl('wedding_site_collaborator_invites', { id: `eq.${inviteId}` }), {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ permissions: ['guests'] }),
    });
    expect(permissionUpdate.ok, await permissionUpdate.text()).toBeTruthy();

    await collaboratorPage.goto(`/accept-collaborator-invite?token=${invite.invite_token}`, { waitUntil: 'domcontentloaded' });
    await collaboratorPage.getByRole('button', { name: 'Create account' }).click();
    await collaboratorPage.getByLabel('Full name').fill(inviteName);
    await collaboratorPage.getByLabel('Invited email').fill(collaboratorEmail);
    await collaboratorPage.getByLabel('Create password').fill(collaboratorPassword);
    await collaboratorPage.getByLabel('Confirm password').fill(collaboratorPassword);
    await collaboratorPage.getByRole('button', { name: 'Create account and join team' }).click();
    await expect(collaboratorPage).toHaveURL(/\/dashboard\/overview/, { timeout: 45_000 });
    const collaboratorAuthState = await readAuthState(collaboratorPage);
    collaboratorAccessToken = collaboratorAuthState.token;
    collaboratorUserId = collaboratorAuthState.id;
    expect(collaboratorAccessToken).toBeTruthy();
    expect(collaboratorUserId).toBeTruthy();

    const collaboratorResponse = await restFetch(ownerAccessToken, restUrl('wedding_site_collaborators', {
      select: 'role,permissions',
      wedding_site_id: `eq.${weddingSiteId}`,
      user_id: `eq.${collaboratorUserId}`,
      limit: '1',
    }));
    expect(collaboratorResponse.ok).toBeTruthy();
    const [collaborator] = await collaboratorResponse.json() as Array<{ role: string; permissions: string[] }>;
    expect(collaborator).toMatchObject({ role: 'viewer', permissions: ['guests'] });

    const allowedGuestWrite = await restFetch(collaboratorAccessToken, restUrl('guests'), {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        wedding_site_id: weddingSiteId,
        name: guestName,
        email: `qa-permission-guest-${runId}@example.com`,
        rsvp_status: 'pending',
      }),
    });
    const allowedGuestText = await allowedGuestWrite.text();
    expect(allowedGuestWrite.ok, allowedGuestText).toBeTruthy();
    const [createdGuest] = JSON.parse(allowedGuestText) as Array<{ id: string; name: string }>;
    guestId = createdGuest.id;
    expect(createdGuest.name).toBe(guestName);

    const forbiddenMessageWrite = await restFetch(collaboratorAccessToken, restUrl('messages'), {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        wedding_site_id: weddingSiteId,
        subject: `Forbidden QA ${runId}`,
        body: 'This should be rejected by permission-key RLS.',
        channel: 'email',
        recipient_filter: { audience: 'all' },
      }),
    });
    expect(forbiddenMessageWrite.ok, await forbiddenMessageWrite.text()).toBeFalsy();
    expect([401, 403, 404]).toContain(forbiddenMessageWrite.status);
  } finally {
    await cleanup();
    await ownerContext.close();
    await collaboratorContext.close();
  }
});
