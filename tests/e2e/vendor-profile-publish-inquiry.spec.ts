import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

test.skip(process.env.LIVE_VENDOR_PROFILE_PUBLISH_INQUIRY !== '1', 'Set LIVE_VENDOR_PROFILE_PUBLISH_INQUIRY=1 to publish a QA vendor page, submit an inquiry, verify readback, and clean up.');

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

test('owner publishes vendor profile variant and public inquiry is readable', async ({ page }) => {
  test.setTimeout(120_000);
  const rpcLogs: Array<{ url: string; status: number; body: string }> = [];
  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const runId = process.env.LIVE_VENDOR_PROFILE_RUN_ID || `${Date.now()}`;
  const vendorName = `DayOf QA Floral ${runId}`;
  const slugBase = `dayof-qa-floral-${runId}`;
  const inquiryName = `Vendor Inquiry QA ${runId}`;
  const inquiryEmail = `vendor.inquiry.${runId}@example.com`;
  const inquiryMessage = `We are checking availability for a garden wedding QA run ${runId}.`;
  let ownerAccessToken = '';

  page.on('response', async (response) => {
    const url = response.url();
    if (!url.includes('/rest/v1/rpc/')) return;
    if (!url.includes('vendor_profile_write')) return;
    let body = '';
    try {
      body = await response.text();
    } catch {
      body = '<unreadable>';
    }
    rpcLogs.push({
      url,
      status: response.status(),
      body: body.slice(0, 500),
    });
    console.error(`[vendor-profile-rpc] ${response.status()} ${url} ${body.slice(0, 200)}`);
  });

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
    headers: { ...authHeaders(), ...(init.headers || {}) },
    signal: AbortSignal.timeout(15_000),
  });
  const cleanup = async () => {
    const profilesResponse = await restFetch(restUrl('vendor_profiles', {
      select: 'id',
      slug: `like.${slugBase}%`,
    }));
    if (!profilesResponse.ok) return;
    const profiles = await profilesResponse.json() as Array<{ id: string }>;
    for (const profile of profiles) {
      await restFetch(restUrl('vendor_profile_inquiries', { vendor_profile_id: `eq.${profile.id}` }), { method: 'DELETE' });
      await restFetch(restUrl('vendor_profiles', { id: `eq.${profile.id}` }), { method: 'DELETE' });
    }
  };
  const getPublishedProfile = async () => {
    const profileResponse = await restFetch(restUrl('vendor_profiles', {
      select: 'id,slug,vendor_name,source_payload',
      slug: `eq.${slugBase}`,
      limit: '1',
    }));
    const profileText = await profileResponse.text();
    expect(profileResponse.ok, profileText).toBeTruthy();
    const [profile] = JSON.parse(profileText) as Array<{ id: string; slug: string; vendor_name: string; source_payload: { template_id?: string } | null }>;
    return profile ?? null;
  };
  const getInquiry = async (vendorProfileId: string) => {
    const inquiryResponse = await restFetch(restUrl('vendor_profile_inquiries', {
      select: 'id,vendor_profile_id,name,email,message',
      vendor_profile_id: `eq.${vendorProfileId}`,
      email: `eq.${inquiryEmail}`,
      limit: '1',
    }));
    const inquiryText = await inquiryResponse.text();
    expect(inquiryResponse.ok, inquiryText).toBeTruthy();
    const [inquiry] = JSON.parse(inquiryText) as Array<{ vendor_profile_id: string; name: string; email: string; message: string }>;
    return inquiry ?? null;
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
  await cleanup();

  try {
    await page.goto(`/vendor-profile-v1?vendorProfileQa=${runId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Start a page' })).toBeVisible();
    await page.getByLabel('Name').fill(vendorName);
    await page.getByLabel('Website link').fill(`https://dayof.love/?vendorProfileQa=${runId}`);
    await page.getByLabel('Email').fill(`qa-vendor-${runId}@example.com`);
    await page.getByLabel('Page style').selectOption('photography');
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('heading', { name: 'Edit', exact: true })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /Florals and decor/i }).click();
    await page.locator('#vendor-draft-slug').fill(slugBase);
    await page.getByRole('button', { name: 'Save page' }).click();

    const profile = await expect.poll(getPublishedProfile, { timeout: 20_000 }).not.toBeNull().then(getPublishedProfile);
    expect(profile).toMatchObject({ slug: slugBase, vendor_name: vendorName });
    expect(profile.source_payload?.template_id).toBe('floral');

    await page.goto(`/vendor/${slugBase}?vendorInquiryQa=${runId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: vendorName })).toBeVisible();
    await page.getByPlaceholder('Your name').fill(inquiryName);
    await page.getByPlaceholder('Email').fill(inquiryEmail);
    await page.getByPlaceholder('What are you looking for?').fill(inquiryMessage);
    await page.getByRole('button', { name: 'Send inquiry' }).click();
    await expect(page.getByText('Inquiry sent. We saved your message for follow-up.')).toBeVisible({ timeout: 20_000 });

    const inquiry = await expect.poll(() => getInquiry(profile.id), { timeout: 20_000 }).not.toBeNull().then(() => getInquiry(profile.id));
    expect(inquiry).toMatchObject({
      vendor_profile_id: profile.id,
      name: inquiryName,
      email: inquiryEmail,
      message: inquiryMessage,
    });

    await page.goto(`/vendor-templates?vendorInquiryReadbackQa=${runId}`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Refresh|Refreshing/i }).click();
    await expect(page.getByText(inquiryName)).toBeVisible();
    await expect(page.getByText(inquiryMessage)).toBeVisible();
  } finally {
    if (rpcLogs.length > 0) {
      console.error(`[vendor-profile-rpc-summary] ${JSON.stringify(rpcLogs, null, 2)}`);
    }
    await cleanup();
  }
});
