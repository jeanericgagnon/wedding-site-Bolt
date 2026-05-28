import { describe, expect, it } from 'vitest';
import { readGuestAccessTokenFromParams } from './guestAccessTokenParams';

describe('readGuestAccessTokenFromParams', () => {
  it('prefers the explicit guest_access_token parameter when present', () => {
    const params = new URLSearchParams('guest_access_token=new-access&token=legacy-access');
    expect(readGuestAccessTokenFromParams(params)).toBe('new-access');
  });

  it('accepts legacy token links for backward compatibility', () => {
    expect(readGuestAccessTokenFromParams(new URLSearchParams('token=legacy-access'))).toBe('legacy-access');
  });

  it('returns an empty string when no guest access token is present', () => {
    expect(readGuestAccessTokenFromParams(new URLSearchParams('invite_token=guest-invite'))).toBe('');
  });
});
