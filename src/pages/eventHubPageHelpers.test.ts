import { afterEach, describe, expect, it } from 'vitest';
import {
  buildGuestHubAccessHeaders,
  buildGuestHubAccessPayload,
  buildGuestHubIdentityPayload,
  formatEventHubCoupleLabel,
  friendlyGuestHubError,
  safeGuestHubFunctionError,
  shouldOpenHubDetailsByDefault,
} from './eventHubPageHelpers';

afterEach(() => {
  sessionStorage.clear();
});

describe('buildGuestHubAccessPayload', () => {
  it('prefers the current invite token and includes the scoped password session', () => {
    sessionStorage.setItem('dayof_invite_token_maya-leo', 'stored-invite');
    sessionStorage.setItem('dayof_pw_session_maya-leo', 'password-session');

    expect(buildGuestHubAccessPayload('maya-leo', new URLSearchParams('token=current-invite'))).toEqual({
      inviteToken: 'current-invite',
      passwordSession: 'password-session',
    });
  });

  it('falls back to the stored invite token for gated guest hub clicks', () => {
    sessionStorage.setItem('dayof_invite_token_maya-leo', 'stored-invite');

    expect(buildGuestHubAccessPayload('maya-leo', new URLSearchParams(''))).toEqual({
      inviteToken: 'stored-invite',
      passwordSession: null,
    });
  });
});

describe('buildGuestHubAccessHeaders', () => {
  it('adds only present access artifacts for gated hub config requests', () => {
    sessionStorage.setItem('dayof_pw_session_maya-leo', 'password-session');

    expect(buildGuestHubAccessHeaders('maya-leo', new URLSearchParams('token=current-invite'))).toEqual({
      'x-dayof-invite-token': 'current-invite',
      'x-dayof-password-session': 'password-session',
    });
  });

  it('adds guest identity headers when a guest-scoped invite is present', () => {
    sessionStorage.setItem('dayof_guest_invite_token_maya-leo', 'guest-invite');

    expect(buildGuestHubAccessHeaders('maya-leo', new URLSearchParams(''))).toEqual({
      'x-dayof-guest-invite-token': 'guest-invite',
    });
  });

  it('omits empty access headers for normal public hub config requests', () => {
    expect(buildGuestHubAccessHeaders('maya-leo', new URLSearchParams(''))).toEqual({});
  });
});

describe('buildGuestHubIdentityPayload', () => {
  it('pulls guest-specific invite identity from the current URL or stored session scope', () => {
    sessionStorage.setItem('dayof_guest_invite_token_maya-leo', 'stored-guest-invite');

    expect(buildGuestHubIdentityPayload('maya-leo', new URLSearchParams('invite_token=current-guest-invite'))).toEqual({
      guestInviteToken: 'current-guest-invite',
    });
    expect(buildGuestHubIdentityPayload('maya-leo', new URLSearchParams('guestLang=es'))).toEqual({
      guestInviteToken: 'stored-guest-invite',
    });
  });
});

describe('formatEventHubCoupleLabel', () => {
  it('uses configured couple names when available', () => {
    expect(formatEventHubCoupleLabel('maya-and-leo', 'Maya', 'Leo')).toBe('Maya & Leo');
  });

  it('formats common slug fallback names with an ampersand', () => {
    expect(formatEventHubCoupleLabel('maya-and-leo')).toBe('Maya & Leo');
  });

  it('title-cases single-name or non-couple slugs', () => {
    expect(formatEventHubCoupleLabel('spring-wedding-weekend')).toBe('Spring Wedding Weekend');
  });

  it('keeps demo guest-hub couple labels aligned with the seeded couple names instead of the raw demo slug', () => {
    expect(formatEventHubCoupleLabel('alex-jordan-demo', 'Alex', 'Jordan')).toBe('Alex & Jordan');
  });
});

describe('friendlyGuestHubError', () => {
  it('hides implementation details from guest opt-in failures', () => {
    expect(friendlyGuestHubError(new Error('Supabase function policy denied token'), 'Please try again.')).toBe('Please try again.');
    expect(safeGuestHubFunctionError('Supabase function policy denied token', 'Please try again.')).toBe('Please try again.');
  });

  it('keeps plain guest-safe copy', () => {
    expect(friendlyGuestHubError(new Error('Add an email or phone first.'), 'Please try again.')).toBe('Add an email or phone first.');
    expect(safeGuestHubFunctionError('Add an email or phone first.', 'Please try again.')).toBe('Add an email or phone first.');
  });
});

describe('shouldOpenHubDetailsByDefault', () => {
  it('keeps proof-only hub details open for mobile smoke and explicit review links', () => {
    expect(shouldOpenHubDetailsByDefault(new URLSearchParams('mobileSmoke=1'))).toBe(true);
    expect(shouldOpenHubDetailsByDefault(new URLSearchParams('hubDetails=1'))).toBe(true);
  });

  it('keeps guest hub details collapsed by default for normal guest links', () => {
    expect(shouldOpenHubDetailsByDefault(new URLSearchParams(''))).toBe(false);
    expect(shouldOpenHubDetailsByDefault(new URLSearchParams('guestLang=es'))).toBe(false);
  });
});
