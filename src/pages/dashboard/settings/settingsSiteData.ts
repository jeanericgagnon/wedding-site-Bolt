import { supabase } from '../../../lib/supabase';

export const SETTINGS_SITE_SELECT = [
  'id',
  'couple_name_1',
  'couple_name_2',
  'wedding_date',
  'venue_name',
  'active_template_id',
  'site_slug',
  'rsvp_custom_questions',
  'rsvp_meal_config',
  'music_playlist_url',
  'privacy_mode',
  'hide_from_search',
  'guest_access_token',
  'default_language',
  'notification_prefs',
].join(', ');

export type SettingsSiteRow = Record<string, unknown>;
export type SettingsSiteUpdates = Record<string, unknown>;
export type TranslationLanguage = 'es' | 'fr' | 'it' | 'de' | 'pt';

export async function loadSettingsSite(siteId: string): Promise<SettingsSiteRow | null> {
  const { data, error } = await supabase
    .from('wedding_sites')
    .select(SETTINGS_SITE_SELECT)
    .eq('id', siteId)
    .maybeSingle();

  if (error) throw error;
  return (data as SettingsSiteRow | null) ?? null;
}

export async function updateSettingsSite(siteId: string, updates: SettingsSiteUpdates): Promise<void> {
  const { error } = await supabase
    .from('wedding_sites')
    .update(updates)
    .eq('id', siteId);

  if (error) throw error;
}

export async function hashSettingsSitePassword(password: string): Promise<string> {
  const { data, error } = await supabase.rpc('hash_site_password', {
    p_password: password,
  });

  if (error) throw error;
  return data as string;
}

export async function generateSettingsSecureToken(): Promise<string> {
  const { data, error } = await supabase.rpc('generate_secure_token', { byte_length: 32 });

  if (error) throw error;
  return data as string;
}

export async function translateSettingsSiteContent(siteId: string, language: TranslationLanguage): Promise<void> {
  const { data, error } = await supabase.functions.invoke('translate-site-content', {
    body: { siteId, language },
  });

  if (error) throw error;
  const payload = data as { error?: string } | null;
  if (payload?.error) throw new Error(payload.error);
}
