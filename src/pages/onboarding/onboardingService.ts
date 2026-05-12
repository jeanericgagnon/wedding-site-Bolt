import { supabase } from '../../lib/supabase';
import { resolveActiveSiteForUser } from '../../lib/activeSite';
import { filterMissingOnboardingEventSeeds } from '../../lib/onboardingEventSync';
import type { InitialSetupAnswers } from '../../lib/initialSetupAnswers';

type WeddingProfilePayload = Record<string, unknown>;

export type OnboardingEventSeed = {
  event_name: string;
  [key: string]: unknown;
};

export type ExistingOnboardingSite = {
  id: string;
  onboarding_answers?: unknown;
  wedding_data?: Record<string, unknown> | null;
};

export type GuidedSetupSite = {
  id: string;
  couple_name_1?: string | null;
  couple_name_2?: string | null;
  wedding_date?: string | null;
  venue_date?: string | null;
  venue_name?: string | null;
  venue_address?: string | null;
  wedding_location?: string | null;
};

export type QuickStartSeedSite = {
  id: string;
  couple_name_1?: string | null;
  couple_name_2?: string | null;
  wedding_date?: string | null;
  venue_name?: string | null;
  venue_location?: string | null;
  onboarding_answers?: unknown;
};

export type QuickStartPersistSite = {
  id: string;
  wedding_data?: Record<string, unknown> | null;
  site_json?: Record<string, unknown> | null;
  active_template_id?: string | null;
  template_id?: string | null;
  wedding_date?: string | null;
  venue_name?: string | null;
  wedding_location?: string | null;
  couple_name_1?: string | null;
  couple_name_2?: string | null;
};

export const GUIDED_SETUP_SITE_SELECT = 'id, couple_name_1, couple_name_2, wedding_date, venue_date, venue_name, venue_address, wedding_location';
export const QUICK_START_SEED_SITE_SELECT = 'id, couple_name_1, couple_name_2, wedding_date, venue_name, venue_location, onboarding_answers';
export const QUICK_START_PERSIST_SITE_SELECT = 'id, wedding_data, site_json, active_template_id, template_id, wedding_date, venue_name, wedding_location, couple_name_1, couple_name_2';

export async function requireAuthenticatedOnboardingUser(): Promise<{ id: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return { id: user.id };
}

export async function fetchExistingOnboardingSite(userId: string): Promise<ExistingOnboardingSite | null> {
  const activeSite = await resolveActiveSiteForUser(userId);
  if (!activeSite?.id) return null;

  const { data } = await supabase
    .from('wedding_sites')
    .select('id, onboarding_answers, wedding_data')
    .eq('id', activeSite.id)
    .maybeSingle();

  return (data as ExistingOnboardingSite | null) ?? null;
}

export async function fetchGuidedSetupSite(userId: string): Promise<GuidedSetupSite | null> {
  const activeSite = await resolveActiveSiteForUser(userId);
  if (!activeSite?.id) return null;

  const { data } = await supabase
    .from('wedding_sites')
    .select(GUIDED_SETUP_SITE_SELECT)
    .eq('id', activeSite.id)
    .maybeSingle();

  return (data as GuidedSetupSite | null) ?? null;
}

export async function updateGuidedSetupSite(params: {
  siteId: string;
  userId: string;
  updateData: Record<string, unknown>;
}): Promise<void> {
  void params.userId;
  const { error } = await supabase.rpc('wedding_site_settings_patch', {
    p_site_id: params.siteId,
    p_patch: params.updateData,
  });

  if (error) throw error;
}

export async function updateWeddingPlanningStatus(params: {
  userId: string;
  updateData: Record<string, unknown>;
}): Promise<void> {
  const activeSite = await resolveActiveSiteForUser(params.userId);
  if (!activeSite?.id) throw new Error('Couldn’t find your wedding site right now.');

  const { error } = await supabase.rpc('wedding_site_settings_patch', {
    p_site_id: activeSite.id,
    p_patch: params.updateData,
  });

  if (error) throw error;
}

export async function fetchQuickStartSeedSite(userId: string): Promise<QuickStartSeedSite | null> {
  const activeSite = await resolveActiveSiteForUser(userId);
  if (!activeSite?.id) return null;

  const { data } = await supabase
    .from('wedding_sites')
    .select(QUICK_START_SEED_SITE_SELECT)
    .eq('id', activeSite.id)
    .maybeSingle();

  return (data as QuickStartSeedSite | null) ?? null;
}

export async function fetchQuickStartPersistSite(userId: string): Promise<QuickStartPersistSite | null> {
  const activeSite = await resolveActiveSiteForUser(userId);
  if (!activeSite?.id) return null;

  const { data, error } = await supabase
    .from('wedding_sites')
    .select(QUICK_START_PERSIST_SITE_SELECT)
    .eq('id', activeSite.id)
    .maybeSingle();

  if (error) throw error;
  return (data as QuickStartPersistSite | null) ?? null;
}

export async function updateQuickStartPersistSite(params: {
  siteId: string;
  updateData: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabase.rpc('wedding_site_settings_patch', {
    p_site_id: params.siteId,
    p_patch: params.updateData,
  });

  if (error) throw error;
}

export async function syncOnboardingEventSeeds(siteId: string, seeds: OnboardingEventSeed[]): Promise<void> {
  if (!seeds.length) return;

  const { data: existingRows, error: existingError } = await supabase
    .from('itinerary_events')
    .select('event_name')
    .eq('wedding_site_id', siteId);
  if (existingError) throw existingError;

  const missingRows = filterMissingOnboardingEventSeeds(
    ((existingRows ?? []) as Array<{ event_name?: string | null }>),
    seeds,
  ).map((seed) => ({ ...seed, wedding_site_id: siteId }));

  if (!missingRows.length) return;

  const { error } = await supabase.rpc('onboarding_event_seed_insert_many', {
    p_wedding_site_id: siteId,
    p_rows: missingRows,
  });
  if (error) throw error;
}

export function mergeOnboardingSeedsIntoWeddingData(
  existingWeddingData: Record<string, unknown> | null | undefined,
  itinerarySeeds: OnboardingEventSeed[],
  rsvpEventSeeds: unknown[],
): Record<string, unknown> {
  const safeExisting = existingWeddingData || {};
  return {
    ...safeExisting,
    meta: {
      ...((safeExisting.meta as Record<string, unknown>) || {}),
      onboardingEventSeeds: itinerarySeeds,
      rsvpEventSeeds,
    },
  };
}

export async function updateExistingOnboardingSite(params: {
  siteId: string;
  userId: string;
  onboardingAnswers: WeddingProfilePayload;
  weddingData: Record<string, unknown>;
}): Promise<void> {
  void params.userId;
  const { error } = await supabase.rpc('wedding_site_settings_patch', {
    p_site_id: params.siteId,
    p_patch: { onboarding_answers: params.onboardingAnswers, wedding_data: params.weddingData },
  });

  if (error) throw error;
}

export async function createOnboardingWeddingSite(params: {
  userId: string;
  insertRow: Record<string, unknown>;
  fallbackRow: Record<string, unknown>;
  itinerarySeeds: OnboardingEventSeed[];
}): Promise<void> {
  void params.fallbackRow;
  const { data: createdSite, error } = await supabase.rpc('wedding_site_bootstrap_write', {
    p_user_id: params.userId,
    p_payload: params.insertRow,
  });
  if (error) throw error;
  if ((createdSite as { id?: string } | null)?.id) {
    await syncOnboardingEventSeeds((createdSite as { id: string }).id, params.itinerarySeeds);
  }
}

export type GuidedSetupGuestImportRow = {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  groupName: string | null;
  plusOne: boolean;
  invitedToCeremony: boolean;
  invitedToReception: boolean;
};

export async function upsertGuidedSetupGuestFromCsv(
  weddingSiteId: string,
  guest: GuidedSetupGuestImportRow,
): Promise<'created' | 'updated'> {
  if (guest.email) {
    const { data: existing, error: existingError } = await supabase
      .from('guests')
      .select('id')
      .eq('wedding_site_id', weddingSiteId)
      .eq('email', guest.email)
      .maybeSingle();
    if (existingError) throw existingError;

    if ((existing as { id?: string } | null)?.id) {
      const { error: updateGuestError } = await supabase.rpc('guest_dashboard_guest_write', {
        p_wedding_site_id: null,
        p_guest_id: (existing as { id: string }).id,
        p_payload: {
          first_name: guest.firstName || null,
          last_name: guest.lastName || null,
          phone: guest.phone || null,
          group_name: guest.groupName,
          plus_one_allowed: guest.plusOne,
          invited_to_ceremony: guest.invitedToCeremony,
          invited_to_reception: guest.invitedToReception,
        },
      });
      if (updateGuestError) throw updateGuestError;
      return 'updated';
    }
  }

  const name = [guest.firstName, guest.lastName].filter(Boolean).join(' ') || guest.email || 'Guest';
  const { error: insertGuestError } = await supabase.rpc('guest_dashboard_guest_write', {
    p_wedding_site_id: weddingSiteId,
    p_guest_id: null,
    p_payload: {
      name,
      first_name: guest.firstName || null,
      last_name: guest.lastName || null,
      email: guest.email || null,
      phone: guest.phone || null,
      group_name: guest.groupName,
      plus_one_allowed: guest.plusOne,
      invited_to_ceremony: guest.invitedToCeremony,
      invited_to_reception: guest.invitedToReception,
      rsvp_status: 'pending',
    },
  });
  if (insertGuestError) throw insertGuestError;
  return 'created';
}

export type ExistingOnboardingAnswers = InitialSetupAnswers;
