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

async function resolveOrCreateOwnerEvent(options: {
  ownerAccessToken: string;
  restFetch: RestFetch;
  restUrl: (table: string, params?: Record<string, string>) => string;
  weddingSiteId: string;
  runId: string;
}) {
  const {
    ownerAccessToken,
    restFetch,
    restUrl,
    weddingSiteId,
    runId,
  } = options;

  const existingResponse = await restFetch(ownerAccessToken, restUrl('itinerary_events', {
    select: 'id',
    wedding_site_id: `eq.${weddingSiteId}`,
    order: 'event_date.asc.nullslast,start_time.asc.nullslast',
    limit: '1',
  }));
  const existingText = await existingResponse.text();
  expect(existingResponse.ok, existingText).toBeTruthy();
  const existingRows = JSON.parse(existingText) as Array<{ id: string }>;
  if (existingRows[0]?.id) {
    return { eventId: existingRows[0].id, createdEventId: '' };
  }

  const createResponse = await restFetch(ownerAccessToken, restUrl('itinerary_events'), {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      wedding_site_id: weddingSiteId,
      event_name: `QA Timeline ${runId}`,
      event_date: '2026-12-31',
      start_time: '18:00',
    }),
  });
  const createText = await createResponse.text();
  expect(createResponse.ok, createText).toBeTruthy();
  const [createdEvent] = JSON.parse(createText) as Array<{ id: string }>;
  expect(createdEvent?.id).toBeTruthy();
  return { eventId: createdEvent.id, createdEventId: createdEvent.id };
}

async function createOwnerItineraryEvent(options: {
  ownerAccessToken: string;
  restFetch: RestFetch;
  restUrl: (table: string, params?: Record<string, string>) => string;
  weddingSiteId: string;
  runId: string;
  namePrefix: string;
}) {
  const {
    ownerAccessToken,
    restFetch,
    restUrl,
    weddingSiteId,
    runId,
    namePrefix,
  } = options;

  const createResponse = await restFetch(ownerAccessToken, restUrl('itinerary_events'), {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      wedding_site_id: weddingSiteId,
      event_name: `${namePrefix} ${runId}`,
      event_date: '2026-12-31',
      start_time: '19:00',
    }),
  });
  const createText = await createResponse.text();
  expect(createResponse.ok, createText).toBeTruthy();
  const [createdEvent] = JSON.parse(createText) as Array<{ id: string }>;
  expect(createdEvent?.id).toBeTruthy();
  return createdEvent.id;
}

async function closeContextSafely(context: import('@playwright/test').BrowserContext | null) {
  if (!context) return;
  try {
    await context.close();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/ENOENT: no such file or directory/i.test(message)) return;
    throw error;
  }
}

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
  const rpcUrl = (fn: string) => `${supabaseUrl}/rest/v1/rpc/${fn}`;
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
    await closeContextSafely(claimedCollaboratorContext);
    await closeContextSafely(ownerContext);
  }
});

test('guest-permission collaborator can mutate guest rows but is denied direct timeline and settings writes', async ({ browser }) => {
  test.setTimeout(180_000);
  const ownerEmail = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const ownerPassword = process.env.V1_OWNER_PASSWORD || '12345678';
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const runId = process.env.LIVE_COLLABORATOR_PERMISSION_RLS_RUN_ID || `${Date.now()}`;
  const collaboratorEmail = `qa-guest-write-${runId}@example.com`;
  const collaboratorPassword = `DayOfGuest${runId}!`;
  const inviteName = `QA Guest Write ${runId}`;
  const liveGuestDashboardSettingsRpcs = process.env.LIVE_GUEST_DASHBOARD_SETTINGS_RPCS === '1';
  let ownerAccessToken = '';
  let collaboratorAccessToken = '';
  let collaboratorUserId = '';
  let inviteId = '';
  let weddingSiteId = '';
  let guestId = '';
  let itineraryEventId = '';
  let createdEventId = '';
  let claimedCollaboratorContext: import('@playwright/test').BrowserContext | null = null;

  const restUrl = (table: string, params: Record<string, string> = {}) => {
    const search = new URLSearchParams(params);
    return `${supabaseUrl}/rest/v1/${table}${search.toString() ? `?${search.toString()}` : ''}`;
  };
  const rpcUrl = (fn: string) => `${supabaseUrl}/rest/v1/rpc/${fn}`;

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

  const cleanup = async () => {
    if (!ownerAccessToken) return;
    if (guestId) {
      await restFetch(ownerAccessToken, restUrl('guests', { id: `eq.${guestId}` }), {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
    }
    if (createdEventId) {
      await restFetch(ownerAccessToken, restUrl('itinerary_events', { id: `eq.${createdEventId}` }), {
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

    const eventResolution = await resolveOrCreateOwnerEvent({
      ownerAccessToken,
      restFetch,
      restUrl,
      weddingSiteId,
      runId,
    });
    itineraryEventId = eventResolution.eventId;
    createdEventId = eventResolution.createdEventId;

    const createGuestResponse = await restFetch(collaboratorAccessToken, restUrl('guests'), {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        wedding_site_id: weddingSiteId,
        first_name: 'Guest',
        last_name: `Write ${runId}`,
        name: `Guest Write ${runId}`,
        email: `guest-write-${runId}@example.com`,
        rsvp_status: 'pending',
      }),
    });
    const createGuestText = await createGuestResponse.text();
    expect(createGuestResponse.ok, createGuestText).toBeTruthy();
    const [createdGuest] = JSON.parse(createGuestText) as Array<{ id: string }>;
    guestId = createdGuest.id;
    expect(guestId).toBeTruthy();

    const allowedGuestPatch = await restFetch(collaboratorAccessToken, restUrl('guests', {
      id: `eq.${guestId}`,
      wedding_site_id: `eq.${weddingSiteId}`,
    }), {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        checked_in_at: '2026-05-11T17:45:00.000Z',
        thank_you_sent_at: '2026-05-11T17:46:00.000Z',
        household_id: guestId,
      }),
    });
    const allowedGuestPatchText = await allowedGuestPatch.text();
    expect(allowedGuestPatch.ok, allowedGuestPatchText).toBeTruthy();
    const [patchedGuest] = JSON.parse(allowedGuestPatchText) as Array<{
      checked_in_at: string | null;
      thank_you_sent_at: string | null;
      household_id: string | null;
    }>;
    expect(patchedGuest.household_id).toBe(guestId);
    expect(Date.parse(patchedGuest.checked_in_at ?? '')).toBe(Date.parse('2026-05-11T17:45:00.000Z'));
    expect(Date.parse(patchedGuest.thank_you_sent_at ?? '')).toBe(Date.parse('2026-05-11T17:46:00.000Z'));

    const forbiddenTimelineInsert = await restFetch(collaboratorAccessToken, restUrl('event_invitations'), {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        event_id: itineraryEventId,
        guest_id: guestId,
      }),
    });
    expect(forbiddenTimelineInsert.ok, await forbiddenTimelineInsert.text()).toBeFalsy();
    expect([401, 403]).toContain(forbiddenTimelineInsert.status);

    const baselineSettingsRead = await restFetch(ownerAccessToken, restUrl('wedding_sites', {
      select: 'auto_reminders_enabled,rsvp_custom_questions',
      id: `eq.${weddingSiteId}`,
      limit: '1',
    }));
    const baselineSettingsReadText = await baselineSettingsRead.text();
    expect(baselineSettingsRead.ok, baselineSettingsReadText).toBeTruthy();
    const [baselineSettingsRow] = JSON.parse(baselineSettingsReadText) as Array<{
      auto_reminders_enabled?: boolean | null;
      rsvp_custom_questions?: Array<{ id?: string }>;
    }>;
    const baselineAutoRemindersEnabled = baselineSettingsRow?.auto_reminders_enabled ?? null;
    const baselineQuestionIds = (baselineSettingsRow?.rsvp_custom_questions ?? [])
      .map((item) => item?.id)
      .filter((value): value is string => typeof value === 'string');

    const forbiddenSettingsPatch = await restFetch(collaboratorAccessToken, restUrl('wedding_sites', {
      id: `eq.${weddingSiteId}`,
    }), {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        auto_reminders_enabled: true,
        rsvp_custom_questions: [{ id: 'qa-q1', label: 'Nope', type: 'short_text' }],
      }),
    });
    const forbiddenSettingsPatchText = await forbiddenSettingsPatch.text();
    expect(forbiddenSettingsPatch.ok, forbiddenSettingsPatchText).toBeTruthy();
    const forbiddenSettingsRows = JSON.parse(forbiddenSettingsPatchText) as Array<unknown>;
    expect(forbiddenSettingsRows).toEqual([]);

    const ownerSettingsRead = await restFetch(ownerAccessToken, restUrl('wedding_sites', {
      select: 'auto_reminders_enabled,rsvp_custom_questions',
      id: `eq.${weddingSiteId}`,
      limit: '1',
    }));
    const ownerSettingsReadText = await ownerSettingsRead.text();
    expect(ownerSettingsRead.ok, ownerSettingsReadText).toBeTruthy();
    const [ownerSettingsRow] = JSON.parse(ownerSettingsReadText) as Array<{
      auto_reminders_enabled?: boolean | null;
      rsvp_custom_questions?: Array<{ id?: string }>;
    }>;
    expect(ownerSettingsRow.auto_reminders_enabled ?? null).toBe(baselineAutoRemindersEnabled);
    expect(Array.isArray(ownerSettingsRow.rsvp_custom_questions)).toBe(true);
    const ownerQuestionIds = (ownerSettingsRow.rsvp_custom_questions ?? [])
      .map((item) => item?.id)
      .filter((value): value is string => typeof value === 'string');
    expect(ownerQuestionIds).toEqual(baselineQuestionIds);

    if (liveGuestDashboardSettingsRpcs) {
      const rpcQuestionId = `qa-q1-${Date.now()}`;
      const allowedReminderRpc = await restFetch(collaboratorAccessToken, rpcUrl('guest_dashboard_persist_reminder_settings'), {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          p_wedding_site_id: weddingSiteId,
          p_reminder_cadence_days: 3,
          p_auto_reminders_enabled: true,
        }),
      });
      expect(allowedReminderRpc.ok, await allowedReminderRpc.text()).toBeTruthy();

      const allowedRsvpConfigRpc = await restFetch(collaboratorAccessToken, rpcUrl('guest_dashboard_persist_rsvp_config'), {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          p_wedding_site_id: weddingSiteId,
          p_questions: [{ id: rpcQuestionId, label: 'Favorite song?', type: 'short_text', required: false, appliesTo: 'all' }],
          p_meal_enabled: true,
          p_meal_options: ['Chicken', 'Fish'],
        }),
      });
      expect(allowedRsvpConfigRpc.ok, await allowedRsvpConfigRpc.text()).toBeTruthy();

      const ownerSettingsAfterRpcRead = await restFetch(ownerAccessToken, restUrl('wedding_sites', {
        select: 'auto_reminders_enabled,reminder_cadence_days,rsvp_custom_questions,rsvp_meal_config',
        id: `eq.${weddingSiteId}`,
        limit: '1',
      }));
      const ownerSettingsAfterRpcText = await ownerSettingsAfterRpcRead.text();
      expect(ownerSettingsAfterRpcRead.ok, ownerSettingsAfterRpcText).toBeTruthy();
      const [ownerSettingsAfterRpc] = JSON.parse(ownerSettingsAfterRpcText) as Array<{
        auto_reminders_enabled?: boolean;
        reminder_cadence_days?: number | null;
        rsvp_custom_questions?: Array<{ id?: string }>;
        rsvp_meal_config?: { enabled?: boolean; options?: string[] };
      }>;
      expect(ownerSettingsAfterRpc.auto_reminders_enabled).toBe(true);
      expect(ownerSettingsAfterRpc.reminder_cadence_days).toBe(3);
      expect(ownerSettingsAfterRpc.rsvp_custom_questions?.some((item) => item?.id === rpcQuestionId)).toBe(true);
      expect(ownerSettingsAfterRpc.rsvp_meal_config).toMatchObject({
        enabled: true,
        options: ['Chicken', 'Fish'],
      });
    }
  } finally {
    await cleanup();
    await closeContextSafely(claimedCollaboratorContext);
    await closeContextSafely(ownerContext);
  }
});

test('planner/coordinator permissioned non-guest actions are allowed while ungranted direct writes stay scoped', async ({ browser }) => {
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
  let planningTaskId = '';
  let plannerMessageId = '';
  let registryInviteId = '';
  let registryCollaboratorUserId = '';
  let registryCollaboratorAccessToken = '';
  let registryItemId = '';
  let photosInviteId = '';
  let photosCollaboratorUserId = '';
  let photosCollaboratorAccessToken = '';
  let vaultConfigId = '';
  let settingsInviteId = '';
  let settingsCollaboratorUserId = '';
  let settingsCollaboratorAccessToken = '';
  let coordinatorInviteId = '';
  let coordinatorCollaboratorUserId = '';
  let coordinatorCollaboratorAccessToken = '';
  let seatingItineraryEventId = '';
  let seatingEventId = '';
  let seatingTableId = '';
  let coordinatorMediaAssetId = '';
  let coordinatorGuestId = '';
  let coordinatorQnaItemId = '';
  let baselineMusicPlaylistUrl: string | null = null;
  const collaboratorContexts: Array<import('@playwright/test').BrowserContext> = [];

  const restUrl = (table: string, params: Record<string, string> = {}) => {
    const search = new URLSearchParams(params);
    return `${supabaseUrl}/rest/v1/${table}${search.toString() ? `?${search.toString()}` : ''}`;
  };
  const rpcUrl = (fn: string) => `${supabaseUrl}/rest/v1/rpc/${fn}`;
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
    if (coordinatorQnaItemId) {
      await restFetch(ownerAccessToken, restUrl('guest_qna_items', { id: `eq.${coordinatorQnaItemId}` }), {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
    }
    if (coordinatorGuestId) {
      await restFetch(ownerAccessToken, restUrl('guests', { id: `eq.${coordinatorGuestId}` }), {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
    }
    if (coordinatorMediaAssetId) {
      await restFetch(ownerAccessToken, rpcUrl('builder_media_asset_delete'), {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          p_asset_id: coordinatorMediaAssetId,
        }),
      });
    }
    if (seatingTableId) {
      await restFetch(ownerAccessToken, restUrl('seating_tables', { id: `eq.${seatingTableId}` }), {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
    }
    if (seatingEventId) {
      await restFetch(ownerAccessToken, restUrl('seating_events', { id: `eq.${seatingEventId}` }), {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
    }
    if (seatingItineraryEventId) {
      await restFetch(ownerAccessToken, restUrl('itinerary_events', { id: `eq.${seatingItineraryEventId}` }), {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
    }
    if (planningTaskId) {
      await restFetch(ownerAccessToken, restUrl('planning_tasks', { id: `eq.${planningTaskId}` }), {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
    }
    if (plannerMessageId) {
      await restFetch(ownerAccessToken, restUrl('messages', { id: `eq.${plannerMessageId}` }), {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
    }
    if (registryItemId) {
      await restFetch(ownerAccessToken, restUrl('registry_items', { id: `eq.${registryItemId}` }), {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
    }
    if (vaultConfigId) {
      await restFetch(ownerAccessToken, rpcUrl('vault_config_delete'), {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          p_config_id: vaultConfigId,
        }),
      });
    }
    if (weddingSiteId && plannerCollaboratorUserId) {
      await restFetch(ownerAccessToken, restUrl('wedding_site_collaborators', {
        wedding_site_id: `eq.${weddingSiteId}`,
        user_id: `eq.${plannerCollaboratorUserId}`,
      }), {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
    }
    if (weddingSiteId && registryCollaboratorUserId) {
      await restFetch(ownerAccessToken, restUrl('wedding_site_collaborators', {
        wedding_site_id: `eq.${weddingSiteId}`,
        user_id: `eq.${registryCollaboratorUserId}`,
      }), {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
    }
    if (weddingSiteId && photosCollaboratorUserId) {
      await restFetch(ownerAccessToken, restUrl('wedding_site_collaborators', {
        wedding_site_id: `eq.${weddingSiteId}`,
        user_id: `eq.${photosCollaboratorUserId}`,
      }), {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
    }
    if (weddingSiteId && settingsCollaboratorUserId) {
      await restFetch(ownerAccessToken, restUrl('wedding_site_collaborators', {
        wedding_site_id: `eq.${weddingSiteId}`,
        user_id: `eq.${settingsCollaboratorUserId}`,
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
    if (registryInviteId) {
      await restFetch(ownerAccessToken, restUrl('wedding_site_collaborator_invites', { id: `eq.${registryInviteId}` }), {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
    }
    if (photosInviteId) {
      await restFetch(ownerAccessToken, restUrl('wedding_site_collaborator_invites', { id: `eq.${photosInviteId}` }), {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });
    }
    if (settingsInviteId) {
      await restFetch(ownerAccessToken, restUrl('wedding_site_collaborator_invites', { id: `eq.${settingsInviteId}` }), {
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
    if (baselineMusicPlaylistUrl !== null) {
      await restFetch(ownerAccessToken, rpcUrl('wedding_site_settings_patch'), {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          p_wedding_site_id: weddingSiteId,
          p_patch: {
            music_playlist_url: baselineMusicPlaylistUrl,
          },
        }),
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
      permissions: ['messages', 'planning'],
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
    expect(plannerCollaborator).toMatchObject({ role: 'planner', permissions: ['messages', 'planning'] });

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

    const allowedPlannerTaskWrite = await restFetch(plannerCollaboratorAccessToken, restUrl('planning_tasks'), {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        wedding_site_id: weddingSiteId,
        title: `QA Planning Task ${runId}`,
        description: 'Planning permission should allow this direct task write.',
        status: 'todo',
        priority: 'medium',
        owner_name: 'Planner QA',
      }),
    });
    const allowedPlannerTaskWriteText = await allowedPlannerTaskWrite.text();
    expect(allowedPlannerTaskWrite.ok, allowedPlannerTaskWriteText).toBeTruthy();
    const [createdPlanningTask] = JSON.parse(allowedPlannerTaskWriteText) as Array<{ id: string; title: string }>;
    planningTaskId = createdPlanningTask.id;
    expect(createdPlanningTask.title).toContain('QA Planning Task');

    const allowedPlannerMessageWrite = await restFetch(plannerCollaboratorAccessToken, rpcUrl('dashboard_message_write'), {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        p_wedding_site_id: weddingSiteId,
        p_message_id: null,
        p_payload: {
          subject: `QA Planner Message ${runId}`,
          body: 'Planner permission should allow dashboard message RPC writes.',
          channel: 'email',
          status: 'draft',
          audience_filter: 'all',
          recipient_filter: { audience: 'all' },
          recipient_count: 0,
        },
      }),
    });
    const allowedPlannerMessageWriteText = await allowedPlannerMessageWrite.text();
    expect(allowedPlannerMessageWrite.ok, allowedPlannerMessageWriteText).toBeTruthy();
    const plannerMessage = JSON.parse(allowedPlannerMessageWriteText) as { id: string; subject: string };
    plannerMessageId = plannerMessage.id;
    expect(plannerMessage.subject).toContain('QA Planner Message');

    const forbiddenPlannerRegistryWrite = await restFetch(plannerCollaboratorAccessToken, rpcUrl('registry_item_write'), {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        p_wedding_site_id: weddingSiteId,
        p_item_id: null,
        p_payload: {
          item_name: `Forbidden Planner Registry ${runId}`,
          item_type: 'gift',
        },
      }),
    });
    expect(forbiddenPlannerRegistryWrite.ok, await forbiddenPlannerRegistryWrite.text()).toBeFalsy();
    expect([400, 401, 403]).toContain(forbiddenPlannerRegistryWrite.status);

    const registryInvite = await createAndClaimInvite({
      ownerPage,
      ownerAccessToken,
      restFetch,
      restUrl,
      inviteName: `QA Registry ${runId}`,
      inviteEmail: `qa-registry-${runId}@example.com`,
      inviteRole: 'viewer',
      permissions: ['registry'],
      collaboratorPassword: `DayOfRegistry${runId}!`,
    });
    registryInviteId = registryInvite.inviteId;
    registryCollaboratorUserId = registryInvite.collaboratorUserId;
    registryCollaboratorAccessToken = registryInvite.collaboratorAccessToken;
    collaboratorContexts.push(registryInvite.collaboratorContext);

    const registryCollaboratorResponse = await restFetch(ownerAccessToken, restUrl('wedding_site_collaborators', {
      select: 'role,permissions',
      wedding_site_id: `eq.${weddingSiteId}`,
      user_id: `eq.${registryCollaboratorUserId}`,
      limit: '1',
    }));
    expect(registryCollaboratorResponse.ok).toBeTruthy();
    const [registryCollaborator] = await registryCollaboratorResponse.json() as Array<{ role: string; permissions: string[] }>;
    expect(registryCollaborator).toMatchObject({ role: 'viewer', permissions: ['registry'] });

    const allowedRegistryItemWrite = await restFetch(registryCollaboratorAccessToken, rpcUrl('registry_item_write'), {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        p_wedding_site_id: weddingSiteId,
        p_item_id: null,
        p_payload: {
          item_name: `QA Registry Item ${runId}`,
          item_type: 'product',
          price_label: '$25',
          quantity_needed: 1,
        },
      }),
    });
    const allowedRegistryItemWriteText = await allowedRegistryItemWrite.text();
    expect(allowedRegistryItemWrite.ok, allowedRegistryItemWriteText).toBeTruthy();
    const registryItem = JSON.parse(allowedRegistryItemWriteText) as { id: string; item_name: string };
    registryItemId = registryItem.id;
    expect(registryItem.item_name).toContain('QA Registry Item');

    const forbiddenRegistryMessageWrite = await restFetch(registryCollaboratorAccessToken, rpcUrl('dashboard_message_write'), {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        p_wedding_site_id: weddingSiteId,
        p_message_id: null,
        p_payload: {
          subject: `Forbidden Registry Message ${runId}`,
          body: 'Registry-only collaborator should not have message permission.',
          channel: 'email',
          status: 'draft',
        },
      }),
    });
    expect(forbiddenRegistryMessageWrite.ok, await forbiddenRegistryMessageWrite.text()).toBeFalsy();
    expect([400, 401, 403]).toContain(forbiddenRegistryMessageWrite.status);

    const photosInvite = await createAndClaimInvite({
      ownerPage,
      ownerAccessToken,
      restFetch,
      restUrl,
      inviteName: `QA Photos ${runId}`,
      inviteEmail: `qa-photos-${runId}@example.com`,
      inviteRole: 'viewer',
      permissions: ['photos'],
      collaboratorPassword: `DayOfPhotos${runId}!`,
    });
    photosInviteId = photosInvite.inviteId;
    photosCollaboratorUserId = photosInvite.collaboratorUserId;
    photosCollaboratorAccessToken = photosInvite.collaboratorAccessToken;
    collaboratorContexts.push(photosInvite.collaboratorContext);

    const photosCollaboratorResponse = await restFetch(ownerAccessToken, restUrl('wedding_site_collaborators', {
      select: 'role,permissions',
      wedding_site_id: `eq.${weddingSiteId}`,
      user_id: `eq.${photosCollaboratorUserId}`,
      limit: '1',
    }));
    expect(photosCollaboratorResponse.ok).toBeTruthy();
    const [photosCollaborator] = await photosCollaboratorResponse.json() as Array<{ role: string; permissions: string[] }>;
    expect(photosCollaborator).toMatchObject({ role: 'viewer', permissions: ['photos'] });

    const allowedPhotosVaultConfigWrite = await restFetch(photosCollaboratorAccessToken, rpcUrl('vault_config_write'), {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        p_wedding_site_id: weddingSiteId,
        p_config_id: null,
        p_payload: {
          vault_index: 4,
          label: `QA Vault Config ${runId}`,
          duration_years: 1,
          is_enabled: true,
        },
      }),
    });
    const allowedPhotosVaultConfigWriteText = await allowedPhotosVaultConfigWrite.text();
    expect(allowedPhotosVaultConfigWrite.ok, allowedPhotosVaultConfigWriteText).toBeTruthy();
    const vaultConfig = JSON.parse(allowedPhotosVaultConfigWriteText) as { id: string; label: string };
    vaultConfigId = vaultConfig.id;
    expect(vaultConfig.label).toContain('QA Vault Config');

    const forbiddenPhotosMessageWrite = await restFetch(photosCollaboratorAccessToken, rpcUrl('dashboard_message_write'), {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        p_wedding_site_id: weddingSiteId,
        p_message_id: null,
        p_payload: {
          subject: `Forbidden Photos Message ${runId}`,
          body: 'Photos-only collaborator should not have message permission.',
          channel: 'email',
          status: 'draft',
        },
      }),
    });
    expect(forbiddenPhotosMessageWrite.ok, await forbiddenPhotosMessageWrite.text()).toBeFalsy();
    expect([400, 401, 403]).toContain(forbiddenPhotosMessageWrite.status);

    const baselineSettingsRead = await restFetch(ownerAccessToken, restUrl('wedding_sites', {
      select: 'music_playlist_url',
      id: `eq.${weddingSiteId}`,
      limit: '1',
    }));
    const baselineSettingsReadText = await baselineSettingsRead.text();
    expect(baselineSettingsRead.ok, baselineSettingsReadText).toBeTruthy();
    const [baselineSettingsRow] = JSON.parse(baselineSettingsReadText) as Array<{
      music_playlist_url?: string | null;
    }>;
    baselineMusicPlaylistUrl = baselineSettingsRow?.music_playlist_url ?? null;

    const settingsInvite = await createAndClaimInvite({
      ownerPage,
      ownerAccessToken,
      restFetch,
      restUrl,
      inviteName: `QA Settings ${runId}`,
      inviteEmail: `qa-settings-${runId}@example.com`,
      inviteRole: 'viewer',
      permissions: ['settings'],
      collaboratorPassword: `DayOfSettings${runId}!`,
    });
    settingsInviteId = settingsInvite.inviteId;
    settingsCollaboratorUserId = settingsInvite.collaboratorUserId;
    settingsCollaboratorAccessToken = settingsInvite.collaboratorAccessToken;
    collaboratorContexts.push(settingsInvite.collaboratorContext);

    const settingsCollaboratorResponse = await restFetch(ownerAccessToken, restUrl('wedding_site_collaborators', {
      select: 'role,permissions',
      wedding_site_id: `eq.${weddingSiteId}`,
      user_id: `eq.${settingsCollaboratorUserId}`,
      limit: '1',
    }));
    expect(settingsCollaboratorResponse.ok).toBeTruthy();
    const [settingsCollaborator] = await settingsCollaboratorResponse.json() as Array<{ role: string; permissions: string[] }>;
    expect(settingsCollaborator).toMatchObject({ role: 'viewer', permissions: ['settings'] });

    const updatedMusicPlaylistUrl = `https://open.spotify.com/playlist/qa-${runId}`;
    const allowedSettingsPatch = await restFetch(settingsCollaboratorAccessToken, rpcUrl('wedding_site_settings_patch'), {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        p_wedding_site_id: weddingSiteId,
        p_patch: {
          music_playlist_url: updatedMusicPlaylistUrl,
        },
      }),
    });
    const allowedSettingsPatchText = await allowedSettingsPatch.text();
    expect(allowedSettingsPatch.ok, allowedSettingsPatchText).toBeTruthy();
    const updatedSettingsRow = JSON.parse(allowedSettingsPatchText) as { music_playlist_url?: string | null };
    expect(updatedSettingsRow.music_playlist_url).toBe(updatedMusicPlaylistUrl);

    const ownerSettingsAfterPatchRead = await restFetch(ownerAccessToken, restUrl('wedding_sites', {
      select: 'music_playlist_url',
      id: `eq.${weddingSiteId}`,
      limit: '1',
    }));
    const ownerSettingsAfterPatchText = await ownerSettingsAfterPatchRead.text();
    expect(ownerSettingsAfterPatchRead.ok, ownerSettingsAfterPatchText).toBeTruthy();
    const [ownerSettingsAfterPatch] = JSON.parse(ownerSettingsAfterPatchText) as Array<{ music_playlist_url?: string | null }>;
    expect(ownerSettingsAfterPatch?.music_playlist_url ?? null).toBe(updatedMusicPlaylistUrl);

    const forbiddenSettingsRegistryWrite = await restFetch(settingsCollaboratorAccessToken, rpcUrl('registry_item_write'), {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        p_wedding_site_id: weddingSiteId,
        p_item_id: null,
        p_payload: {
          item_name: `Forbidden Settings Registry ${runId}`,
          item_type: 'product',
        },
      }),
    });
    expect(forbiddenSettingsRegistryWrite.ok, await forbiddenSettingsRegistryWrite.text()).toBeFalsy();
    expect([400, 401, 403]).toContain(forbiddenSettingsRegistryWrite.status);

    const coordinatorInvite = await createAndClaimInvite({
      ownerPage,
      ownerAccessToken,
      restFetch,
      restUrl,
      inviteName: coordinatorInviteName,
      inviteEmail: coordinatorEmail,
      inviteRole: 'coordinator',
      permissions: ['coordinator', 'photos', 'seating'],
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
    expect(coordinatorCollaborator).toMatchObject({ role: 'coordinator', permissions: ['coordinator', 'photos', 'seating'] });

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

    seatingItineraryEventId = await createOwnerItineraryEvent({
      ownerAccessToken,
      restFetch,
      restUrl,
      weddingSiteId,
      runId,
      namePrefix: 'QA Seating Event',
    });

    const allowedCoordinatorSeatingEventWrite = await restFetch(coordinatorCollaboratorAccessToken, restUrl('seating_events'), {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        wedding_site_id: weddingSiteId,
        itinerary_event_id: seatingItineraryEventId,
        default_table_capacity: 8,
        notes: 'Seating permission should allow this direct seating event write.',
      }),
    });
    const allowedCoordinatorSeatingEventWriteText = await allowedCoordinatorSeatingEventWrite.text();
    expect(allowedCoordinatorSeatingEventWrite.ok, allowedCoordinatorSeatingEventWriteText).toBeTruthy();
    const [createdSeatingEvent] = JSON.parse(allowedCoordinatorSeatingEventWriteText) as Array<{ id: string }>;
    seatingEventId = createdSeatingEvent.id;
    expect(seatingEventId).toBeTruthy();

    const allowedCoordinatorSeatingTableWrite = await restFetch(coordinatorCollaboratorAccessToken, restUrl('seating_tables'), {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        seating_event_id: seatingEventId,
        table_name: `QA Table ${runId}`,
        capacity: 8,
        sort_order: 0,
      }),
    });
    const allowedCoordinatorSeatingTableWriteText = await allowedCoordinatorSeatingTableWrite.text();
    expect(allowedCoordinatorSeatingTableWrite.ok, allowedCoordinatorSeatingTableWriteText).toBeTruthy();
    const [createdSeatingTable] = JSON.parse(allowedCoordinatorSeatingTableWriteText) as Array<{ id: string; table_name: string }>;
    seatingTableId = createdSeatingTable.id;
    expect(createdSeatingTable.table_name).toContain('QA Table');

    const createCoordinatorGuestResponse = await restFetch(ownerAccessToken, restUrl('guests'), {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        wedding_site_id: weddingSiteId,
        name: `Coordinator Guest ${runId}`,
        email: `coordinator-guest-${runId}@example.com`,
        rsvp_status: 'pending',
      }),
    });
    const createCoordinatorGuestText = await createCoordinatorGuestResponse.text();
    expect(createCoordinatorGuestResponse.ok, createCoordinatorGuestText).toBeTruthy();
    const [createdCoordinatorGuest] = JSON.parse(createCoordinatorGuestText) as Array<{ id: string }>;
    coordinatorGuestId = createdCoordinatorGuest.id;
    expect(coordinatorGuestId).toBeTruthy();

    const allowedCoordinatorCheckInWrite = await restFetch(coordinatorCollaboratorAccessToken, rpcUrl('coordinator_guest_checkin_write'), {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        p_site_id: weddingSiteId,
        p_guest_id: coordinatorGuestId,
        p_checked_in_at: '2026-05-11T20:00:00.000Z',
      }),
    });
    const allowedCoordinatorCheckInWriteText = await allowedCoordinatorCheckInWrite.text();
    expect(allowedCoordinatorCheckInWrite.ok, allowedCoordinatorCheckInWriteText).toBeTruthy();
    const coordinatorCheckedGuest = JSON.parse(allowedCoordinatorCheckInWriteText) as { id: string; checked_in_at: string | null };
    expect(coordinatorCheckedGuest.id).toBe(coordinatorGuestId);
    expect(Date.parse(coordinatorCheckedGuest.checked_in_at ?? '')).toBe(Date.parse('2026-05-11T20:00:00.000Z'));

    const allowedCoordinatorQnaWrite = await restFetch(coordinatorCollaboratorAccessToken, rpcUrl('coordinator_qna_write'), {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        p_site_id: weddingSiteId,
        p_item_id: null,
        p_payload: {
          question: `QA Coordinator Question ${runId}`,
          answer: 'Handled',
          status: 'answered',
          source: 'manual',
        },
      }),
    });
    const allowedCoordinatorQnaWriteText = await allowedCoordinatorQnaWrite.text();
    expect(allowedCoordinatorQnaWrite.ok, allowedCoordinatorQnaWriteText).toBeTruthy();
    const coordinatorQnaItem = JSON.parse(allowedCoordinatorQnaWriteText) as { id: string; question: string; status: string };
    coordinatorQnaItemId = coordinatorQnaItem.id;
    expect(coordinatorQnaItem.question).toContain('QA Coordinator Question');
    expect(coordinatorQnaItem.status).toBe('answered');

    const allowedCoordinatorMediaWrite = await restFetch(coordinatorCollaboratorAccessToken, rpcUrl('builder_media_asset_write'), {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        p_wedding_site_id: weddingSiteId,
        p_asset_id: null,
        p_payload: {
          filename: `qa-coordinator-${runId}.jpg`,
          original_filename: `qa-coordinator-${runId}.jpg`,
          mime_type: 'image/jpeg',
          asset_type: 'image',
          status: 'ready',
          url: `https://example.com/qa-coordinator-${runId}.jpg`,
          thumbnail_url: `https://example.com/qa-coordinator-${runId}-thumb.jpg`,
          width: 1200,
          height: 800,
          size_bytes: 1024,
          alt_text: 'Coordinator proof asset',
          caption: 'Coordinator photo permission proof',
          tags: ['qa', 'coordinator'],
          attached_section_ids: [],
        },
      }),
    });
    const allowedCoordinatorMediaWriteText = await allowedCoordinatorMediaWrite.text();
    expect(allowedCoordinatorMediaWrite.ok, allowedCoordinatorMediaWriteText).toBeTruthy();
    const coordinatorMediaAsset = JSON.parse(allowedCoordinatorMediaWriteText) as { id: string; filename: string };
    coordinatorMediaAssetId = coordinatorMediaAsset.id;
    expect(coordinatorMediaAsset.filename).toContain(`qa-coordinator-${runId}.jpg`);

    const forbiddenCoordinatorMessageWrite = await restFetch(coordinatorCollaboratorAccessToken, rpcUrl('dashboard_message_write'), {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        p_wedding_site_id: weddingSiteId,
        p_message_id: null,
        p_payload: {
          subject: `Forbidden Coordinator Message ${runId}`,
          body: 'Coordinator should not have message permission in this proof.',
          channel: 'email',
          status: 'draft',
        },
      }),
    });
    expect(forbiddenCoordinatorMessageWrite.ok, await forbiddenCoordinatorMessageWrite.text()).toBeFalsy();
    expect([400, 401, 403]).toContain(forbiddenCoordinatorMessageWrite.status);
  } finally {
    await cleanup();
    for (const context of collaboratorContexts) {
      await closeContextSafely(context);
    }
    await closeContextSafely(ownerContext);
  }
});
