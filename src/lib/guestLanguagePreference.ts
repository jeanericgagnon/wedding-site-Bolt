export const GUEST_LANGUAGE_STORAGE_KEY = 'dayof_language';
export const GUEST_LANGUAGE_QUERY_KEYS = ['guestLang', 'lang', 'locale', 'language'] as const;
export const SUPPORTED_GUEST_LANGUAGES = ['en', 'es', 'fr', 'it', 'de', 'pt'] as const;

export type GuestLanguageCode = typeof SUPPORTED_GUEST_LANGUAGES[number];
export type GuestLanguageSource = 'guest-link' | 'stored-preference' | 'site-default' | 'fallback';

export interface GuestLanguageResolutionInput {
  search?: URLSearchParams | string | null;
  storedLanguage?: string | null;
  siteDefaultLanguage?: string | null;
}

export interface GuestLanguageResolution {
  language: GuestLanguageCode;
  source: GuestLanguageSource;
}

export function normalizeGuestLanguageCode(value?: string | null): GuestLanguageCode | null {
  const code = (value ?? '').trim().toLowerCase().split(/[-_]/)[0];
  return (SUPPORTED_GUEST_LANGUAGES as readonly string[]).includes(code) ? code as GuestLanguageCode : null;
}

function toSearchParams(search: URLSearchParams | string | null | undefined): URLSearchParams | null {
  if (!search) return null;
  if (search instanceof URLSearchParams) return search;
  return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
}

export function readGuestLanguageFromSearch(search: URLSearchParams | string | null | undefined): GuestLanguageCode | null {
  const params = toSearchParams(search);
  if (!params) return null;
  for (const key of GUEST_LANGUAGE_QUERY_KEYS) {
    const language = normalizeGuestLanguageCode(params.get(key));
    if (language) return language;
  }
  return null;
}

export function resolveGuestLanguagePreference(input: GuestLanguageResolutionInput): GuestLanguageResolution {
  const linkedLanguage = readGuestLanguageFromSearch(input.search);
  if (linkedLanguage) return { language: linkedLanguage, source: 'guest-link' };

  const storedLanguage = normalizeGuestLanguageCode(input.storedLanguage);
  if (storedLanguage) return { language: storedLanguage, source: 'stored-preference' };

  const siteDefaultLanguage = normalizeGuestLanguageCode(input.siteDefaultLanguage);
  if (siteDefaultLanguage) return { language: siteDefaultLanguage, source: 'site-default' };

  return { language: 'en', source: 'fallback' };
}

export function readStoredGuestLanguage(): string | null {
  try {
    return localStorage.getItem(GUEST_LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeStoredGuestLanguage(language: GuestLanguageCode): void {
  try {
    localStorage.setItem(GUEST_LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Guest pages still work if storage is unavailable.
  }
}
