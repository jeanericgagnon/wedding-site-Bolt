import { buildCoupleDisplayName } from '../lib/coupleDisplayName';

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
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return 'expired';
  if (expiresAt && expiresAt.getTime() < Date.now()) return 'expired';
  if (invite.status !== 'pending') return 'invalid';

  return 'valid';
}

export function isInviteEmailMatch(userEmail: string | null | undefined, inviteEmail: string | null | undefined): boolean {
  return (userEmail || '').trim().toLowerCase() === (inviteEmail || '').trim().toLowerCase();
}

export function getInviteSiteLabel(invite: {
  site_slug?: string | null;
  couple_name_1?: string | null;
  couple_name_2?: string | null;
} | null | undefined): string {
  if (!invite) return 'this wedding site';

  const coupleName = buildCoupleDisplayName(invite.couple_name_1, invite.couple_name_2);
  if (coupleName) return `${coupleName}' wedding site`;
  if (invite.site_slug) return `${invite.site_slug}.dayof.love`;
  return 'this wedding site';
}

export function getCollaboratorRedirectPath(role?: string | null): string {
  if (role === 'viewer') return '/dashboard/overview';
  if (role === 'coordinator') return '/dashboard/overview';
  if (role === 'planner') return '/dashboard/overview';
  return '/dashboard/overview';
}
