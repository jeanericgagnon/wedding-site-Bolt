import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('public access payload route sync guards', () => {
  it('threads live router search params through guestbook, guest contact, and vault access helpers', () => {
    const guestbook = readFileSync(join(process.cwd(), 'src/pages/GuestbookSubmit.tsx'), 'utf8');
    const guestContact = readFileSync(join(process.cwd(), 'src/pages/GuestContactUpdate.tsx'), 'utf8');
    const vault = readFileSync(join(process.cwd(), 'src/pages/VaultContribute.tsx'), 'utf8');

    expect(guestbook).toContain("import { resolveCurrentSearchParams } from '../lib/currentSearchParams';");
    expect(guestbook).toContain('buildPublicAccessArtifacts(slug, resolveCurrentSearchParams(searchParams))');
    expect(guestbook).toContain('buildGuestbookAccessPayload(siteSlug, searchParams)');
    expect(guestbook).toContain('buildGuestbookIdentityPayload(siteSlug, searchParams)');

    expect(guestContact).toContain("import { resolveCurrentSearchParams } from '../lib/currentSearchParams';");
    expect(guestContact).toContain('buildPublicAccessArtifacts(siteRef, resolveCurrentSearchParams(searchParams))');
    expect(guestContact).toContain('buildGuestIdentityArtifacts(siteRef, resolveCurrentSearchParams(searchParams))');
    expect(guestContact).toContain('buildGuestContactAccessPayload(siteRef, searchParams)');
    expect(guestContact).toContain('buildGuestContactIdentityPayload(siteRef, searchParams)');

    expect(vault).toContain("import { resolveCurrentSearchParams } from '../lib/currentSearchParams';");
    expect(vault).toContain('buildPublicAccessArtifacts(slug, resolveCurrentSearchParams(searchParams))');
    expect(vault).toContain('buildGuestIdentityArtifacts(slug, resolveCurrentSearchParams(searchParams))');
    expect(vault).toContain('capturePublicInviteTokenFromSearch(siteSlug, searchParams);');
    expect(vault).toContain('buildVaultAccessPayload(siteSlug, searchParams)');
    expect(vault).toContain('buildVaultIdentityPayload(siteSlug, searchParams)');
  });
});
