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

type RestFetch = (token: string, url: string, init?: RequestInit) => Promise<Response>;
type FunctionFetch = (token: string, functionName: string, body: Record<string, unknown>) => Promise<Response>;

async function createAndClaimInvite(options: {
  ownerPage: import('@playwright/test').Page;
  ownerAccessToken: string;
  restFetch: RestFetch;
  restUrl: (table: string, params?: Record<string, string>) => string;
  inviteName: string;
  inviteEmail: string;
  inviteRole: 'viewer' | 'planner' | 'coordinator';
  permissions: string[];
  collaboratorPassword: string;
}) {
  const {
    ownerPage,
    ownerAccessToken,
    restFetch,
    restUrl,
    inviteName,
    inviteEmail,
    inviteRole,
    permissions,
    collaboratorPassword,
  } = options;

  await ownerPage.goto(`/dashboard/settings?bypassPayment=1&permissionRlsQa=${encodeURIComponent(inviteName)}`, { waitUntil: 'domcontentloaded' });
  await expect(ownerPage.getByRole('heading', { name: 'Settings' }).first()).toBeVisible();
  await ownerPage.getByRole('button', { name: 'Team Access' }).click();
  await ownerPage.getByRole('button', { name: 'Read only' }).click();
  await ownerPage.getByLabel('Planner name').fill(inviteName);
  await ownerPage.getByLabel('Planner email').fill(inviteEmail);
  await ownerPage.getByRole('button', { name: 'Create invite link' }).click();
  await expect(ownerPage.getByText('Collaborator invite link created.')).toBeVisible();

  const inviteResponse = await restFetch(ownerAccessToken, restUrl('wedding_site_collaborator_invites', {
    select: 'id,wedding_site_id,invite_token',
    invite_email: `eq.${inviteEmail}`,
    limit: '1',
  }));
  const inviteText = await inviteResponse.text();
  expect(inviteResponse.ok, inviteText).toBeTruthy();
  const [invite] = JSON.parse(inviteText) as Array<{ id: string; wedding_site_id: string; invite_token: string }>;

  const inviteUpdate = await restFetch(ownerAccessToken, restUrl('wedding_site_collaborator_invites', { id: `eq.${invite.id}` }), {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      role: inviteRole,
      permissions,
    }),
  });
  expect(inviteUpdate.ok, await inviteUpdate.text()).toBeTruthy();

  const collaboratorContext = await ownerPage.context().browser()!.newContext();
  const collaboratorPage = await collaboratorContext.newPage();

  await collaboratorPage.goto(`/accept-collaborator-invite?token=${invite.invite_token}`, { waitUntil: 'domcontentloaded' });
  await collaboratorPage.getByRole('button', { name: 'Create account', exact: true }).click();
  await collaboratorPage.getByLabel('Full name').fill(inviteName);
  await collaboratorPage.getByLabel('Invited email').fill(inviteEmail);
  await collaboratorPage.getByLabel('Create password').fill(collaboratorPassword);
  await collaboratorPage.getByLabel('Confirm password').fill(collaboratorPassword);
  await collaboratorPage.getByRole('button', { name: 'Create account and join team' }).click();
  await expect(collaboratorPage).toHaveURL(/\/dashboard\/overview/, { timeout: 45_000 });

  const collaboratorAuthState = await readAuthState(collaboratorPage);
  expect(collaboratorAuthState.token).toBeTruthy();
  expect(collaboratorAuthState.id).toBeTruthy();

  return {
    inviteId: invite.id,
    weddingSiteId: invite.wedding_site_id,
    collaboratorUserId: collaboratorAuthState.id,
    collaboratorAccessToken: collaboratorAuthState.token,
    collaboratorContext,
  };
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
  let claimedCollaboratorContext: import('@playwright/test').BrowserContext | null = null;

  const restUrl = (table: string, params: Record<string, string> = {}) => {
    const search = new URLSearchParams(params);
    return `${supabaseUrl}/rest/v1/${table}${search.toString() ? `?${search.toString()}` : ''}`;
  };
  const functionUrl = (functionName: string) => `${supabaseUrl}/functions/v1/${functionName}`;

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
  const functionFetch = async (token: string, functionName: string, body: Record<string, unknown>) => fetch(functionUrl(functionName), {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();

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

    const claimedInvite = await createAndClaimInvite({
      ownerPage,
      ownerAccessToken,
      restFetch,
      restUrl,
      inviteName,
      inviteEmail: collaboratorEmail,
      inviteRole: 'viewer',
      permissions: ['guests'],
      collaboratorPassword,
    });
    inviteId = claimedInvite.inviteId;
    weddingSiteId = claimedInvite.weddingSiteId;
    collaboratorAccessToken = claimedInvite.collaboratorAccessToken;
    collaboratorUserId = claimedInvite.collaboratorUserId;
    claimedCollaboratorContext = claimedInvite.collaboratorContext;
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

    const forbiddenFollowupQueue = await functionFetch(collaboratorAccessToken, 'queue-guest-followups', {
      siteId: weddingSiteId,
      kind: 'recap',
      limit: 1,
    });
    expect(forbiddenFollowupQueue.ok, await forbiddenFollowupQueue.text()).toBeFalsy();
    expect([401, 403]).toContain(forbiddenFollowupQueue.status);

    const forbiddenPhotoAlbumCreate = await functionFetch(collaboratorAccessToken, 'photo-album-create', {
      siteId: weddingSiteId,
      name: `Forbidden QA Album ${runId}`,
    });
    expect(forbiddenPhotoAlbumCreate.ok, await forbiddenPhotoAlbumCreate.text()).toBeFalsy();
    expect([401, 403]).toContain(forbiddenPhotoAlbumCreate.status);

    const forbiddenPhotoManifest = await functionFetch(collaboratorAccessToken, 'photo-export-manifest', {
      siteId: weddingSiteId,
      includeHidden: false,
    });
    expect(forbiddenPhotoManifest.ok, await forbiddenPhotoManifest.text()).toBeFalsy();
    expect([401, 403]).toContain(forbiddenPhotoManifest.status);
  } finally {
    await cleanup();
    await claimedCollaboratorContext?.close();
    await ownerContext.close();
  }
});

test('planner messaging and coordinator photo actions are allowed while viewer-only restrictions stay intact', async ({ browser }) => {
  test.setTimeout(180_000);
  const ownerEmail = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const ownerPassword = process.env.V1_OWNER_PASSWORD || '12345678';
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const runId = process.env.LIVE_COLLABORATOR_PERMISSION_RLS_RUN_ID || `${Date.now()}`;
  const plannerEmail = `qa-planner-${runId}@example.com`;
  const plannerPassword = `DayOfPlanner${runId}!`;
  const coordinatorEmail = `qa-coordinator-${runId}@example.com`;
  const coordinatorPassword = `DayOfCoordinator${runId}!`;
  const plannerInviteName = `QA Planner ${runId}`;
  const coordinatorInviteName = `QA Coordinator ${runId}`;
  let ownerAccessToken = '';
  let weddingSiteId = '';
  let plannerInviteId = '';
  let plannerCollaboratorUserId = '';
  let plannerCollaboratorAccessToken = '';
  let coordinatorInviteId = '';
  let coordinatorCollaboratorUserId = '';
  let coordinatorCollaboratorAccessToken = '';
  const collaboratorContexts: Array<import('@playwright/test').BrowserContext> = [];

  const restUrl = (table: string, params: Record<string, string> = {}) => {
    const search = new URLSearchParams(params);
    return `${supabaseUrl}/rest/v1/${table}${search.toString() ? `?${search.toString()}` : ''}`;
  };
  const functionUrl = (functionName: string) => `${supabaseUrl}/functions/v1/${functionName}`;

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
  const functionFetch: FunctionFetch = async (token: string, functionName: string, body: Record<string, unknown>) => fetch(functionUrl(functionName), {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();

  const cleanup = async () => {
    if (!ownerAccessToken) return;
    if (weddingSiteId && plannerCollaboratorUserId) {
      await restFetch(ownerAccessToken, restUrl('wedding_site_collaborators', {
        wedding_site_id: `eq.${weddingSiteId}`,
        user_id: `eq.${plannerCollaboratorUserId}`,
      }), {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
    }
    if (weddingSiteId && coordinatorCollaboratorUserId) {
      await restFetch(ownerAccessToken, restUrl('wedding_site_collaborators', {
        wedding_site_id: `eq.${weddingSiteId}`,
        user_id: `eq.${coordinatorCollaboratorUserId}`,
      }), {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
    }
    if (plannerInviteId) {
      await restFetch(ownerAccessToken, restUrl('wedding_site_collaborator_invites', { id: `eq.${plannerInviteId}` }), {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
    }
    if (coordinatorInviteId) {
      await restFetch(ownerAccessToken, restUrl('wedding_site_collaborator_invites', { id: `eq.${coordinatorInviteId}` }), {
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

    const plannerInvite = await createAndClaimInvite({
      ownerPage,
      ownerAccessToken,
      restFetch,
      restUrl,
      inviteName: plannerInviteName,
      inviteEmail: plannerEmail,
      inviteRole: 'planner',
      permissions: ['messages'],
      collaboratorPassword: plannerPassword,
    });
    plannerInviteId = plannerInvite.inviteId;
    weddingSiteId = plannerInvite.weddingSiteId;
    plannerCollaboratorUserId = plannerInvite.collaboratorUserId;
    plannerCollaboratorAccessToken = plannerInvite.collaboratorAccessToken;
    collaboratorContexts.push(plannerInvite.collaboratorContext);

    const plannerCollaboratorResponse = await restFetch(ownerAccessToken, restUrl('wedding_site_collaborators', {
      select: 'role,permissions',
      wedding_site_id: `eq.${weddingSiteId}`,
      user_id: `eq.${plannerCollaboratorUserId}`,
      limit: '1',
    }));
    expect(plannerCollaboratorResponse.ok).toBeTruthy();
    const [plannerCollaborator] = await plannerCollaboratorResponse.json() as Array<{ role: string; permissions: string[] }>;
    expect(plannerCollaborator).toMatchObject({ role: 'planner', permissions: ['messages'] });

    const allowedPlannerFollowupQueue = await functionFetch(plannerCollaboratorAccessToken, 'queue-guest-followups', {
      siteId: weddingSiteId,
      kind: 'recap',
      limit: 1,
    });
    const allowedPlannerFollowupQueueText = await allowedPlannerFollowupQueue.text();
    expect(allowedPlannerFollowupQueue.ok, allowedPlannerFollowupQueueText).toBeTruthy();
    const allowedPlannerFollowupQueueBody = JSON.parse(allowedPlannerFollowupQueueText) as {
      queued?: number;
      scanned?: number;
      failures?: unknown[];
    };
    expect(typeof allowedPlannerFollowupQueueBody.queued).toBe('number');
    expect(typeof allowedPlannerFollowupQueueBody.scanned).toBe('number');
    expect(Array.isArray(allowedPlannerFollowupQueueBody.failures)).toBe(true);

    const coordinatorInvite = await createAndClaimInvite({
      ownerPage,
      ownerAccessToken,
      restFetch,
      restUrl,
      inviteName: coordinatorInviteName,
      inviteEmail: coordinatorEmail,
      inviteRole: 'coordinator',
      permissions: ['photos'],
      collaboratorPassword: coordinatorPassword,
    });
    coordinatorInviteId = coordinatorInvite.inviteId;
    coordinatorCollaboratorUserId = coordinatorInvite.collaboratorUserId;
    coordinatorCollaboratorAccessToken = coordinatorInvite.collaboratorAccessToken;
    collaboratorContexts.push(coordinatorInvite.collaboratorContext);

    const coordinatorCollaboratorResponse = await restFetch(ownerAccessToken, restUrl('wedding_site_collaborators', {
      select: 'role,permissions',
      wedding_site_id: `eq.${weddingSiteId}`,
      user_id: `eq.${coordinatorCollaboratorUserId}`,
      limit: '1',
    }));
    expect(coordinatorCollaboratorResponse.ok).toBeTruthy();
    const [coordinatorCollaborator] = await coordinatorCollaboratorResponse.json() as Array<{ role: string; permissions: string[] }>;
    expect(coordinatorCollaborator).toMatchObject({ role: 'coordinator', permissions: ['photos'] });

    const allowedCoordinatorPhotoManifest = await functionFetch(coordinatorCollaboratorAccessToken, 'photo-export-manifest', {
      siteId: weddingSiteId,
      includeHidden: false,
    });
    const allowedCoordinatorPhotoManifestText = await allowedCoordinatorPhotoManifest.text();
    expect(allowedCoordinatorPhotoManifest.ok, allowedCoordinatorPhotoManifestText).toBeTruthy();
    const allowedCoordinatorPhotoManifestBody = JSON.parse(allowedCoordinatorPhotoManifestText) as {
      success?: boolean;
      rows?: unknown[];
    };
    expect(allowedCoordinatorPhotoManifestBody.success).toBe(true);
    expect(Array.isArray(allowedCoordinatorPhotoManifestBody.rows)).toBe(true);
  } finally {
    await cleanup();
    for (const context of collaboratorContexts) {
      await context.close();
    }
    await ownerContext.close();
  }
});
