export function readInviteTokenFromParams(params: URLSearchParams): string {
  const inviteToken = params.get('invite_token')?.trim();
  if (inviteToken) return inviteToken;

  const legacyToken = params.get('token')?.trim();
  if (legacyToken) return legacyToken;

  const uploadToken = params.get('t')?.trim();
  if (uploadToken) return uploadToken;

  return '';
}
