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

const { invokeMock, rpcMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
    from: vi.fn(),
    rpc: rpcMock,
  },
}));

describe('vaultService', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    rpcMock.mockReset();
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

  it('clears dashboard load timeout timers after the vault load settles', () => {
    const dataHook = readFileSync(join(process.cwd(), 'src/pages/dashboard/useVaultDashboardData.ts'), 'utf8');

    expect(dataHook).toContain('async function runVaultDashboardTimed<T>(task: Promise<T>, timeoutMs: number): Promise<T> {');
    expect(dataHook).toContain("timeoutId = window.setTimeout(() => reject(new Error('Vault dashboard load timed out.')), timeoutMs);");
    expect(dataHook).toContain('if (timeoutId) window.clearTimeout(timeoutId);');
    expect(dataHook).toContain('return await Promise.race([task, timeout]);');
  });

  it('clears stale vault dashboard state when the active user disappears', () => {
    const dataHook = readFileSync(join(process.cwd(), 'src/pages/dashboard/useVaultDashboardData.ts'), 'utf8');

    expect(dataHook).toContain('const resetVaultDashboardState = useCallback(() => {');
    expect(dataHook).toContain("setVaultStorageProvider('supabase');");
    expect(dataHook).toContain('setDriveHealthMessage(null);');
    expect(dataHook).toContain("setCoupleName1('Partner');");
    expect(dataHook).toContain('if (!userId) {\n        resetVaultDashboardState();\n        return;\n      }');
  });

  it('clears real-site identity and drive health state when loading demo vault mode', () => {
    const dataHook = readFileSync(join(process.cwd(), 'src/pages/dashboard/useVaultDashboardData.ts'), 'utf8');

    expect(dataHook).toContain('setDriveHealthChecking(false);');
    expect(dataHook).toContain('setDriveHealthMessage(null);');
    expect(dataHook).toContain('setDriveNeedsReconnect(false);');
    expect(dataHook).toContain('setCoupleEmail(null);');
    expect(dataHook).toContain("setCoupleName1(demoSite.couple_name_1 || 'Partner');");
    expect(dataHook).toContain("setCoupleName2(demoSite.couple_name_2 || 'Partner');");
    expect(dataHook).toContain("setCoupleName1('Alex');");
    expect(dataHook).toContain("setCoupleName2('Jordan');");
  });

  it('clears stale vault date and drive health state when loading a real site', () => {
    const dataHook = readFileSync(join(process.cwd(), 'src/pages/dashboard/useVaultDashboardData.ts'), 'utf8');

    expect(dataHook).toContain('setGoogleDriveConnected(!!site.vault_google_drive_connected);\n      setConnectingDrive(false);\n      setDriveHealthChecking(false);\n      setDriveHealthMessage(null);\n      setDriveNeedsReconnect(false);');
    expect(dataHook).toContain('setWeddingDate(toValidDateOrNull(site.wedding_date ?? null));');
    expect(dataHook).not.toContain('if (site.wedding_date) setWeddingDate(toValidDateOrNull(site.wedding_date));');
  });

  it('ignores stale vault dashboard loads after a newer load starts', () => {
    const dataHook = readFileSync(join(process.cwd(), 'src/pages/dashboard/useVaultDashboardData.ts'), 'utf8');

    expect(dataHook).toContain('const loadRequestIdRef = useRef(0);');
    expect(dataHook).toContain('const requestId = ++loadRequestIdRef.current;');
    expect(dataHook).toContain('const isCurrentLoad = () => requestId === loadRequestIdRef.current;');
    expect(dataHook).toContain("const { site: demoSite, configs, entries: demoEntries } = await loadDemoVaultDashboardData('alex-jordan-demo');\n        if (!isCurrentLoad()) return;");
    expect(dataHook).toContain('if (isCurrentLoad()) toastRef.current(\'Couldn’t sync dayof as the active vault home right now.\', \'error\');');
    expect(dataHook).toContain('if (!isCurrentLoad()) return;\n\n      if (!site)');
    expect(dataHook).toContain('if (!isCurrentLoad()) return;\n      resetVaultDashboardState();');
    expect(dataHook).toContain('if (isCurrentLoad()) setLoading(false);');
  });

  it('scopes vault release notices to the active wedding site', () => {
    const dataHook = readFileSync(join(process.cwd(), 'src/pages/dashboard/useVaultDashboardData.ts'), 'utf8');
    const storage = readFileSync(join(process.cwd(), 'src/pages/dashboard/vaultReleaseNoticeStorage.ts'), 'utf8');

    expect(storage).toContain('export const buildVaultReleaseNoticeStorageKey = (storageKey: string, storageScope?: string | null): string => {');
    expect(storage).toContain('return scope ? `${storageKey}::${scope}` : storageKey;');
    expect(dataHook).toContain('const storageKey = buildVaultReleaseNoticeStorageKey(VAULT_RELEASE_NOTICE_KEY, weddingSiteId);');
    expect(dataHook).toContain('const notified = readVaultReleaseNoticeKeys(storageKey);');
    expect(dataHook).toContain('writeVaultReleaseNoticeKeys(storageKey, Array.from(new Set(next)));');
  });

  it('clears stale vault entry save errors once the owner edits the note again', () => {
    const card = readFileSync(join(process.cwd(), 'src/pages/dashboard/VaultCard.tsx'), 'utf8');

    expect(card).toContain('const clearEntryError = () => setError(null);');
    expect(card).toContain("onChange={(e) => { clearEntryError(); setTitle(e.target.value); }}");
    expect(card).toContain("onChange={(e) => { clearEntryError(); setAuthorName(e.target.value); }}");
    expect(card).toContain("onChange={(e) => { clearEntryError(); setContent(e.target.value); }}");
    expect(card).toContain("onChange={(e) => { clearEntryError(); setAttachmentUrl(e.target.value); }}");
    expect(card).toContain("onChange={(e) => { clearEntryError(); setAttachmentName(e.target.value); }}");
  });

  it('rehydrates the vault entry draft when the active vault config changes', () => {
    const card = readFileSync(join(process.cwd(), 'src/pages/dashboard/VaultCard.tsx'), 'utf8');

    expect(card).toContain('function getDefaultVaultEntryTitle(durationYears: number) {');
    expect(card).toContain('const [title, setTitle] = useState(() => getDefaultVaultEntryTitle(durationYears));');
    expect(card).toContain('useEffect(() => {');
    expect(card).toContain('setTitle(getDefaultVaultEntryTitle(durationYears));');
    expect(card).toContain("setAuthorName('You');");
    expect(card).toContain('setAttachmentUrl(\'\');');
    expect(card).toContain('setAttachmentName(\'\');');
    expect(card).toContain('}, [vaultConfigId, durationYears]);');
  });

  it('shows visible fallback state when vault share-link copy downloads instead of copying', () => {
    const card = readFileSync(join(process.cwd(), 'src/pages/dashboard/VaultCard.tsx'), 'utf8');

    expect(card).toContain("const [shareLinkNotice, setShareLinkNotice] = useState<'copied' | 'downloaded' | null>(null);");
    expect(card).toContain("const [recapLinkNotice, setRecapLinkNotice] = useState<'copied' | 'downloaded' | null>(null);");
    expect(card).toContain("setShareLinkNotice(result);");
    expect(card).toContain("setRecapLinkNotice(result);");
    expect(card).toContain("shareLinkNotice === 'downloaded'");
    expect(card).toContain("'Downloaded share link'");
    expect(card).toContain("'Copied share link'");
    expect(card).toContain("recapLinkNotice === 'downloaded' ? 'Downloaded recap link'");
  });

  it('clears stale recap-link copy state when recap settings or generation change the source recap', () => {
    const card = readFileSync(join(process.cwd(), 'src/pages/dashboard/VaultCard.tsx'), 'utf8');

    expect(card).toContain('const clearRecapLinkNotice = () => setRecapLinkNotice(null);');
    expect(card).toContain('}, [recapStyle, recapLength, photosOnlyRecap]);');
    expect(card).toContain('clearRecapLinkNotice();\n    setGeneratingRecap(true);');
  });

  it('routes vault owner writes through RPCs instead of raw client table mutations', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/vaultService.ts'), 'utf8');

    expect(source).toContain("supabase.rpc('wedding_site_vault_provider_patch'");
    expect(source).toContain("supabase.rpc('vault_config_write'");
    expect(source).toContain("supabase.rpc('vault_seed_starter_configs'");
    expect(source).toContain("supabase.rpc('vault_entry_write'");
    expect(source).toContain("supabase.rpc('vault_entry_delete'");
    expect(source).toContain("supabase.rpc('vault_config_delete'");
    expect(source).not.toContain(".from('vault_configs')\n    .insert(");
    expect(source).not.toContain(".from('vault_configs')\n    .update(");
    expect(source).not.toContain(".from('vault_entries')\n    .insert(");
    expect(source).not.toContain(".from('vault_entries')\n    .update(");
    expect(source).not.toContain(".from('vault_entries').delete()");
  });

  it('keeps the config delete path atomic on the server side', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/vaultService.ts'), 'utf8');
    expect(source).toContain('void deletedEntries;');
    expect(source).toContain("supabase.rpc('vault_config_delete'");
    expect(source).not.toContain("supabase.from('vault_entries').insert(buildVaultEntryRollbackRows");
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
