export type InviteRecord = {
  status: string;
  expires_at?: string | null;
};

export type InviteValidationState = 'valid' | 'invalid' | 'expired' | 'accepted' | 'revoked';

export function resolveInviteValidationState(invite: InviteRecord | null | undefined): InviteValidationState {
  if (!invite) return 'invalid';
  if (invite.status === 'revoked') return 'revoked';
  if (invite.status === 'accepted') return 'accepted';

  const expiresAt = invite.expires_at ? new Date(invite.expires_at) : null;
  if (expiresAt && expiresAt.getTime() < Date.now()) return 'expired';
  if (invite.status !== 'pending') return 'invalid';

  return 'valid';
}

export function isInviteEmailMatch(userEmail: string | null | undefined, inviteEmail: string | null | undefined): boolean {
  return (userEmail || '').trim().toLowerCase() === (inviteEmail || '').trim().toLowerCase();
}

export function getCollaboratorRedirectPath(): string {
  return '/dashboard/overview';
}
