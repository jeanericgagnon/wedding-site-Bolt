import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

test.skip(process.env.LIVE_INTERNAL_ERROR_LOG_PROOF !== '1', 'Set LIVE_INTERNAL_ERROR_LOG_PROOF=1 to trigger a harmless Edge Function failure and verify internal log readback.');

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

test('harmless Edge Function failure is logged internally without secret-looking details', async ({ page }) => {
  test.setTimeout(90_000);
  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const proofSiteSlug = process.env.V1_PROOF_SITE_SLUG || 'maya-and-leo';
  const runId = process.env.LIVE_INTERNAL_ERROR_LOG_RUN_ID || `${Date.now()}`;
  const message = `QA harmless Edge Function failure ${runId}`;
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
    headers: { ...authHeaders(), ...(init.headers || {}) },
    signal: AbortSignal.timeout(15_000),
  });

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

  const failingResponse = await fetch(`${supabaseUrl}/functions/v1/guest-recap-config?site=not-a-real-site-${runId}`, {
    headers: { apikey: supabaseAnonKey },
    signal: AbortSignal.timeout(15_000),
  });
  const failingPayload = await failingResponse.json().catch(() => ({}));
  expect(failingResponse.ok).toBe(false);

  const logResponse = await fetch(`${supabaseUrl}/functions/v1/log-client-error`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      source: 'edge-function',
      severity: 'warning',
      route: '/dashboard/overview',
      message,
      weddingSiteId: site.id,
      metadata: {
        functionName: 'guest-recap-config',
        status: failingResponse.status,
        error: typeof failingPayload.error === 'string' ? failingPayload.error.slice(0, 80) : 'request failed',
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const logPayload = await logResponse.json().catch(() => ({}));
  expect(logResponse.ok, JSON.stringify(logPayload)).toBeTruthy();

  const logRow = await expect.poll(async () => {
    const response = await restFetch(restUrl('app_error_logs', {
      select: 'id,source,severity,route,message,metadata',
      wedding_site_id: `eq.${site.id}`,
      message: `eq.${message}`,
      limit: '1',
    }));
    expect(response.ok).toBeTruthy();
    const [row] = await response.json() as Array<{
      source: string;
      severity: string;
      route: string | null;
      message: string;
      metadata: Record<string, unknown>;
    }>;
    return row ?? null;
  }, { timeout: 20_000 }).not.toBeNull().then(async () => {
    const response = await restFetch(restUrl('app_error_logs', {
      select: 'id,source,severity,route,message,metadata',
      wedding_site_id: `eq.${site.id}`,
      message: `eq.${message}`,
      limit: '1',
    }));
    const [row] = await response.json() as Array<{
      source: string;
      severity: string;
      route: string | null;
      message: string;
      metadata: Record<string, unknown>;
    }>;
    return row;
  });

  expect(logRow).toMatchObject({
    source: 'edge-function',
    severity: 'warning',
    route: '/dashboard/overview',
    message,
  });
  const serialized = JSON.stringify(logRow);
  expect(serialized).not.toMatch(/sk-proj|OPENAI_API_KEY|SUPABASE_SERVICE_ROLE|sbp_|Bearer\s+[A-Za-z0-9._-]+/i);
});
