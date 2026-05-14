import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Page } from '@playwright/test';

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
  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('your@email.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
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
