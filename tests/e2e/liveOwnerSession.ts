import { expect, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type OwnerAuthState = {
  token: string;
  userId: string;
  activeSiteId: string;
};

type OwnerApiSession = {
  accessToken: string;
  userId: string;
};

const ACTIVE_SITE_STORAGE_KEY = 'dayof_active_site_id_v1';

export function envValue(key: string, fallback = ''): string {
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

export function authHeaders(accessToken = '', supabaseAnonKey = ''): Record<string, string> {
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${accessToken || supabaseAnonKey}`,
    'Content-Type': 'application/json',
  };
}

export function restUrl(baseUrl: string, table: string, params: Record<string, string>): string {
  const search = new URLSearchParams(params);
  return `${baseUrl}/rest/v1/${table}?${search.toString()}`;
}

export async function restFetch(
  url: string,
  headers: Record<string, string>,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      ...headers,
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(10_000),
  });
}

export async function readOwnerAuthState(page: Page): Promise<OwnerAuthState> {
  return page.evaluate(({ activeSiteStorageKey }) => {
    const readTokenState = () => {
      for (const [key, value] of Object.entries(window.localStorage)) {
        if (!key.includes('auth-token')) continue;
        try {
          const parsed = JSON.parse(String(value)) as {
            access_token?: string;
            user?: { id?: string };
            currentSession?: { access_token?: string; user?: { id?: string } };
          };
          const token = parsed.access_token || parsed.currentSession?.access_token || '';
          const userId = parsed.user?.id || parsed.currentSession?.user?.id || '';
          if (token) return { token, userId };
        } catch {
          // Keep scanning other auth envelopes.
        }
      }
      return { token: '', userId: '' };
    };

    const normalizeActiveSiteId = (raw: string | null) => {
      if (!raw) return '';
      const trimmed = raw.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed) as { siteId?: string };
          return typeof parsed.siteId === 'string' ? parsed.siteId.trim() : '';
        } catch {
          return '';
        }
      }
      return trimmed;
    };

    const authState = readTokenState();
    const activeSiteId = normalizeActiveSiteId(window.localStorage.getItem(activeSiteStorageKey));

    return {
      token: authState.token,
      userId: authState.userId,
      activeSiteId,
    };
  }, { activeSiteStorageKey: ACTIVE_SITE_STORAGE_KEY });
}

export async function signInOwnerViaApi(): Promise<OwnerApiSession> {
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
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

export async function signInAsOwner(page: Page): Promise<void> {
  const authState = await readOwnerAuthState(page).catch(() => ({ token: '', userId: '', activeSiteId: '' }));
  if (authState.token) return;

  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';

  await page.goto('/login', { waitUntil: 'domcontentloaded' });

  const emailField = page.getByPlaceholder('your@email.com');
  const passwordField = page.getByPlaceholder('Enter your password');
  const signInButton = page.getByRole('button', { name: /^sign in$/i });

  if (!(await emailField.isVisible().catch(() => false))) {
    const currentPath = new URL(page.url()).pathname;
    if (/^\/(?:dashboard|payment-required|setup|onboarding)/.test(currentPath)) return;
  }

  await emailField.fill(email);
  await passwordField.fill(password);
  await expect(signInButton).toBeEnabled();
  await signInButton.click();

  await expect
    .poll(() => new URL(page.url()).pathname, {
      timeout: 30_000,
      intervals: [500, 1_000, 2_000],
    })
    .toMatch(/^\/(?:dashboard|payment-required|setup|onboarding)/);
}
