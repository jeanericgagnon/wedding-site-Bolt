import { supabase } from '../lib/supabase';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return String(error);
}

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

export type CollaboratorInviteAuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

export type CollaboratorInviteAuthResult = {
  user: CollaboratorInviteAuthUser;
  sessionReady: boolean;
};

export const COLLABORATOR_INVITE_LOOKUP_SELECT = 'id, wedding_site_id, invite_email, invite_name, role, status, expires_at';
export const COLLABORATOR_INVITE_SITE_SELECT = 'site_slug, couple_name_1, couple_name_2';

export function normalizeCollaboratorInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

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

export async function hasCollaboratorInviteSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

export async function signInCollaboratorInviteAccount(email: string, password: string): Promise<CollaboratorInviteAuthResult> {
  const normalizedEmail = normalizeCollaboratorInviteEmail(email);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) throw error;
  if (!data.user) {
    throw new Error('Signed in, but your user session was not ready. Please try again.');
  }

  return {
    user: data.user as CollaboratorInviteAuthUser,
    sessionReady: !!data.session,
  };
}

export async function createCollaboratorInviteAccount(
  email: string,
  password: string,
  fullName: string,
): Promise<CollaboratorInviteAuthUser> {
  const normalizedEmail = normalizeCollaboratorInviteEmail(email);
  const trimmedFullName = fullName.trim();
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        name: trimmedFullName,
        full_name: trimmedFullName,
      },
    },
  });

  if (signUpError) throw signUpError;

  let signedInUser = authData.user as CollaboratorInviteAuthUser | null;
  if (!authData.session) {
    try {
      const signInResult = await signInCollaboratorInviteAccount(normalizedEmail, password);
      signedInUser = signInResult.user;
    } catch (error) {
      const message = getErrorMessage(error).toLowerCase();
      if (message.includes('invalid login credentials')) {
        throw new Error('Account creation did not complete cleanly. Please press Create account and join team once more, or use a fresh invited email.');
      }
      if (message.includes('email not confirmed') || message.includes('email_not_confirmed')) {
        throw new Error(`Account created for ${normalizedEmail}. Check your email to confirm your address, then come back to this invite link to finish joining.`);
      }
      throw error;
    }
  }

  if (!signedInUser) {
    throw new Error('Account created. Please sign in from this page to finish accepting the invite.');
  }

  return signedInUser;
}
