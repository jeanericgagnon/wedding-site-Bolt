import { supabase } from '../lib/supabase';

export type CollaboratorInviteLookupRow = {
  id: string;
  wedding_site_id: string;
  invite_email: string;
  invite_name: string | null;
  role: string;
  status: string;
  expires_at?: string | null;
};

export type CollaboratorInviteSiteDetails = {
  site_slug?: string | null;
  couple_name_1?: string | null;
  couple_name_2?: string | null;
};

export type CollaboratorInviteInfo = CollaboratorInviteLookupRow & CollaboratorInviteSiteDetails;

export const COLLABORATOR_INVITE_LOOKUP_SELECT = 'id, wedding_site_id, invite_email, invite_name, role, status, expires_at';
export const COLLABORATOR_INVITE_SITE_SELECT = 'site_slug, couple_name_1, couple_name_2';

export async function fetchCollaboratorInviteByToken(token: string): Promise<CollaboratorInviteLookupRow | null> {
  const { data: inviteRows, error } = await supabase
    .from('wedding_site_collaborator_invites')
    .select(COLLABORATOR_INVITE_LOOKUP_SELECT)
    .eq('invite_token', token);

  if (error) throw error;
  return (Array.isArray(inviteRows) ? inviteRows[0] : null) as CollaboratorInviteLookupRow | null;
}

export async function fetchCollaboratorInviteSiteDetails(weddingSiteId: string): Promise<CollaboratorInviteSiteDetails> {
  const { data } = await supabase
    .from('wedding_sites')
    .select(COLLABORATOR_INVITE_SITE_SELECT)
    .eq('id', weddingSiteId)
    .maybeSingle();

  return (data as CollaboratorInviteSiteDetails | null) ?? {};
}

export async function fetchCollaboratorInviteInfo(token: string): Promise<CollaboratorInviteInfo | null> {
  const invite = await fetchCollaboratorInviteByToken(token);
  if (!invite) return null;

  const siteDetails = invite.wedding_site_id
    ? await fetchCollaboratorInviteSiteDetails(invite.wedding_site_id)
    : {};

  return {
    ...invite,
    ...siteDetails,
  };
}

export async function claimCollaboratorInviteByToken(token: string): Promise<void> {
  const { error } = await supabase.rpc('claim_collaborator_invite', {
    p_invite_token: token,
  });

  if (error) throw error;
}
