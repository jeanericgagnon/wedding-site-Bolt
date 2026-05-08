import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function readSource(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('public guest surface boundary', () => {
  it('keeps guest-facing pages and helpers off direct browser table reads', () => {
    const auditedFiles = [
      'src/pages/SiteView.tsx',
      'src/pages/EventHub.tsx',
      'src/pages/EventRecap.tsx',
      'src/pages/PhotoUpload.tsx',
      'src/pages/VaultContribute.tsx',
      'src/pages/GuestbookSubmit.tsx',
      'src/pages/GuestContactUpdate.tsx',
      'src/sections/components/RsvpSection.tsx',
      'src/sections/variants/rsvp/multiEvent.tsx',
      'src/sections/interactiveSectionService.ts',
      'src/pages/vaultContributionService.ts',
    ];

    for (const relativePath of auditedFiles) {
      expect(readSource(relativePath)).not.toMatch(/supabase\s*\.\s*from\(/);
    }
  });

  it('routes audited guest flows through public gate helpers and edge functions', () => {
    const siteView = readSource('src/pages/SiteView.tsx');
    const siteViewService = readSource('src/pages/siteViewService.ts');
    expect(siteView).not.toContain("from '../lib/supabase'");
    expect(siteView).toContain("from './siteViewService'");
    expect(siteView).toContain('fetchPublicItineraryRows(siteSlug, access)');
    expect(siteView).toContain('hasLiveRegistryItems(siteId, access)');
    expect(siteView).toContain('hasLiveRegistryItems(data.id as string, subresourceAccess)');
    expect(siteViewService).toContain("supabase.functions.invoke('public-itinerary-by-slug'");
    expect(siteViewService).toContain("supabase.functions.invoke('public-registry-items'");

    const eventHub = readSource('src/pages/EventHub.tsx');
    expect(eventHub).toContain('/functions/v1/guest-hub-config?site=');
    expect(eventHub).toContain('/functions/v1/guest-hub-track');
    expect(eventHub).toContain('/functions/v1/guest-prospect-submit');
    expect(eventHub).toContain('buildGuestHubAccessPayload(slug, searchParams)');

    const eventRecap = readSource('src/pages/EventRecap.tsx');
    expect(eventRecap).toContain('/functions/v1/guest-recap-config?site=');
    expect(eventRecap).toContain('/functions/v1/guest-hub-track');
    expect(eventRecap).toContain('/functions/v1/guest-prospect-submit');
    expect(eventRecap).toContain('buildEventRecapGuestHubAccessPayload(slug)');

    const photoUpload = readSource('src/pages/PhotoUpload.tsx');
    expect(photoUpload).toContain('/functions/v1/photo-upload');
    expect(photoUpload).toContain('/functions/v1/guest-prospect-submit');
    expect(photoUpload).toContain('buildPhotoUploadAccessPayload(siteSlug)');

    const vaultContribute = readSource('src/pages/VaultContribute.tsx');
    const vaultContributionService = readSource('src/pages/vaultContributionService.ts');
    expect(vaultContribute).not.toContain("from '../lib/supabase'");
    expect(vaultContribute).toContain("from './vaultContributionService'");
    expect(vaultContribute).toContain('loadEnabledVaultContributionConfig(siteSlug, vaultYear, buildVaultAccessPayload(siteSlug))');
    expect(vaultContribute).toContain('listEnabledVaultContributionConfigs(siteSlug, buildVaultAccessPayload(siteSlug))');
    expect(vaultContribute).toContain('uploadVaultContributionToGoogleDrive({');
    expect(vaultContribute).toContain('uploadVaultContributionAttachment({');
    expect(vaultContribute).toContain("submitVaultContributionRows(rows, buildVaultAccessPayload(siteSlug ?? ''), qaOpen)");
    expect(vaultContribute).toContain('fetchPublicSiteAccess({');
    expect(vaultContribute).toContain('buildVaultAccessPayload(siteSlug)');
    expect(vaultContributionService).toContain("supabase.functions.invoke('vault-contribution-public'");
    expect(vaultContributionService).toContain("supabase.functions.invoke('vault-upload-google-drive'");
    expect(vaultContributionService).toContain("supabase.functions.invoke('vault-entry-submit'");

    const guestbook = readSource('src/pages/GuestbookSubmit.tsx');
    expect(guestbook).toContain('/functions/v1/guestbook-submit');
    expect(guestbook).toContain('buildGuestbookAccessPayload(siteSlug)');

    const guestContact = readSource('src/pages/GuestContactUpdate.tsx');
    expect(guestContact).toContain('/functions/v1/${name}');
    expect(guestContact).toContain('buildGuestContactAccessPayload(siteRef)');

    const rsvpSection = readSource('src/sections/components/RsvpSection.tsx');
    expect(rsvpSection).toContain("supabase.functions.invoke('public-site-access'");
    expect(rsvpSection).toContain("supabase.functions.invoke('public-site-rsvp-submit'");
    expect(rsvpSection).toContain('buildPublicAccessArtifacts(slug, new URLSearchParams(window.location.search))');

    const multiEvent = readSource('src/sections/variants/rsvp/multiEvent.tsx');
    expect(multiEvent).toContain("supabase.functions.invoke('public-site-rsvp-submit'");
    expect(multiEvent).toContain('buildPublicAccessArtifacts(slug, new URLSearchParams(window.location.search))');

    const interactiveService = readSource('src/sections/interactiveSectionService.ts');
    expect(interactiveService).toContain("supabase.functions.invoke('interactive-section-public'");
    expect(interactiveService).toContain('buildPublicAccessArtifacts(siteSlug, new URLSearchParams(window.location.search))');

    expect(vaultContributionService).toContain("supabase.functions.invoke('vault-contribution-public'");
  });
});
