import { describe, expect, it } from 'vitest';

import { readInviteTokenFromParams } from './inviteTokenParams';

describe('readInviteTokenFromParams', () => {
  it('prefers the guest-safe invite_token parameter when present', () => {
    const params = new URLSearchParams('invite_token=new-link&token=old-link&t=legacy-upload');

    expect(readInviteTokenFromParams(params)).toBe('new-link');
  });

  it('falls back to legacy guest-link parameters for continuity', () => {
    expect(readInviteTokenFromParams(new URLSearchParams('token=legacy-link'))).toBe('legacy-link');
    expect(readInviteTokenFromParams(new URLSearchParams('t=legacy-upload'))).toBe('legacy-upload');
  });

  it('returns an empty string when no invite token is present', () => {
    expect(readInviteTokenFromParams(new URLSearchParams('site=demo'))).toBe('');
  });
});
