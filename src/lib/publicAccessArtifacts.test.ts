import { afterEach, describe, expect, it } from 'vitest';
import {
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
});
