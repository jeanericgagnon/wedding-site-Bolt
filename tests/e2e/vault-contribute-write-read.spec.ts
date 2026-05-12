import { expect, test } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

test.skip(process.env.LIVE_VAULT_CONTRIBUTE_WRITE_READ !== '1', 'Set LIVE_VAULT_CONTRIBUTE_WRITE_READ=1 to save, verify, and delete a production QA vault entry.');

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

test('public vault contribution saves a hosted photo attachment and owner-scoped readback/delete works', async ({ page }) => {
  test.setTimeout(120_000);
  const email = process.env.V1_OWNER_EMAIL || 'test@gmail.com';
  const password = process.env.V1_OWNER_PASSWORD || '12345678';
  const supabaseUrl = envValue('VITE_SUPABASE_URL', 'https://atuzuobpprjstfmdnwso.supabase.co');
  const supabaseAnonKey = envValue('VITE_SUPABASE_ANON_KEY');
  const proofSiteSlug = process.env.V1_PROOF_SITE_SLUG || 'maya-and-leo';
  const cleanupOnlyRunId = process.env.LIVE_VAULT_CLEANUP_RUN_ID;
  const runId = cleanupOnlyRunId || process.env.LIVE_VAULT_RUN_ID || `${Date.now()}`;
  const title = `Vault QA ${runId}`;
  const author = `Vault Tester ${runId}`;
  const message = `Vault contribution write/read QA ${runId}`;
  const artifactDir = join(process.cwd(), '.tmp', 'e2e-artifacts', 'vault-contribute-write-read');
  mkdirSync(artifactDir, { recursive: true });
  const imagePath = join(artifactDir, `vault-qa-${runId}.png`);
  writeFileSync(imagePath, Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
    'base64',
  ));

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

  const cleanupQaEntries = async () => {
    await restFetch(restUrl('vault_entries', { title: `eq.${title}` }), { method: 'DELETE' });
    const remaining = await restFetch(restUrl('vault_entries', {
      select: 'id',
      title: `eq.${title}`,
    }));
    expect(remaining.ok).toBeTruthy();
    expect(await remaining.json()).toHaveLength(0);
  };

  await loginOwner();
  await cleanupQaEntries();
  if (cleanupOnlyRunId) return;

  try {
    await page.goto(`/vault/${proofSiteSlug}/1?vaultQaOpen=1&vaultWriteQa=${runId}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /anniversary vault/i })).toBeVisible();
    await page.getByPlaceholder('For example: Aunt Sarah, The Johnsons, Your college roommate').fill(author);
    await page.getByPlaceholder('For example: Advice for year one, A wish for you both…').fill(title);
    await page.getByPlaceholder(/Write something meaningful/i).fill(message);
    await page.locator('select').selectOption('photo');
    await page.locator('input[type="file"]').setInputFiles(imagePath);
    await expect(page.getByText('Ready to save: 1 file will be added with your vault note.')).toBeVisible();
    await page.getByPlaceholder('e.g. Engagement video, Voice memo').fill('QA hosted photo');
    await page.getByRole('button', { name: 'Save in vault' }).click();
    await expect(page.getByRole('heading', { name: 'Saved for later' })).toBeVisible({ timeout: 30_000 });

    const entriesResponse = await restFetch(restUrl('vault_entries', {
      select: 'id,title,content,author_name,attachment_url,attachment_name,media_type,mime_type,size_bytes,storage_provider',
      title: `eq.${title}`,
    }));
    expect(entriesResponse.ok).toBeTruthy();
    const entries = await entriesResponse.json() as Array<{
      id: string;
      title: string;
      content: string;
      author_name: string;
      attachment_url: string | null;
      attachment_name: string | null;
      media_type: string | null;
      mime_type: string | null;
      size_bytes: number | null;
      storage_provider: string | null;
    }>;
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      title,
      content: message,
      author_name: author,
      attachment_name: 'vault-qa-' + runId + '.png',
      media_type: 'photo',
      mime_type: 'image/png',
      storage_provider: 'supabase',
    });
    expect(entries[0].attachment_url).toContain('/storage/v1/object/public/vault-attachments/');
    expect(entries[0].size_bytes ?? 0).toBeGreaterThan(0);

    await page.goto('/dashboard/vault?bypassPayment=1&vaultOwnerQa=' + runId, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Vaults' })).toBeVisible();
    await expect(page.getByText('Private notes and memories for later.')).toBeVisible();
    await expect(page.getByText(/maya-and-leo\.dayof\.love/i)).toBeVisible();

    await restFetch(restUrl('vault_entries', { title: `eq.${title}` }), { method: 'DELETE' });
    const afterDeleteResponse = await restFetch(restUrl('vault_entries', {
      select: 'id',
      title: `eq.${title}`,
    }));
    expect(afterDeleteResponse.ok).toBeTruthy();
    expect(await afterDeleteResponse.json()).toHaveLength(0);
  } finally {
    await cleanupQaEntries();
  }
});
