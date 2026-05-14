import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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
    let token = '';
    let userId = '';
    for (const [key, value] of Object.entries(window.localStorage)) {
      if (!key.includes('auth-token')) continue;
      try {
        const parsed = JSON.parse(String(value)) as {
          access_token?: string;
          user?: { id?: string };
          currentSession?: { access_token?: string; user?: { id?: string } };
        };
        token = parsed.access_token || parsed.currentSession?.access_token || '';
        userId = parsed.user?.id || parsed.currentSession?.user?.id || '';
        if (token) break;
      } catch {
        // Keep scanning.
      }
    }

    let activeSiteId = '';
    const rawActiveSite = window.localStorage.getItem('dayof_active_site_id_v1');
    if (rawActiveSite) {
      try {
        const parsed = JSON.parse(rawActiveSite) as { siteId?: string } | string;
        activeSiteId = typeof parsed === 'string' ? parsed : parsed.siteId || '';
      } catch {
        activeSiteId = rawActiveSite;
      }
    }

    return { token, userId, activeSiteId };
  });
}

test('coordinator day-of route proves handoff save, issue lifecycle, runner completion, continuity, and snapshot export', async ({ page }) => {
  test.setTimeout(180_000);

  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const runId = process.env.V1_COORDINATOR_DAYOF_LIVE_RUN_ID || `${Date.now()}`;
  const handoffLead = `QA Lead ${runId}`;
  const handoffSupport = `QA Support ${runId}`;
  const handoffNote = `Coordinator QA handoff note ${runId}`;
  const issueTitle = `Coordinator QA issue ${runId}`;
  const issueOwner = `QA owner ${runId}`;
  const nextAction = `Escort household to alternate seating ${runId}`;
  const resolvedOutcome = `Household reseated and runner confirmed closeout ${runId}`;
  const runnerAssignee = `Runner ${runId}`;
  const runnerDetail = `Escort the household to the updated seat map ${runId}`;
  const completionNote = `Runner completion note ${runId}`;
  let ownerAccessToken = '';
  let savedHandoffId = '';
  let createdIssueId = '';
  let restoreHandoff:
    | {
      id: string;
      handoff_status: 'ready' | 'staffed' | 'needs-decision' | 'complete';
      lead_name: string | null;
      support_name: string | null;
      note: string | null;
    }
    | null = null;

  const authHeaders = () => ({
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${ownerAccessToken || supabaseAnonKey}`,
    'Content-Type': 'application/json',
  });

  const restUrl = (table: string, params: Record<string, string> = {}) => {
    const search = new URLSearchParams(params);
    return `${supabaseUrl}/rest/v1/${table}${search.toString() ? `?${search.toString()}` : ''}`;
  };

  const rpcUrl = (fn: string) => `${supabaseUrl}/rest/v1/rpc/${fn}`;

  const restFetch = async (url: string, init: RequestInit = {}) => fetch(url, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(15_000),
  });

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('your@email.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  const authState = await readAuthState(page);
  ownerAccessToken = authState.token;
  expect(ownerAccessToken || supabaseAnonKey).toBeTruthy();

  let activeSiteId = authState.activeSiteId;
  if (!activeSiteId && authState.userId) {
    const siteResponse = await restFetch(restUrl('wedding_sites', {
      select: 'id',
      user_id: `eq.${authState.userId}`,
      order: 'created_at.asc',
      limit: '1',
    }));
    const siteText = await siteResponse.text();
    expect(siteResponse.ok, siteText).toBeTruthy();
    const [siteRow] = JSON.parse(siteText) as Array<{ id: string }>;
    activeSiteId = siteRow?.id ?? '';
  }
  expect(activeSiteId).toBeTruthy();

  const eventResponse = await restFetch(restUrl('itinerary_events', {
    select: 'id,event_name,wedding_site_id',
    wedding_site_id: `eq.${activeSiteId}`,
    order: 'start_time.asc.nullslast',
    limit: '1',
  }));
  const eventText = await eventResponse.text();
  expect(eventResponse.ok, eventText).toBeTruthy();
  const [eventRow] = JSON.parse(eventText) as Array<{
    id: string;
    event_name: string;
    wedding_site_id: string;
  }>;
  expect(eventRow?.id).toBeTruthy();

  const invitedGuestResponse = await restFetch(restUrl('event_invitations', {
    select: 'guest_id',
    event_id: `eq.${eventRow.id}`,
    limit: '250',
  }));
  const invitedGuestText = await invitedGuestResponse.text();
  expect(invitedGuestResponse.ok, invitedGuestText).toBeTruthy();
  const invitedGuestIds = (JSON.parse(invitedGuestText) as Array<{ guest_id: string }>).map((row) => row.guest_id);
  expect(invitedGuestIds.length).toBeGreaterThan(0);

  const seatingEventResponse = await restFetch(restUrl('seating_events', {
    select: 'id',
    itinerary_event_id: `eq.${eventRow.id}`,
    limit: '1',
  }));
  const seatingEventText = await seatingEventResponse.text();
  expect(seatingEventResponse.ok, seatingEventText).toBeTruthy();
  const [seatingEventRow] = JSON.parse(seatingEventText) as Array<{ id: string }>;

  const eventCheckInByGuestId = new Map<string, string | null>();
  if (seatingEventRow?.id) {
    const seatingAssignmentResponse = await restFetch(restUrl('seating_assignments', {
      select: 'guest_id,checked_in_at',
      seating_event_id: `eq.${seatingEventRow.id}`,
      limit: '500',
    }));
    const seatingAssignmentText = await seatingAssignmentResponse.text();
    expect(seatingAssignmentResponse.ok, seatingAssignmentText).toBeTruthy();
    (JSON.parse(seatingAssignmentText) as Array<{ guest_id: string; checked_in_at: string | null }>).forEach((row) => {
      eventCheckInByGuestId.set(row.guest_id, row.checked_in_at);
    });
  }

  const guestResponse = await restFetch(restUrl('guests', {
    select: 'id,name,first_name,last_name,invite_token',
    wedding_site_id: `eq.${eventRow.wedding_site_id}`,
    invite_token: 'not.is.null',
    limit: '250',
  }));
  const guestText = await guestResponse.text();
  expect(guestResponse.ok, guestText).toBeTruthy();
  const guestRows = JSON.parse(guestText) as Array<{
    id: string;
    name: string | null;
    first_name: string | null;
    last_name: string | null;
    invite_token: string | null;
  }>;
  const [guestRow] = guestRows.filter((guest) => (
    invitedGuestIds.includes(guest.id) && !eventCheckInByGuestId.get(guest.id)
  ));
  expect(guestRow?.id).toBeTruthy();
  const guestName = guestRow.name || [guestRow.first_name, guestRow.last_name].filter(Boolean).join(' ').trim();
  expect(guestName).toBeTruthy();
  expect(guestRow.invite_token).toBeTruthy();

  const existingHandoffResponse = await restFetch(restUrl('coordinator_event_handoffs', {
    select: 'id,handoff_status,lead_name,support_name,note',
    wedding_site_id: `eq.${eventRow.wedding_site_id}`,
    itinerary_event_id: `eq.${eventRow.id}`,
    limit: '1',
  }));
  const existingHandoffText = await existingHandoffResponse.text();
  expect(existingHandoffResponse.ok, existingHandoffText).toBeTruthy();
  const [existingHandoff] = JSON.parse(existingHandoffText) as Array<{
    id: string;
    handoff_status: 'ready' | 'staffed' | 'needs-decision' | 'complete';
    lead_name: string | null;
    support_name: string | null;
    note: string | null;
  }>;
  restoreHandoff = existingHandoff ?? null;

  try {
    await page.goto('/dashboard/coordinator?bypassPayment=1&coordinatorDayofProof=1', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Day-of view' })).toBeVisible();
    await expect(page.getByText(/^Staffing handoff$/).first()).toBeVisible();
    await expect(page.getByText(/^Issue desk$/).first()).toBeVisible();
    await expect(page.getByText(/^Guest continuity$/).first()).toBeVisible();
    await expect(page.getByText(/^Runner board$/).first()).toBeVisible();
    await expect(page.getByText(/^Shift snapshot$/).first()).toBeVisible();
    await expect(page.getByText(`Event · ${eventRow.event_name}`)).toBeVisible();

    const qrInput = page.getByPlaceholder('Paste a guest RSVP/check-in URL or invite token');
    await qrInput.fill(guestRow.invite_token ?? '');
    await page.getByRole('button', { name: 'Validate code' }).click();
    await expect(page.getByText(guestName, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirm check-in' })).toBeVisible();

    const handoffCard = page.getByTestId(`coordinator-handoff-card-${eventRow.id}`);
    await expect(handoffCard).toBeVisible();
    await handoffCard.getByTestId(`coordinator-handoff-lead-${eventRow.id}`).fill(handoffLead);
    await handoffCard.getByTestId(`coordinator-handoff-support-${eventRow.id}`).fill(handoffSupport);
    await handoffCard.getByTestId(`coordinator-handoff-note-${eventRow.id}`).fill(handoffNote);
    const handoffSaveResponsePromise = page.waitForResponse((response) => (
      response.url().includes('/rest/v1/rpc/coordinator_event_handoff_write')
      && response.request().method() === 'POST'
    ));
    await handoffCard.getByTestId(`coordinator-handoff-save-${eventRow.id}`).click();
    const handoffSaveResponse = await handoffSaveResponsePromise;
    expect(handoffSaveResponse.ok()).toBeTruthy();
    const savedHandoff = await handoffSaveResponse.json() as { id: string; note: string | null; lead_name: string | null; support_name: string | null };
    savedHandoffId = savedHandoff.id;
    expect(savedHandoff.note).toBe(handoffNote);
    expect(savedHandoff.lead_name).toBe(handoffLead);
    expect(savedHandoff.support_name).toBe(handoffSupport);

    await page.locator('//select[option[@value="checked-in"]]').first().selectOption('all');
    const searchInput = page.getByPlaceholder('Search guest name or RSVP status · Enter checks in the active ready guest');
    await searchInput.fill(guestName);
    await page.getByTestId(`coordinator-checkin-guest-${guestRow.id}`).click();

    await page.getByTestId('coordinator-issue-type').selectOption('manager-decision');
    await page.getByTestId('coordinator-issue-title').fill(issueTitle);
    await page.getByTestId('coordinator-issue-owner').fill(issueOwner);
    await page.getByTestId('coordinator-issue-next-action').fill(nextAction);
    await page.getByTestId('coordinator-issue-assignee').fill('Floor lead');
    await page.getByTestId('coordinator-issue-runner-mode').selectOption('runner');
    await page.getByTestId('coordinator-issue-runner-status').selectOption('assigned');
    await page.getByTestId('coordinator-issue-runner-assignee').fill(runnerAssignee);
    await page.getByTestId('coordinator-issue-runner-detail').fill(runnerDetail);
    await page.getByTestId('coordinator-issue-runner-completion-note').fill(completionNote);
    await page.getByTestId('coordinator-issue-operator-notes').fill(`Coordinator QA operator note ${runId}`);
    const issueCreateResponsePromise = page.waitForResponse((response) => (
      response.url().includes('/rest/v1/rpc/coordinator_issue_log_write')
      && response.request().method() === 'POST'
    ));
    await page.getByTestId('coordinator-issue-save').click();
    const issueCreateResponse = await issueCreateResponsePromise;
    expect(issueCreateResponse.ok()).toBeTruthy();
    const createdIssue = await issueCreateResponse.json() as { id: string };
    createdIssueId = createdIssue.id;

    await expect(page.getByTestId(`coordinator-runner-active-${createdIssueId}`)).toContainText(issueTitle);
    await expect(page.getByTestId(`coordinator-issue-history-${createdIssueId}`)).toContainText(`Owner: ${issueOwner}`);
    await expect(page.getByTestId(`coordinator-issue-history-${createdIssueId}`)).toContainText(`Next: ${nextAction}`);
    await expect(page.getByTestId(`coordinator-continuity-issue-${createdIssueId}`)).toContainText(issueTitle);

    await page.getByTestId('coordinator-issue-status').selectOption('resolved');
    await page.getByTestId('coordinator-issue-runner-status').selectOption('done');
    await page.getByTestId('coordinator-issue-resolved-outcome').fill(resolvedOutcome);
    const issueUpdateResponsePromise = page.waitForResponse((response) => (
      response.url().includes('/rest/v1/rpc/coordinator_issue_log_write')
      && response.request().method() === 'POST'
    ));
    await page.getByTestId('coordinator-issue-save').click();
    const issueUpdateResponse = await issueUpdateResponsePromise;
    expect(issueUpdateResponse.ok()).toBeTruthy();

    await expect(page.getByTestId(`coordinator-runner-complete-${createdIssueId}`)).toContainText(issueTitle);
    await expect(page.getByTestId(`coordinator-runner-complete-${createdIssueId}`)).toContainText(completionNote);
    await expect(page.getByTestId(`coordinator-continuity-issue-${createdIssueId}`)).toContainText(`Owner: ${issueOwner}`);
    await expect(page.getByTestId('coordinator-issue-resolved-outcome')).toHaveValue(resolvedOutcome);

    await page.evaluate(() => {
      Object.defineProperty(window, '__copiedShiftSnapshot', {
        value: '',
        configurable: true,
        writable: true,
      });
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: async (text: string) => {
            Object.defineProperty(window, '__copiedShiftSnapshot', {
              value: text,
              configurable: true,
              writable: true,
            });
          },
        },
        configurable: true,
      });
    });
    await page.getByTestId('coordinator-shift-snapshot-copy').click();
    const copiedSnapshot = await page.evaluate(() => String((window as { __copiedShiftSnapshot?: string }).__copiedShiftSnapshot || ''));
    expect(copiedSnapshot).toContain(handoffNote);
    expect(copiedSnapshot).toContain('No unresolved issues right now.');

    await page.evaluate(() => {
      Object.defineProperty(window, '__printedShiftSnapshotHtml', {
        value: '',
        configurable: true,
        writable: true,
      });
      const fakeDocument = {
        open: () => {},
        write: (html: string) => {
          Object.defineProperty(window, '__printedShiftSnapshotHtml', {
            value: html,
            configurable: true,
            writable: true,
          });
        },
        close: () => {},
      };
      window.open = () => ({
        document: fakeDocument,
        focus: () => {},
        print: () => {},
      }) as Window;
    });
    await page.getByTestId('coordinator-shift-snapshot-print').click();
    const printedSnapshotHtml = await page.evaluate(() => String((window as { __printedShiftSnapshotHtml?: string }).__printedShiftSnapshotHtml || ''));
    expect(printedSnapshotHtml).toContain(handoffNote);
    expect(printedSnapshotHtml).toContain('No unresolved issues right now.');
  } finally {
    if (createdIssueId) {
      const deleteIssueResponse = await restFetch(restUrl('coordinator_issue_logs', { id: `eq.${createdIssueId}` }), {
        method: 'DELETE',
      });
      expect(deleteIssueResponse.ok, await deleteIssueResponse.text()).toBeTruthy();
    }

    if (restoreHandoff) {
      const restoreResponse = await restFetch(rpcUrl('coordinator_event_handoff_write'), {
        method: 'POST',
        body: JSON.stringify({
          p_site_id: eventRow.wedding_site_id,
          p_itinerary_event_id: eventRow.id,
          p_payload: {
            handoff_status: restoreHandoff.handoff_status,
            lead_name: restoreHandoff.lead_name,
            support_name: restoreHandoff.support_name,
            note: restoreHandoff.note,
          },
        }),
      });
      expect(restoreResponse.ok, await restoreResponse.text()).toBeTruthy();
    } else if (savedHandoffId) {
      const deleteHandoffResponse = await restFetch(restUrl('coordinator_event_handoffs', { id: `eq.${savedHandoffId}` }), {
        method: 'DELETE',
      });
      expect(deleteHandoffResponse.ok, await deleteHandoffResponse.text()).toBeTruthy();
    }
  }
});
