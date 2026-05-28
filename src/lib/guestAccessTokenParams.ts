export function readGuestAccessTokenFromParams(params: URLSearchParams): string {
  const guestAccessToken = params.get('guest_access_token')?.trim();
  if (guestAccessToken) return guestAccessToken;

  const legacyToken = params.get('token')?.trim();
  if (legacyToken) return legacyToken;

  return '';
}
