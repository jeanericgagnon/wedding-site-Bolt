import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

test.skip(process.env.LIVE_GUEST_CONTACT_UPDATE_WRITE_READ !== '1', 'Set LIVE_GUEST_CONTACT_UPDATE_WRITE_READ=1 to create, update, verify, and delete production QA guests.');

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

test('guest contact page updates RSVP, address, SMS consent, and household members', async ({ page }) => {
  test.setTimeout(120_000);

  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const proofSiteSlug = process.env.V1_PROOF_SITE_SLUG || 'maya-and-leo';
  const runId = process.env.LIVE_GUEST_CONTACT_UPDATE_RUN_ID || `${Date.now()}`;
  const householdId = randomUUID();
  const lastName = `ContactQA${runId}`;
  const primaryEmail = `dayof.contactqa.${runId}.primary@example.com`;
  const partnerEmail = `dayof.contactqa.${runId}.partner@example.com`;
  const phoneLast4 = '0999';
  let ownerAccessToken = '';
  let siteId = '';
  let createdGuestIds: string[] = [];

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

  const fetchQaRows = async () => {
    const response = await restFetch(restUrl('guests', {
      select: 'id,name,email,phone,rsvp_status,household_id,sms_consent,mailing_address_line1,mailing_city,mailing_state,mailing_postal_code,mailing_country',
      household_id: `eq.${householdId}`,
      order: 'email.asc',
    }));
    expect(response.ok).toBeTruthy();
    return await response.json() as Array<{
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      rsvp_status: string | null;
      household_id: string | null;
      sms_consent: boolean | null;
      mailing_address_line1: string | null;
      mailing_city: string | null;
      mailing_state: string | null;
      mailing_postal_code: string | null;
      mailing_country: string | null;
    }>;
  };

  const cleanupQaGuests = async () => {
    const rows = await fetchQaRows().catch(() => []);
    for (const row of rows) {
      await restFetch(restUrl('guests', { id: `eq.${row.id}` }), { method: 'DELETE' });
    }
    createdGuestIds = [];
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

  await cleanupQaGuests();

  try {
    const insertResponse = await restFetch(`${supabaseUrl}/rest/v1/guests`, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify([
        {
          wedding_site_id: siteId,
          first_name: 'Taylor',
          last_name: lastName,
          name: `Taylor ${lastName}`,
          email: primaryEmail,
          phone: '5555550999',
          rsvp_status: 'pending',
          household_id: householdId,
        },
        {
          wedding_site_id: siteId,
          first_name: 'Morgan',
          last_name: lastName,
          name: `Morgan ${lastName}`,
          email: partnerEmail,
          phone: null,
          rsvp_status: 'pending',
          household_id: householdId,
        },
      ]),
    });
    expect(insertResponse.ok).toBeTruthy();
    const inserted = await insertResponse.json() as Array<{ id: string }>;
    createdGuestIds = inserted.map((row) => row.id);
    expect(createdGuestIds).toHaveLength(2);

    await page.goto(`/guest-contact/${proofSiteSlug}?contactQa=${runId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /update contact & rsvp/i })).toBeVisible();
    await page.getByPlaceholder(/search your full name/i).fill(`Taylor ${lastName}`);
    await page.getByPlaceholder(/first few letters of your email/i).fill('primary');
    await page.getByRole('button', { name: /^find$/i }).click();
    await expect(page.getByRole('combobox').first()).toContainText(`Taylor ${lastName}`);
    await expect(page.getByText(/apply these updates to my whole party \(2 guests\)/i)).toBeVisible();

    await page.getByPlaceholder('Last 4 digits of your phone (for whole-party updates)').fill(phoneLast4);
    await page.getByRole('button', { name: /^find$/i }).click();
    await page.getByLabel(/apply these updates to my whole party/i).check();
    await page.getByPlaceholder('you@example.com').fill(`updated.contactqa.${runId}@example.com`);
    await page.getByPlaceholder('(555) 123-4567').fill('+15555550123');
    await page.getByPlaceholder('Address line 1').fill(`123 QA Lane ${runId}`);
    await page.getByPlaceholder('City').fill('Testville');
    await page.getByPlaceholder('State / Province').fill('CA');
    await page.getByPlaceholder('ZIP / Postal code').fill('90210');
    await page.getByPlaceholder('Country').fill('USA');
    await page.getByRole('combobox').nth(1).selectOption('confirmed');
    await page.getByLabel(/i agree to receive wedding updates by sms/i).check();
    await page.getByRole('button', { name: /^save update$/i }).click();
    await expect(page.getByText(/thanks! your information has been updated/i)).toBeVisible();

    const rows = await fetchQaRows();
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row).toMatchObject({
        phone: '+15555550123',
        rsvp_status: 'confirmed',
        sms_consent: true,
        mailing_address_line1: `123 QA Lane ${runId}`,
        mailing_city: 'Testville',
        mailing_state: 'CA',
        mailing_postal_code: '90210',
        mailing_country: 'USA',
      });
    }
  } finally {
    await cleanupQaGuests();
  }
});
