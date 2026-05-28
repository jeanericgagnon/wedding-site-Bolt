export function readInviteTokenFromParams(params: URLSearchParams): string {
  const inviteToken = params.get('invite_token')?.trim();
  if (inviteToken) return inviteToken;

  const legacyToken = params.get('token')?.trim();
  if (legacyToken) return legacyToken;

  const uploadToken = params.get('t')?.trim();
  if (uploadToken) return uploadToken;

  return '';
}

export function buildCanonicalInviteTokenSearch(params: URLSearchParams): string {
  const inviteToken = readInviteTokenFromParams(params);
  const nextParams = new URLSearchParams(params);

  nextParams.delete('token');
  nextParams.delete('t');

  if (inviteToken) {
    nextParams.set('invite_token', inviteToken);
  } else {
    nextParams.delete('invite_token');
  }

  const nextSearch = nextParams.toString();
  return nextSearch ? `?${nextSearch}` : '';
}
