import { describe, expect, it } from 'vitest';
import {
  buildGuestAccessTokenStorageKey,
  readGuestAccessTokenFromParams,
  readStoredGuestAccessToken,
  storeGuestAccessToken,
} from './guestAccessTokenParams';

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

  it('builds a dedicated storage key for guest access continuity', () => {
    expect(buildGuestAccessTokenStorageKey('maya-leo')).toBe('dayof_guest_access_token_maya-leo');
  });

  it('prefers the dedicated stored guest access token over the legacy invite token key', () => {
    const storage = {
      getItem: (key: string) => {
        if (key === 'dayof_guest_access_token_maya-leo') return 'new-stored-access';
        if (key === 'dayof_invite_token_maya-leo') return 'legacy-stored-access';
        return null;
      },
    };

    expect(readStoredGuestAccessToken(storage, 'maya-leo')).toBe('new-stored-access');
  });

  it('falls back to the legacy invite token storage key for backward compatibility', () => {
    const storage = {
      getItem: (key: string) => (key === 'dayof_invite_token_maya-leo' ? 'legacy-stored-access' : null),
    };

    expect(readStoredGuestAccessToken(storage, 'maya-leo')).toBe('legacy-stored-access');
  });

  it('stores guest access continuity under the dedicated key', () => {
    const writes: Array<[string, string]> = [];
    const storage = {
      setItem: (key: string, value: string) => {
        writes.push([key, value]);
      },
    };

    storeGuestAccessToken(storage, 'maya-leo', 'stored-access');

    expect(writes).toEqual([['dayof_guest_access_token_maya-leo', 'stored-access']]);
  });
});
