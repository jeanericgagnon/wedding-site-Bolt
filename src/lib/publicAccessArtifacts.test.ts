import { describe, expect, it } from 'vitest';
import {
  resolveGuestIdentityArtifacts,
  resolvePublicAccessArtifacts,
} from './publicAccessArtifacts';

describe('resolvePublicAccessArtifacts', () => {
  it('prefers the current invite token and keeps the stored password session', () => {
    expect(
      resolvePublicAccessArtifacts({
        searchParams: new URLSearchParams('token=current-invite'),
        storedInviteToken: 'stored-invite',
        storedPasswordSession: 'password-session',
      }),
    ).toEqual({
      inviteToken: 'current-invite',
      passwordSession: 'password-session',
    });
  });

  it('falls back to the stored invite token for gated guest-hub clicks', () => {
    expect(
      resolvePublicAccessArtifacts({
        searchParams: new URLSearchParams(''),
        storedInviteToken: 'stored-invite',
      }),
    ).toEqual({
      inviteToken: 'stored-invite',
      passwordSession: null,
    });
  });
});

describe('resolveGuestIdentityArtifacts', () => {
  it('pulls guest-specific invite identity from the current URL or stored guest scope', () => {
    expect(
      resolveGuestIdentityArtifacts({
        searchParams: new URLSearchParams('invite_token=current-guest-invite'),
        storedGuestInviteToken: 'stored-guest-invite',
      }),
    ).toEqual({
      guestInviteToken: 'current-guest-invite',
    });

    expect(
      resolveGuestIdentityArtifacts({
        searchParams: new URLSearchParams('guestLang=es'),
        storedGuestInviteToken: 'stored-guest-invite',
      }),
    ).toEqual({
      guestInviteToken: 'stored-guest-invite',
    });
  });
});
