import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildVaultEntryRollbackRows,
  checkVaultGoogleDriveHealth,
  finishVaultGoogleDriveAuth,
  MAX_VAULT_CONFIG_ROWS,
  MAX_VAULT_ENTRY_ROWS,
  resolveVaultEntryLink,
  startVaultGoogleDriveAuth,
  VAULT_CONFIG_SELECT,
  VAULT_ENTRY_SELECT,
  type VaultEntry,
} from './vaultService';

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
    from: vi.fn(),
  },
}));

describe('vaultService', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it('uses explicit projections for vault dashboard data', () => {
    expect(VAULT_CONFIG_SELECT).toContain('id');
    expect(VAULT_CONFIG_SELECT).toContain('wedding_site_id');
    expect(VAULT_CONFIG_SELECT).toContain('duration_years');
    expect(VAULT_CONFIG_SELECT).not.toContain('*');

    expect(VAULT_ENTRY_SELECT).toContain('vault_config_id');
    expect(VAULT_ENTRY_SELECT).toContain('author_name');
    expect(VAULT_ENTRY_SELECT).toContain('attachment_url');
    expect(VAULT_ENTRY_SELECT).not.toContain('*');
  });

  it('preserves entry ids and timestamps when building rollback rows', () => {
    const entries: VaultEntry[] = [
      {
        id: 'entry-1',
        vault_config_id: 'vault-1',
        vault_year: 5,
        title: 'Year five',
        content: 'Keep this',
        author_name: 'Guest',
        attachment_url: null,
        attachment_name: null,
        media_type: 'text',
        created_at: '2026-05-05T20:00:00.000Z',
      },
    ];

    expect(buildVaultEntryRollbackRows(entries)).toEqual(entries);
  });

  it('exports stable vault dashboard query caps', () => {
    expect(MAX_VAULT_CONFIG_ROWS).toBe(25);
    expect(MAX_VAULT_ENTRY_ROWS).toBe(1000);
  });

  it('keeps vault dashboard config and entry reads bounded', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/vaultService.ts'), 'utf8');

    expect(source).toContain('MAX_VAULT_CONFIG_ROWS = 25');
    expect(source).toContain('MAX_VAULT_ENTRY_ROWS = 1000');
    expect(source).toContain(".order('duration_years', { ascending: true })\n    .limit(MAX_VAULT_CONFIG_ROWS);");
    expect(source).toContain(".order('created_at', { ascending: true })\n    .limit(MAX_VAULT_ENTRY_ROWS);");
  });

  it('keeps vault edge function invokes behind the vault service', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/dashboard/Vault.tsx'), 'utf8');
    const card = readFileSync(join(process.cwd(), 'src/pages/dashboard/VaultCard.tsx'), 'utf8');
    const dataHook = readFileSync(join(process.cwd(), 'src/pages/dashboard/useVaultDashboardData.ts'), 'utf8');
    const service = readFileSync(join(process.cwd(), 'src/pages/dashboard/vaultService.ts'), 'utf8');

    expect(page).toContain('resolveVaultEntryLink={resolveVaultEntryLinkFromService}');
    expect(dataHook).toContain('checkVaultGoogleDriveHealth(weddingSiteId)');
    expect(dataHook).toContain('startVaultGoogleDriveAuth(weddingSiteId)');
    expect(dataHook).toContain('finishVaultGoogleDriveAuth(googleCode, googleState)');
    expect(card).toContain('const safeUrl = getSafePublicWebUrl(await resolveVaultEntryLink(entry.id));');
    expect(page).not.toContain("supabase.functions.invoke('vault-resolve-entry-link'");
    expect(page).not.toContain("supabase.functions.invoke('google-drive-health'");
    expect(page).not.toContain("supabase.functions.invoke('google-drive-auth-start'");
    expect(page).not.toContain("supabase.functions.invoke('google-drive-auth-callback'");
    expect(service).toContain("supabase.functions.invoke('vault-resolve-entry-link'");
    expect(service).toContain("supabase.functions.invoke('google-drive-health'");
    expect(service).toContain("supabase.functions.invoke('google-drive-auth-start'");
    expect(service).toContain("supabase.functions.invoke('google-drive-auth-callback'");
  });

  it('resolves vault entry links through the service', async () => {
    invokeMock.mockResolvedValueOnce({ data: { url: 'https://example.com/file.jpg' }, error: null });
    await expect(resolveVaultEntryLink('entry-1')).resolves.toBe('https://example.com/file.jpg');
  });

  it('reads drive health and auth flow responses through the service', async () => {
    invokeMock.mockResolvedValueOnce({ data: { healthy: true, needsReconnect: false, message: 'ok' }, error: null });
    await expect(checkVaultGoogleDriveHealth('site-1')).resolves.toEqual({ healthy: true, needsReconnect: false, message: 'ok' });

    invokeMock.mockResolvedValueOnce({ data: { authUrl: 'https://example.com/oauth' }, error: null });
    await expect(startVaultGoogleDriveAuth('site-1')).resolves.toBe('https://example.com/oauth');

    invokeMock.mockResolvedValueOnce({ data: { connected: true, success: true, connectedAt: '2026-05-07T22:41:00.000Z' }, error: null });
    await expect(finishVaultGoogleDriveAuth('code-1', 'state-1')).resolves.toEqual({
      connected: true,
      success: true,
      connectedAt: '2026-05-07T22:41:00.000Z',
    });
  });
});
