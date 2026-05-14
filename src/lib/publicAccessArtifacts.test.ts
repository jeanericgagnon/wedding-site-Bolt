import { afterEach, describe, expect, it } from 'vitest';
import {
  appendGuestInviteTokenToInternalHref,
  buildGuestIdentityArtifacts,
  captureGuestInviteTokenFromSearch,
  getGuestInviteTokenStorageKey,
  buildPublicAccessArtifacts,
  capturePublicInviteTokenFromSearch,
  getPublicInviteTokenStorageKey,
  getPublicPasswordSessionStorageKey,
  getUrlWithoutPublicAccessToken,
} from './publicAccessArtifacts';

afterEach(() => {
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
});

describe('public access artifacts', () => {
  it('strips only public invite tokens from URLs', () => {
    expect(getUrlWithoutPublicAccessToken('/event/maya-leo?token=secret&guestLang=es#photos', 'https://dayof.love'))
      .toBe('/event/maya-leo?guestLang=es#photos');
  });

  it('packages current URL tokens before stored invite tokens', () => {
    sessionStorage.setItem(getPublicInviteTokenStorageKey('maya-leo'), 'stored-token');
    sessionStorage.setItem(getPublicPasswordSessionStorageKey('maya-leo'), 'password-session');

    expect(buildPublicAccessArtifacts('maya-leo', new URLSearchParams('token=current-token'))).toEqual({
      inviteToken: 'current-token',
      passwordSession: 'password-session',
    });
  });

  it('falls back to stored invite tokens after the visible URL token is removed', () => {
    sessionStorage.setItem(getPublicInviteTokenStorageKey('maya-leo'), 'stored-token');

    expect(buildPublicAccessArtifacts('maya-leo', new URLSearchParams('guestLang=es'))).toEqual({
      inviteToken: 'stored-token',
      passwordSession: null,
    });
  });

  it('captures a URL token into scoped session storage and removes it from the address bar', () => {
    window.history.replaceState({}, '', '/event/maya-leo?token=current-token&guestLang=es#travel');

    expect(capturePublicInviteTokenFromSearch('maya-leo', new URLSearchParams(window.location.search))).toBe('current-token');
    expect(sessionStorage.getItem(getPublicInviteTokenStorageKey('maya-leo'))).toBe('current-token');
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/event/maya-leo?guestLang=es#travel');
  });

  it('captures guest invite tokens separately from site access tokens', () => {
    window.history.replaceState({}, '', '/guest-contact/maya-leo?invite_token=guest-token-123&guestLang=es#contact');

    expect(captureGuestInviteTokenFromSearch('maya-leo', new URLSearchParams(window.location.search))).toBe('guest-token-123');
    expect(sessionStorage.getItem(getGuestInviteTokenStorageKey('maya-leo'))).toBe('guest-token-123');
    expect(buildGuestIdentityArtifacts('maya-leo', new URLSearchParams('guestLang=es'))).toEqual({
      guestInviteToken: 'guest-token-123',
    });
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/guest-contact/maya-leo?guestLang=es#contact');
  });

  it('appends guest invite tokens only to internal guest-path links', () => {
    expect(appendGuestInviteTokenToInternalHref('/photos/upload?site=maya-leo&hub=1', 'guest-token-123', 'https://dayof.love'))
      .toBe('/photos/upload?site=maya-leo&hub=1&invite_token=guest-token-123');
    expect(appendGuestInviteTokenToInternalHref('https://example.com/photos/upload', 'guest-token-123', 'https://dayof.love'))
      .toBe('https://example.com/photos/upload');
  });
});
