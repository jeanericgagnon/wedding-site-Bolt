import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  appendGuestLanguageToInternalHref,
  GUEST_LANGUAGE_STORAGE_KEY,
  hasStoredGuestLanguagePreference,
  normalizeGuestLanguageCode,
  readGuestLanguageFromSearch,
  readStoredGuestLanguage,
  resolveGuestLanguagePreference,
  writeStoredGuestLanguage,
} from './guestLanguagePreference';

describe('guestLanguagePreference', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T16:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('normalizes supported regional language codes and rejects unsupported values', () => {
    expect(normalizeGuestLanguageCode('es-MX')).toBe('es');
    expect(normalizeGuestLanguageCode('PT_br')).toBe('pt');
    expect(normalizeGuestLanguageCode('ja')).toBeNull();
    expect(normalizeGuestLanguageCode('token=private')).toBeNull();
  });

  it('resolves guest-link language ahead of stored and site defaults', () => {
    const resolution = resolveGuestLanguagePreference({
      search: '?guestLang=fr-CA',
      storedLanguage: 'es',
      siteDefaultLanguage: 'pt',
    });

    expect(resolution).toEqual({ language: 'fr', source: 'guest-link' });
    expect(readGuestLanguageFromSearch('?language=de-DE')).toBe('de');
  });

  it('falls back from stored preference to site default and English', () => {
    expect(resolveGuestLanguagePreference({ storedLanguage: 'it' })).toEqual({
      language: 'it',
      source: 'stored-preference',
    });
    expect(resolveGuestLanguagePreference({ storedLanguage: 'ja', siteDefaultLanguage: 'es-MX' })).toEqual({
      language: 'es',
      source: 'site-default',
    });
    expect(resolveGuestLanguagePreference({ storedLanguage: 'ja', siteDefaultLanguage: 'ko' })).toEqual({
      language: 'en',
      source: 'fallback',
    });
  });

  it('stores guest language preferences as timestamped envelopes', () => {
    writeStoredGuestLanguage('es');

    expect(JSON.parse(window.localStorage.getItem(GUEST_LANGUAGE_STORAGE_KEY) || '{}')).toMatchObject({
      savedAtISO: '2026-05-06T16:00:00.000Z',
      language: 'es',
    });
    expect(readStoredGuestLanguage()).toBe('es');
  });

  it('keeps stored guest language preferences scoped to the active wedding context', () => {
    writeStoredGuestLanguage('es', 'alex-jordan');
    writeStoredGuestLanguage('fr', 'maya-noah');

    expect(readStoredGuestLanguage('alex-jordan')).toBe('es');
    expect(readStoredGuestLanguage('maya-noah')).toBe('fr');
    expect(readStoredGuestLanguage('another-site')).toBeNull();
    expect(window.localStorage.getItem(`${GUEST_LANGUAGE_STORAGE_KEY}:alex-jordan`)).toBeTruthy();
    expect(window.localStorage.getItem(`${GUEST_LANGUAGE_STORAGE_KEY}:maya-noah`)).toBeTruthy();
  });

  it('migrates legacy language preferences and clears stale or malformed values', () => {
    window.localStorage.setItem(GUEST_LANGUAGE_STORAGE_KEY, 'fr');
    expect(readStoredGuestLanguage()).toBe('fr');
    expect(JSON.parse(window.localStorage.getItem(GUEST_LANGUAGE_STORAGE_KEY) || '{}')).toHaveProperty('savedAtISO');

    window.localStorage.setItem(GUEST_LANGUAGE_STORAGE_KEY, JSON.stringify({
      savedAtISO: '2025-01-01T00:00:00.000Z',
      language: 'it',
    }));
    expect(readStoredGuestLanguage()).toBeNull();
    expect(window.localStorage.getItem(GUEST_LANGUAGE_STORAGE_KEY)).toBeNull();

    window.localStorage.setItem(GUEST_LANGUAGE_STORAGE_KEY, '{broken');
    expect(readStoredGuestLanguage()).toBeNull();
    expect(window.localStorage.getItem(GUEST_LANGUAGE_STORAGE_KEY)).toBeNull();
  });

  it('reports no stored preference after clearing stale language envelopes', () => {
    window.localStorage.setItem(GUEST_LANGUAGE_STORAGE_KEY, JSON.stringify({
      savedAtISO: '2025-01-01T00:00:00.000Z',
      language: 'es',
    }));

    expect(hasStoredGuestLanguagePreference()).toBe(false);
    expect(window.localStorage.getItem(GUEST_LANGUAGE_STORAGE_KEY)).toBeNull();
  });

  it('appends only normalized guest language to internal app routes', () => {
    expect(appendGuestLanguageToInternalHref('/rsvp?token=private', 'es-MX', 'https://dayof.love'))
      .toBe('/rsvp?token=private&guestLang=es');
    expect(appendGuestLanguageToInternalHref('/site/maya#travel', 'FR', 'https://dayof.love'))
      .toBe('/site/maya?guestLang=fr#travel');
    expect(appendGuestLanguageToInternalHref('https://example.com/outside', 'es', 'https://dayof.love'))
      .toBe('https://example.com/outside');
    expect(appendGuestLanguageToInternalHref('/rsvp?token=private', 'ja', 'https://dayof.love'))
      .toBe('/rsvp?token=private');
  });
});
