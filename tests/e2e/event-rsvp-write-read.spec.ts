import { expect, test } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

test.skip(process.env.LIVE_EVENT_RSVP_WRITE_READ !== '1', 'Set LIVE_EVENT_RSVP_WRITE_READ=1 to create, event-RSVP, verify, and delete production QA guests.');

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

test('public event RSVP writes per-event answers and reloads saved details', async ({ page }) => {
  test.setTimeout(120_000);
  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const proofSiteSlug = process.env.V1_PROOF_SITE_SLUG || 'maya-and-leo';
  const cleanupOnlyRunId = process.env.LIVE_EVENT_RSVP_CLEANUP_RUN_ID;
  const runId = cleanupOnlyRunId || process.env.LIVE_EVENT_RSVP_RUN_ID || `${Date.now()}`;
  const inviteToken = `event-rsvp-qa-${runId}`;
  const guest = {
    name: `Emerson EventQA ${runId}`,
    email: `dayof.eventrsvp.${runId}@example.com`,
    dietary: `Vegetarian QA ${runId}`,
    notes: `Event RSVP note ${runId}`,
  };
  const artifactDir = join(process.cwd(), '.tmp', 'e2e-artifacts', 'event-rsvp-write-read');
  mkdirSync(artifactDir, { recursive: true });
  const csvPath = join(artifactDir, `event-rsvp-write-read-${runId}.csv`);

  let ownerAccessToken = '';

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

  const loginOwner = async () => {
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
  };

  const fetchQaGuestRows = async () => {
    const response = await restFetch(restUrl('guests', {
      select: 'id,email,rsvp_status',
      email: `eq.${guest.email}`,
    }));
    expect(response.ok).toBeTruthy();
    return await response.json() as Array<{ id: string; email: string; rsvp_status: string | null }>;
  };

  const cleanupQaGuest = async () => {
    const rows = await fetchQaGuestRows();
    for (const row of rows) {
      await restFetch(restUrl('rsvps', { guest_id: `eq.${row.id}` }), { method: 'DELETE' });
      await restFetch(restUrl('event_invitations', { guest_id: `eq.${row.id}` }), { method: 'DELETE' });
      await restFetch(restUrl('guests', { id: `eq.${row.id}` }), { method: 'DELETE' });
    }
    expect(await fetchQaGuestRows()).toHaveLength(0);
  };

  await loginOwner();

  if (cleanupOnlyRunId) {
    await cleanupQaGuest();
    return;
  }

  const sitesResponse = await restFetch(restUrl('wedding_sites', {
    select: 'id',
    site_slug: `eq.${proofSiteSlug}`,
    limit: '1',
  }));
  expect(sitesResponse.ok).toBeTruthy();
  const [site] = await sitesResponse.json() as Array<{ id: string }>;
  expect(site?.id).toBeTruthy();

  const eventsResponse = await restFetch(restUrl('itinerary_events', {
    select: 'id,event_name,event_date',
    wedding_site_id: `eq.${site.id}`,
    order: 'event_date.asc',
  }));
  expect(eventsResponse.ok).toBeTruthy();
  const itineraryEvents = await eventsResponse.json() as Array<{ id: string; event_name: string; event_date: string | null }>;
  expect(itineraryEvents.length).toBeGreaterThanOrEqual(2);
  const eventNames = itineraryEvents.slice(0, 2).map((event) => event.event_name);

  writeFileSync(
    csvPath,
    [
      'Full Name;Email;Invite Token;Invited Events;RSVP Status',
      `${guest.name};${guest.email};${inviteToken};${eventNames.join('|')};Pending`,
    ].join('\n'),
  );

  try {
    await page.goto(`/dashboard/guests?bypassPayment=1&eventRsvpImportE2e=${runId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Guests & RSVP' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import Guests' })).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles(csvPath);
    await expect(page.getByRole('heading', { name: 'Match columns' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue to Review' }).click();
    await expect(page.getByRole('heading', { name: 'Review Import' })).toBeVisible();
    await expect(page.getByText('1 guest ready to import', { exact: true })).toBeVisible();
    await expect(page.getByText('2 event invites')).toBeVisible();
    await page.getByRole('button', { name: 'Import 1 Guest' }).click();
    await expect(page.getByText(/Imported 1 guest\b/i)).toBeVisible();

    await page.goto(`/events?token=${encodeURIComponent(inviteToken)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: new RegExp(`Hello, ${guest.name}!`) })).toBeVisible();
    await expect(page.getByRole('button', { name: 'RSVP for this event' })).toHaveCount(2);

    await page.getByRole('button', { name: 'RSVP for this event' }).first().click();
    await page.getByPlaceholder('e.g., Vegetarian, Gluten-free, Nut allergy').fill(guest.dietary);
    await page.getByPlaceholder('Any special requests or messages for the couple').fill(guest.notes);
    await page.getByRole('button', { name: 'Submit RSVP' }).click();
    await expect(page.getByText("You're in!")).toBeVisible();
    await expect(page.getByText(guest.dietary)).toHaveCount(0);
    await page.waitForTimeout(2300);

    await page.getByRole('button', { name: 'RSVP for this event' }).first().click();
    await page.getByRole('button', { name: "Can't make it" }).click();
    await page.getByRole('button', { name: 'Submit RSVP' }).click();
    await expect(page.getByText('Response saved')).toBeVisible();
    await page.waitForTimeout(2300);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'Update my RSVP' })).toHaveCount(2);
    await page.getByRole('button', { name: 'Update my RSVP' }).first().click();
    await expect(page.getByPlaceholder('e.g., Vegetarian, Gluten-free, Nut allergy')).toHaveValue(guest.dietary);
    await expect(page.getByPlaceholder('Any special requests or messages for the couple')).toHaveValue(guest.notes);
    await page.getByRole('button', { name: 'Cancel' }).click();

    const [savedGuest] = await fetchQaGuestRows();
    expect(savedGuest).toMatchObject({ email: guest.email, rsvp_status: 'confirmed' });

    const invitationsResponse = await restFetch(restUrl('event_invitations', {
      select: 'id,event_id,itinerary_events(event_name)',
      guest_id: `eq.${savedGuest.id}`,
    }));
    expect(invitationsResponse.ok).toBeTruthy();
    const invitations = await invitationsResponse.json() as Array<{ id: string; event_id: string; itinerary_events: { event_name: string } | null }>;
    expect(invitations).toHaveLength(2);

    const eventRsvpsResponse = await restFetch(restUrl('event_rsvps', {
      select: 'event_invitation_id,attending,dietary_restrictions,notes',
      event_invitation_id: `in.(${invitations.map((invitation) => invitation.id).join(',')})`,
    }));
    expect(eventRsvpsResponse.ok).toBeTruthy();
    const eventRsvps = await eventRsvpsResponse.json() as Array<{ event_invitation_id: string; attending: boolean; dietary_restrictions: string | null; notes: string | null }>;
    expect(eventRsvps).toHaveLength(2);
    expect(eventRsvps).toEqual(expect.arrayContaining([
      expect.objectContaining({ attending: true, dietary_restrictions: guest.dietary, notes: guest.notes }),
      expect.objectContaining({ attending: false, dietary_restrictions: null, notes: null }),
    ]));
  } finally {
    await cleanupQaGuest();
  }
});
