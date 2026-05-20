import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('public access helper route sync guards', () => {
  it('lets photo upload helpers accept live router search params instead of forcing window search', () => {
    const source = read('src/pages/PhotoUpload.tsx');

    expect(source).toContain("import { resolveCurrentSearchParams } from '../lib/currentSearchParams';");
    expect(source).toContain('buildPublicAccessArtifacts(slug, resolveCurrentSearchParams(searchParams))');
    expect(source).toContain('buildGuestIdentityArtifacts(slug, resolveCurrentSearchParams(searchParams))');
    expect(source).toContain('buildPhotoUploadAccessPayload(siteSlug, params)');
    expect(source).toContain('buildPhotoUploadIdentityPayload(siteSlug, params)');
  });

  it('lets event recap helpers accept live router search params instead of forcing window search', () => {
    const source = read('src/pages/EventRecap.tsx');

    expect(source).toContain("import { resolveCurrentSearchParams } from '../lib/currentSearchParams';");
    expect(source).toContain('buildPublicAccessArtifacts(slug, resolveCurrentSearchParams(searchParams))');
    expect(source).toContain('const access = buildEventRecapGuestHubAccessPayload(slug, searchParams);');
    expect(source).toContain('buildEventRecapGuestHubAccessPayload(slug, searchParams)');
    expect(source).toContain('buildEventRecapAccessHeaders(slug, searchParams)');
  });

  it('reuses the current event hub access payload for click tracking instead of rebuilding from window search', () => {
    const source = read('src/pages/EventHub.tsx');

    expect(source).toContain('...accessPayload,');
    expect(source).not.toContain("...buildGuestHubAccessPayload(slug, new URLSearchParams(window.location.search)),");
  });
});
