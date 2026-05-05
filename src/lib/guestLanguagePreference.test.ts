import { describe, expect, it } from 'vitest';
import {
  normalizeGuestLanguageCode,
  readGuestLanguageFromSearch,
  resolveGuestLanguagePreference,
} from './guestLanguagePreference';

describe('guestLanguagePreference', () => {
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
});
