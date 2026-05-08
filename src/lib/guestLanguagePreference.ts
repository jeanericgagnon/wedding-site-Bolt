export const GUEST_LANGUAGE_STORAGE_KEY = 'dayof_language';
export const GUEST_LANGUAGE_QUERY_KEYS = ['guestLang', 'lang', 'locale', 'language'] as const;
export const SUPPORTED_GUEST_LANGUAGES = ['en', 'es', 'fr', 'it', 'de', 'pt'] as const;
const GUEST_LANGUAGE_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;

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

interface GuestLanguageEnvelope {
  savedAtISO: string;
  language: GuestLanguageCode;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const buildLanguageEnvelope = (language: GuestLanguageCode): GuestLanguageEnvelope => ({
  savedAtISO: new Date().toISOString(),
  language,
});

const isStaleLanguageEnvelope = (savedAtISO: unknown): boolean => {
  if (typeof savedAtISO !== 'string') return true;
  const savedAt = new Date(savedAtISO).getTime();
  return !Number.isFinite(savedAt) || Date.now() - savedAt > GUEST_LANGUAGE_RETENTION_MS;
};

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
    const raw = localStorage.getItem(GUEST_LANGUAGE_STORAGE_KEY);
    if (!raw) return null;
    const legacyLanguage = normalizeGuestLanguageCode(raw);
    if (legacyLanguage) {
      localStorage.setItem(GUEST_LANGUAGE_STORAGE_KEY, JSON.stringify(buildLanguageEnvelope(legacyLanguage)));
      return legacyLanguage;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || isStaleLanguageEnvelope(parsed.savedAtISO)) {
      localStorage.removeItem(GUEST_LANGUAGE_STORAGE_KEY);
      return null;
    }
    const language = normalizeGuestLanguageCode(typeof parsed.language === 'string' ? parsed.language : null);
    if (!language) {
      localStorage.removeItem(GUEST_LANGUAGE_STORAGE_KEY);
      return null;
    }
    localStorage.setItem(GUEST_LANGUAGE_STORAGE_KEY, JSON.stringify(buildLanguageEnvelope(language)));
    return language;
  } catch {
    try {
      localStorage.removeItem(GUEST_LANGUAGE_STORAGE_KEY);
    } catch {
      // Guest pages still work if storage is unavailable.
    }
    return null;
  }
}

export function hasStoredGuestLanguagePreference(): boolean {
  return readStoredGuestLanguage() !== null;
}

export function writeStoredGuestLanguage(language: GuestLanguageCode): void {
  try {
    localStorage.setItem(GUEST_LANGUAGE_STORAGE_KEY, JSON.stringify(buildLanguageEnvelope(language)));
  } catch {
    // Guest pages still work if storage is unavailable.
  }
}
