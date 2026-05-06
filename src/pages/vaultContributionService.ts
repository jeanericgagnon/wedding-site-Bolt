import { supabase } from '../lib/supabase';

export const VAULT_CONTRIBUTION_CONFIG_SELECT = 'id, label, duration_years, is_enabled';

export interface VaultContributionConfigInfo {
  id: string;
  label: string;
  duration_years: number;
  is_enabled: boolean;
}

export async function loadEnabledVaultContributionConfig(
  weddingSiteId: string,
  durationYears: number,
): Promise<VaultContributionConfigInfo | null> {
  const { data, error } = await supabase
    .from('vault_configs')
    .select(VAULT_CONTRIBUTION_CONFIG_SELECT)
    .eq('wedding_site_id', weddingSiteId)
    .eq('duration_years', durationYears)
    .eq('is_enabled', true)
    .maybeSingle();

  if (error) throw error;
  return (data as VaultContributionConfigInfo | null) ?? null;
}

export async function listEnabledVaultContributionConfigs(
  weddingSiteId: string,
): Promise<VaultContributionConfigInfo[]> {
  const { data, error } = await supabase
    .from('vault_configs')
    .select(VAULT_CONTRIBUTION_CONFIG_SELECT)
    .eq('wedding_site_id', weddingSiteId)
    .eq('is_enabled', true)
    .order('duration_years', { ascending: true });

  if (error) throw error;
  return ((data ?? []) as VaultContributionConfigInfo[]).sort((a, b) => a.duration_years - b.duration_years);
}
