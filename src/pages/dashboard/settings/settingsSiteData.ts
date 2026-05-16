import { supabase } from '../../../lib/supabase';
import { customerSafeErrorMessage } from '../../../lib/customerSafeError';
import type { PlannerPermissionKey } from '../../../lib/plannerAccess';
import type { LayoutConfigV1 } from '../../../types/layoutConfig';
import type { WeddingDataV1 } from '../../../types/weddingData';

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
  'wedding_data',
  'notification_prefs',
  'is_published',
].join(', ');

export type SettingsSiteRow = Record<string, unknown>;
export type SettingsSiteUpdates = Record<string, unknown>;
export type TranslationLanguage = 'es' | 'fr' | 'it' | 'de' | 'pt';
export type SettingsCollaboratorInviteRow = {
  id: string;
  invite_email: string;
  invite_name: string | null;
  role: string;
  status: string;
  invited_at: string;
  expires_at?: string | null;
  invite_token?: string;
  permissions?: PlannerPermissionKey[];
};
export type SettingsTranslationStatusRow = {
  language?: string | null;
  status?: string | null;
  translated_at?: string | null;
};
export type SettingsTemplateChangeSiteRow = {
  wedding_data: WeddingDataV1 | Record<string, unknown> | null;
  layout_config: LayoutConfigV1 | Record<string, unknown> | null;
  site_json: Record<string, unknown> | null;
};

export type SettingsAuthenticatedUser = {
  id: string;
  email?: string | null;
};

export const SETTINGS_COLLABORATOR_INVITE_SELECT = 'id, invite_email, invite_name, role, status, invited_at, expires_at, invite_token, permissions';
export const SETTINGS_TRANSLATION_STATUS_SELECT = 'language,status,translated_at';
export const SETTINGS_TEMPLATE_CHANGE_SELECT = 'wedding_data, layout_config, site_json';
export const MAX_SETTINGS_COLLABORATOR_INVITES = 200;

export const safeSettingsFunctionError = (value: unknown, fallback: string) => (
  customerSafeErrorMessage(typeof value === 'string' ? value : '', fallback)
);

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
  const { error } = await supabase.rpc('wedding_site_settings_patch', {
    p_wedding_site_id: siteId,
    p_patch: updates,
  });

  if (error) throw error;
}

export async function loadSettingsCollaboratorInvites(siteId: string): Promise<SettingsCollaboratorInviteRow[]> {
  const { data, error } = await supabase
    .from('wedding_site_collaborator_invites')
    .select(SETTINGS_COLLABORATOR_INVITE_SELECT)
    .eq('wedding_site_id', siteId)
    .order('invited_at', { ascending: false })
    .limit(MAX_SETTINGS_COLLABORATOR_INVITES);

  if (error) throw error;
  return (data as SettingsCollaboratorInviteRow[] | null) ?? [];
}

export async function createSettingsCollaboratorInvite(params: {
  weddingSiteId: string;
  inviteEmail: string;
  inviteName: string;
  role: 'planner' | 'coordinator' | 'viewer';
  inviteToken: string;
  invitedBy: string;
  permissions: PlannerPermissionKey[];
}): Promise<SettingsCollaboratorInviteRow> {
  const { data, error } = await supabase.rpc('settings_collaborator_invite_write', {
    p_wedding_site_id: params.weddingSiteId,
    p_payload: {
      invite_email: params.inviteEmail,
      invite_name: params.inviteName,
      role: params.role,
      status: 'pending',
      invite_token: params.inviteToken,
      invited_by: params.invitedBy,
      permissions: params.permissions,
    },
  });

  if (error) throw error;
  return data as SettingsCollaboratorInviteRow;
}

export async function revokeSettingsCollaboratorInvite(inviteId: string, revokedAt = new Date().toISOString()): Promise<void> {
  const { error } = await supabase.rpc('settings_collaborator_invite_revoke', {
    p_invite_id: inviteId,
    p_revoked_at: revokedAt,
  });

  if (error) throw error;
}

export async function loadSettingsTranslationStatuses(
  siteId: string,
  languages: TranslationLanguage[],
): Promise<SettingsTranslationStatusRow[]> {
  const { data, error } = await supabase
    .from('site_translations')
    .select(SETTINGS_TRANSLATION_STATUS_SELECT)
    .eq('wedding_site_id', siteId)
    .in('language', languages);

  if (error) throw error;
  return (data as SettingsTranslationStatusRow[] | null) ?? [];
}

export async function findSettingsSiteBySlug(slug: string): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from('wedding_sites')
    .select('id')
    .eq('site_slug', slug)
    .maybeSingle();

  if (error) throw error;
  return (data as { id: string } | null) ?? null;
}

export async function loadSettingsTemplateChangeSite(siteId: string): Promise<SettingsTemplateChangeSiteRow | null> {
  const { data, error } = await supabase
    .from('wedding_sites')
    .select(SETTINGS_TEMPLATE_CHANGE_SELECT)
    .eq('id', siteId)
    .maybeSingle();

  if (error) throw error;
  return (data as SettingsTemplateChangeSiteRow | null) ?? null;
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
  if (payload?.error) throw new Error(safeSettingsFunctionError(payload.error, 'Couldn’t prepare translation.'));
}

export async function requireSettingsAuthenticatedUser(): Promise<SettingsAuthenticatedUser> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user?.id || !user.email) {
    throw new Error('Couldn’t verify your account email right now.');
  }
  return {
    id: user.id,
    email: user.email,
  };
}

export async function verifySettingsCurrentPassword(email: string, currentPassword: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (error) {
    throw new Error('Current password is incorrect.');
  }
}

export async function updateSettingsAccountPassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
