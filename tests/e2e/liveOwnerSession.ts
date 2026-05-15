import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Page } from '@playwright/test';

export type OwnerApiSession = {
  accessToken: string;
  userId: string;
};

export function envValue(key: string, fallback = '') {
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

export async function signInAsOwner(page: Page) {
  const { email, password } = ownerCredentials();
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('your@email.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export function ownerCredentials() {
  return {
    email: process.env.V1_OWNER_EMAIL || 'test@gmail.com',
    password: process.env.V1_OWNER_PASSWORD || '12345678',
  };
}

export async function signInOwnerViaApi(): Promise<OwnerApiSession> {
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const { email, password } = ownerCredentials();
  const signInUrl = new URL('/auth/v1/token', supabaseUrl);
  signInUrl.searchParams.set('grant_type', 'password');

  const response = await fetch(signInUrl, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  expect(response.ok, text).toBeTruthy();
  const parsed = JSON.parse(text) as {
    access_token?: string;
    user?: { id?: string };
  };
  expect(parsed.access_token).toBeTruthy();
  expect(parsed.user?.id).toBeTruthy();

  return {
    accessToken: parsed.access_token!,
    userId: parsed.user!.id!,
  };
}

export async function readOwnerAuthState(page: Page) {
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

export function authHeaders(accessToken: string, anonKey: string) {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${accessToken || anonKey}`,
    'Content-Type': 'application/json',
  };
}

export function restUrl(supabaseUrl: string, table: string, params: Record<string, string> = {}) {
  const search = new URLSearchParams(params);
  return `${supabaseUrl}/rest/v1/${table}${search.toString() ? `?${search.toString()}` : ''}`;
}

export async function restFetch(url: string, headers: Record<string, string>, init: RequestInit = {}) {
  return fetch(url, {
    ...init,
    headers: {
      ...headers,
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(15_000),
  });
}
