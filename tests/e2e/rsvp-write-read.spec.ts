import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

test.skip(process.env.LIVE_RSVP_WRITE_READ !== '1', 'Set LIVE_RSVP_WRITE_READ=1 to verify the live RSVP guest flow.');

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

test('public RSVP token flow loads and reaches the details step for a live invite', async ({ page }) => {
  test.setTimeout(120_000);

  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');

  let token = process.env.V1_RSVP_LIVE_TOKEN || '';
  if (!token) {
    const response = await fetch(`${supabaseUrl}/rest/v1/guests?select=invite_token,invited_to_ceremony,invited_to_reception&invite_token=not.is.null&limit=200`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      signal: AbortSignal.timeout(10_000),
    });
    expect(response.ok).toBeTruthy();
    const guests = await response.json() as Array<{
      invite_token: string | null;
      invited_to_ceremony: boolean | null;
      invited_to_reception: boolean | null;
    }>;
    const baseline = guests.find((guest) => guest.invited_to_ceremony === true && guest.invited_to_reception === true && typeof guest.invite_token === 'string' && guest.invite_token.length > 0)
      || guests.find((guest) => typeof guest.invite_token === 'string' && guest.invite_token.length > 0)
      || null;
    token = baseline?.invite_token ?? '';
  }

  test.skip(!token, 'No live RSVP invite token was discoverable from production data.');

  await page.goto(`/rsvp?token=${encodeURIComponent(token)}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Welcome,/i })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Step 1: Attendance/i)).toBeVisible();
  await page.getByRole('button', { name: /Continue to details/i }).click();
  await expect(page.getByText(/Step 2: Details/i)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /Continue to review/i })).toBeVisible();
});
