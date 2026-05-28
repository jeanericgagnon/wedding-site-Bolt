export function readGuestAccessTokenFromParams(params: URLSearchParams): string {
  const guestAccessToken = params.get('guest_access_token')?.trim();
  if (guestAccessToken) return guestAccessToken;

  const legacyToken = params.get('token')?.trim();
  if (legacyToken) return legacyToken;

  return '';
}

export function buildGuestAccessTokenStorageKey(slug: string): string {
  return `dayof_guest_access_token_${slug}`;
}

export function readStoredGuestAccessToken(storage: Pick<Storage, 'getItem'>, slug: string): string {
  const nextToken = storage.getItem(buildGuestAccessTokenStorageKey(slug))?.trim();
  if (nextToken) return nextToken;

  const legacyToken = storage.getItem(`dayof_invite_token_${slug}`)?.trim();
  if (legacyToken) return legacyToken;

  return '';
}

export function storeGuestAccessToken(storage: Pick<Storage, 'setItem'>, slug: string, token: string): void {
  storage.setItem(buildGuestAccessTokenStorageKey(slug), token);
}
