import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('public guest language scope guards', () => {
  it('scopes stored guest language reads and writes to the active public route context', () => {
    const helper = readFileSync(join(process.cwd(), 'src/lib/guestLanguagePreference.ts'), 'utf8');
    const rsvp = readFileSync(join(process.cwd(), 'src/pages/RSVP.tsx'), 'utf8');
    const eventHub = readFileSync(join(process.cwd(), 'src/pages/EventHub.tsx'), 'utf8');
    const eventRecap = readFileSync(join(process.cwd(), 'src/pages/EventRecap.tsx'), 'utf8');
    const photoUpload = readFileSync(join(process.cwd(), 'src/pages/PhotoUpload.tsx'), 'utf8');
    const siteView = readFileSync(join(process.cwd(), 'src/pages/SiteView.tsx'), 'utf8');

    expect(helper).toContain('function buildGuestLanguageStorageKey(scope?: string | null): string {');
    expect(helper).toContain('export function readStoredGuestLanguage(scope?: string | null): string | null {');
    expect(helper).toContain('export function hasStoredGuestLanguagePreference(scope?: string | null): boolean {');
    expect(helper).toContain('export function writeStoredGuestLanguage(language: GuestLanguageCode, scope?: string | null): void {');

    expect(rsvp).toContain('storedLanguage: readStoredGuestLanguage(activeToken)');
    expect(rsvp).toContain('writeStoredGuestLanguage(languagePreference.language, activeToken);');

    expect(eventHub).toContain('storedLanguage: readStoredGuestLanguage(slug)');
    expect(eventHub).toContain('writeStoredGuestLanguage(languagePreference.language, slug);');
    expect(eventHub).toContain("Boolean(readStoredGuestLanguage(slug))");

    expect(eventRecap).toContain('storedLanguage: readStoredGuestLanguage(slug)');
    expect(eventRecap).toContain('writeStoredGuestLanguage(languagePreference.language, slug);');

    expect(photoUpload).toContain('storedLanguage: readStoredGuestLanguage(siteSlug)');
    expect(photoUpload).toContain('writeStoredGuestLanguage(languagePreference.language, siteSlug);');

    expect(siteView).toContain('if (!hasStoredGuestLanguagePreference(resolvedSlug) && (siteLang === \'en\' || siteLang === \'es\')) {');
  });
});
