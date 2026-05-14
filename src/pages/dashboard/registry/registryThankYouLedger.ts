import { supabase } from '../../../lib/supabase';
import { normalizeRegistryThankYouLedger, type RegistryThankYouLedger } from '../../../lib/registryLaunchReadiness';

const REGISTRY_THANK_YOU_LEDGER_SITE_SELECT = 'wedding_data' as const;

function buildNextWeddingData(siteData: unknown, ledger: RegistryThankYouLedger) {
  const weddingData = (siteData as { wedding_data?: Record<string, unknown> | null } | null)?.wedding_data ?? {};
  const registry = (weddingData.registry as Record<string, unknown> | undefined) ?? {};
  return {
    ...weddingData,
    registry: {
      ...registry,
      thankYouLedger: ledger,
    },
  };
}

export async function loadRegistryThankYouLedger(weddingSiteId: string): Promise<RegistryThankYouLedger> {
  const { data, error } = await supabase
    .from('wedding_sites')
    .select(REGISTRY_THANK_YOU_LEDGER_SITE_SELECT)
    .eq('id', weddingSiteId)
    .maybeSingle();
  if (error) throw error;
  const rawLedger = ((data?.wedding_data as Record<string, unknown> | null)?.registry as Record<string, unknown> | undefined)?.thankYouLedger;
  return normalizeRegistryThankYouLedger(rawLedger);
}

export async function saveRegistryThankYouLedger(weddingSiteId: string, ledger: RegistryThankYouLedger): Promise<void> {
  const { data: siteData, error: loadError } = await supabase
    .from('wedding_sites')
    .select(REGISTRY_THANK_YOU_LEDGER_SITE_SELECT)
    .eq('id', weddingSiteId)
    .maybeSingle();
  if (loadError) throw loadError;

  const nextWeddingData = buildNextWeddingData(siteData, ledger);
  let { error } = await supabase.rpc('wedding_site_settings_patch', {
    p_wedding_site_id: weddingSiteId,
    p_patch: { wedding_data: nextWeddingData },
  });

  if (error?.message?.includes('wedding_data')) {
    const fallback = await supabase.rpc('wedding_site_settings_patch', {
      p_wedding_site_id: weddingSiteId,
      p_patch: {},
    });
    error = fallback.error;
  }

  if (error) throw error;
}

