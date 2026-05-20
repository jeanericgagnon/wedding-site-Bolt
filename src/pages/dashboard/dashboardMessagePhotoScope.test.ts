import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('dashboard message photo link scope guards', () => {
  it('keeps message photo-link memory scoped to the active wedding site', () => {
    const messagesPage = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/Messages.tsx'),
      'utf8',
    );
    const utils = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/messages/messageDashboardUtils.ts'),
      'utf8',
    );

    expect(messagesPage).toContain('countStoredPhotoAlbumLinks(weddingSite?.id ?? null)');
    expect(messagesPage).toContain("getPreferredStoredPhotoAlbumLink(weddingSite?.id ?? null) ?? photoLink");
    expect(utils).toContain('function buildStoredPhotoAlbumLinksKey(storageScope?: string | null): string {');
    expect(utils).toContain("return scope ? `${PHOTO_ALBUM_LINKS_STORAGE_KEY}::${scope}` : LEGACY_PHOTO_ALBUM_LINKS_STORAGE_KEY;");
    expect(utils).toContain('export function readStoredPhotoAlbumLinks(storageScope?: string | null): string[] {');
  });
});
