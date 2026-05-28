export function buildCollaboratorInviteUrl(origin: string, inviteToken: string): string {
  const baseOrigin = origin.replace(/\/+$/, '');
  return `${baseOrigin}/accept-collaborator-invite?invite_token=${encodeURIComponent(inviteToken)}`;
}

export function buildMaskedCollaboratorInvitePath(): string {
  return '/accept-collaborator-invite?invite_token=••••••••••';
}
