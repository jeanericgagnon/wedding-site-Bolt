import { resolveActiveSiteForUser } from '../../lib/activeSite';
import { supabase } from '../../lib/supabase';

export const VAULT_CONFIG_SELECT = [
  'id',
  'wedding_site_id',
  'vault_index',
  'label',
  'duration_years',
  'is_enabled',
  'unlock_at',
  'unlock_schedule_finalized_at',
  'created_at',
  'updated_at',
].join(', ');

export const VAULT_ENTRY_SELECT = [
  'id',
  'wedding_site_id',
  'vault_config_id',
  'vault_year',
  'title',
  'content',
  'author_name',
  'attachment_url',
  'attachment_name',
  'media_type',
  'storage_provider',
  'external_file_id',
  'external_file_url',
  'unlock_at',
  'mime_type',
  'size_bytes',
  'duration_seconds',
  'created_at',
].join(', ');

const VAULT_SITE_SELECT = [
  'id',
  'wedding_date',
  'site_slug',
  'vault_storage_provider',
  'vault_google_drive_connected',
  'couple_name_1',
  'couple_name_2',
].join(', ');

export const MAX_VAULT_CONFIG_ROWS = 25;
export const MAX_VAULT_ENTRY_ROWS = 1000;

export interface VaultConfig {
  id: string;
  vault_index: number;
  label: string;
  duration_years: number;
  is_enabled: boolean;
}

export interface VaultEntry {
  id: string;
  vault_config_id: string | null;
  vault_year: number;
  title: string;
  content: string;
  author_name: string;
  attachment_url: string | null;
  attachment_name: string | null;
  media_type?: 'text' | 'photo' | 'video' | 'voice' | null;
  storage_provider?: 'supabase' | 'google_drive' | null;
  external_file_id?: string | null;
  external_file_url?: string | null;
  unlock_at?: string | null;
  created_at: string;
}

export interface VaultSiteSummary {
  id: string;
  wedding_date: string | null;
  site_slug: string | null;
  vault_storage_provider?: string | null;
  vault_google_drive_connected?: boolean | null;
  couple_name_1?: string | null;
  couple_name_2?: string | null;
}

export interface VaultDashboardData {
  site: VaultSiteSummary | null;
  configs: VaultConfig[];
  entries: VaultEntry[];
}

export interface NewVaultEntry {
  vault_config_id: string;
  vault_year: number;
  title: string;
  content: string;
  author_name: string;
  attachment_url: string | null;
  attachment_name: string | null;
}

export async function resolveVaultEntryLink(entryId: string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke('vault-resolve-entry-link', {
    body: { entryId },
  });
  if (error) throw error;
  return (data as { url?: string | null } | null)?.url ?? null;
}

export async function checkVaultGoogleDriveHealth(siteId: string): Promise<{
  healthy?: boolean;
  needsReconnect?: boolean;
  message?: string;
} | null> {
  const { data, error } = await supabase.functions.invoke('google-drive-health', {
    body: { siteId },
  });
  if (error) throw error;
  return (data as { healthy?: boolean; needsReconnect?: boolean; message?: string } | null) ?? null;
}

export async function startVaultGoogleDriveAuth(siteId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('google-drive-auth-start', {
    body: { siteId },
  });
  if (error) throw error;
  const authUrl = (data as { authUrl?: string } | null)?.authUrl;
  if (!authUrl) throw new Error('Missing Google OAuth URL.');
  return authUrl;
}

export async function finishVaultGoogleDriveAuth(code: string, state: string): Promise<{
  connected?: boolean;
  connectedAt?: string | null;
} | null> {
  const { data, error } = await supabase.functions.invoke('google-drive-auth-callback', {
    body: { code, state },
  });
  if (error) throw error;
  return (data as { connected?: boolean; connectedAt?: string | null } | null) ?? null;
}

export async function loadVaultConfigsAndEntries(weddingSiteId: string): Promise<Pick<VaultDashboardData, 'configs' | 'entries'>> {
  const { data: configData, error: configError } = await supabase
    .from('vault_configs')
    .select(VAULT_CONFIG_SELECT)
    .eq('wedding_site_id', weddingSiteId)
    .order('duration_years', { ascending: true })
    .limit(MAX_VAULT_CONFIG_ROWS);

  if (configError) throw configError;

  const configs = (configData ?? []) as unknown as VaultConfig[];
  if (configs.length === 0) {
    return { configs, entries: [] };
  }

  const { data: entryData, error: entryError } = await supabase
    .from('vault_entries')
    .select(VAULT_ENTRY_SELECT)
    .in('vault_config_id', configs.map((config) => config.id))
    .order('created_at', { ascending: true })
    .limit(MAX_VAULT_ENTRY_ROWS);

  if (entryError) throw entryError;

  return {
    configs,
    entries: (entryData ?? []) as unknown as VaultEntry[],
  };
}

export async function loadVaultDashboardData(userId: string): Promise<VaultDashboardData> {
  const activeSite = await resolveActiveSiteForUser(userId);
  const { data: site, error: siteError } = await supabase
    .from('wedding_sites')
    .select(VAULT_SITE_SELECT)
    .eq('id', activeSite?.id ?? '')
    .maybeSingle();

  if (siteError) throw siteError;
  if (!site) {
    return { site: null, configs: [], entries: [] };
  }

  const siteSummary = site as unknown as VaultSiteSummary;
  const { configs, entries } = await loadVaultConfigsAndEntries(siteSummary.id);
  return {
    site: siteSummary,
    configs,
    entries,
  };
}

export async function loadDemoVaultDashboardData(siteSlug = 'alex-jordan-demo'): Promise<VaultDashboardData> {
  const { data: site, error: siteError } = await supabase
    .from('wedding_sites')
    .select(VAULT_SITE_SELECT)
    .eq('site_slug', siteSlug)
    .maybeSingle();

  if (siteError) throw siteError;
  if (!site) {
    return { site: null, configs: [], entries: [] };
  }

  const siteSummary = site as unknown as VaultSiteSummary;
  const { configs, entries } = await loadVaultConfigsAndEntries(siteSummary.id);
  return {
    site: siteSummary,
    configs,
    entries,
  };
}

export async function ensureHostedVaultProvider(siteId: string): Promise<void> {
  const { error } = await supabase.rpc('wedding_site_vault_provider_patch', {
    p_wedding_site_id: siteId,
    p_payload: { vault_storage_provider: 'supabase' },
  });

  if (error) throw error;
}

export async function createVaultConfig(input: {
  weddingSiteId: string;
  vaultIndex: number;
  label: string;
  durationYears: number;
}): Promise<VaultConfig> {
  const { data, error } = await supabase.rpc('vault_config_write', {
    p_wedding_site_id: input.weddingSiteId,
    p_config_id: null,
    p_payload: {
      vault_index: input.vaultIndex,
      label: input.label,
      duration_years: input.durationYears,
      is_enabled: true,
    },
  });

  if (error) throw error;
  return data as unknown as VaultConfig;
}

export async function seedStarterVaultConfigs(weddingSiteId: string): Promise<VaultConfig[]> {
  const { data, error } = await supabase.rpc('vault_seed_starter_configs', {
    p_wedding_site_id: weddingSiteId,
  });

  if (error) throw error;
  return (data ?? []) as unknown as VaultConfig[];
}

export async function updateVaultEnabled(configId: string, enabled: boolean): Promise<void> {
  const { error } = await supabase.rpc('vault_config_write', {
    p_wedding_site_id: null,
    p_config_id: configId,
    p_payload: {
      is_enabled: enabled,
    },
  });

  if (error) throw error;
}

export async function updateVaultConfig(input: { id: string; label: string; durationYears: number }): Promise<void> {
  const { error } = await supabase.rpc('vault_config_write', {
    p_wedding_site_id: null,
    p_config_id: input.id,
    p_payload: {
      label: input.label,
      duration_years: input.durationYears,
    },
  });

  if (error) throw error;
}

export async function updateVaultRecapDraft(input: {
  entryId: string;
  title: string;
  content: string;
  authorName: string;
}): Promise<void> {
  const { error } = await supabase.rpc('vault_entry_write', {
    p_wedding_site_id: null,
    p_entry_id: input.entryId,
    p_payload: {
      title: input.title,
      content: input.content,
      author_name: input.authorName,
    },
  });

  if (error) throw error;
}

export async function createVaultEntry(weddingSiteId: string, entry: NewVaultEntry): Promise<VaultEntry> {
  const { data, error } = await supabase.rpc('vault_entry_write', {
    p_wedding_site_id: weddingSiteId,
    p_entry_id: null,
    p_payload: {
      ...entry,
    },
  });

  if (error) throw error;
  return data as unknown as VaultEntry;
}

export async function deleteVaultEntry(id: string): Promise<void> {
  const { error } = await supabase.rpc('vault_entry_delete', {
    p_entry_id: id,
  });
  if (error) throw error;
}

export function buildVaultEntryRollbackRows(entries: VaultEntry[]): VaultEntry[] {
  return entries.map(({ id, created_at, ...entry }) => ({
    id,
    created_at,
    ...entry,
  }));
}

export async function deleteVaultConfigWithEntryRollback(configId: string, deletedEntries: VaultEntry[]): Promise<void> {
  void deletedEntries;
  const { error } = await supabase.rpc('vault_config_delete', {
    p_config_id: configId,
  });
  if (error) throw error;
}
