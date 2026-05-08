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
      'src/pages/RSVP.tsx',
      'src/pages/EventRSVP.tsx',
      'src/pages/PhotoUpload.tsx',
      'src/pages/VaultContribute.tsx',
      'src/pages/GuestbookSubmit.tsx',
      'src/pages/GuestContactUpdate.tsx',
      'src/pages/guestPublicSubmissionService.ts',
      'src/pages/rsvpFunctionService.ts',
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
    expect(siteView).toContain("from './SiteViewRouteView'");
    expect(siteView).toContain("from './siteViewService'");
    expect(siteView).toContain('<SiteViewRouteView');
    expect(siteView).toContain('fetchPublicItineraryRows(siteSlug, access)');
    expect(siteView).toContain('hasLiveRegistryItems(siteId, access)');
    expect(siteView).toContain('hasLiveRegistryItems(data.id as string, subresourceAccess)');
    expect(siteView).not.toContain('Loading wedding site...');
    expect(siteView).not.toContain('Something went wrong');
    expect(siteViewService).toContain("supabase.functions.invoke('public-itinerary-by-slug'");
    expect(siteViewService).toContain("supabase.functions.invoke('public-registry-items'");

    const eventHub = readSource('src/pages/EventHub.tsx');
    const guestHubService = readSource('src/pages/guestHubPublicService.ts');
    expect(eventHub).toContain("from './EventHubRouteView'");
    expect(eventHub).toContain("from './EventHubConfigStatusCard'");
    expect(eventHub).toContain("from './guestHubPublicService'");
    expect(eventHub).toContain('<EventHubRouteView');
    expect(eventHub).toContain('<EventHubConfigStatusCard');
    expect(eventHub).toContain('fetchGuestHubConfig<');
    expect(eventHub).toContain("trackGuestHubEvent(slug, 'view', '/event'");
    expect(eventHub).toContain('submitGuestHubProspect(');
    expect(eventHub).toContain('buildGuestHubAccessPayload(slug, searchParams)');
    expect(eventHub).not.toContain('if (!slug) {');
    expect(guestHubService).toContain('/functions/v1/guest-hub-config?site=');
    expect(guestHubService).toContain('/functions/v1/guest-hub-track');
    expect(guestHubService).toContain('/functions/v1/guest-prospect-submit');

    const eventRecap = readSource('src/pages/EventRecap.tsx');
    expect(eventRecap).toContain("from './EventRecapRouteView'");
    expect(eventRecap).toContain("from './guestHubPublicService'");
    expect(eventRecap).toContain('<EventRecapRouteView');
    expect(eventRecap).toContain('fetchGuestRecapConfig<RecapData>(');
    expect(eventRecap).toContain("trackGuestHubEvent(slug, 'view', '/event/recap'");
    expect(eventRecap).toContain('submitGuestHubProspect(');
    expect(eventRecap).toContain('buildEventRecapGuestHubAccessPayload(slug)');
    expect(eventRecap).not.toContain("{loading && <div className=\"mt-6 rounded-lg border border-neutral-200 bg-white p-6 text-neutral-600\">");
    expect(eventRecap).not.toContain("{error && <div className=\"mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-neutral-700\">");
    expect(guestHubService).toContain('/functions/v1/guest-recap-config?site=');

    const photoUpload = readSource('src/pages/PhotoUpload.tsx');
    const guestSubmissionService = readSource('src/pages/guestPublicSubmissionService.ts');
    expect(photoUpload).toContain("from './guestPublicSubmissionService'");
    expect(photoUpload).toContain('uploadGuestPhotos(form)');
    expect(photoUpload).toContain('submitGuestHubProspect(');
    expect(photoUpload).toContain('buildPhotoUploadAccessPayload(siteSlug)');
    expect(guestSubmissionService).toContain('/functions/v1/photo-upload');
    expect(guestHubService).toContain('/functions/v1/guest-prospect-submit');

    const vaultContribute = readSource('src/pages/VaultContribute.tsx');
    const vaultContributionService = readSource('src/pages/vaultContributionService.ts');
    expect(vaultContribute).not.toContain("from '../lib/supabase'");
    expect(vaultContribute).toContain("from './VaultContributeRouteView'");
    expect(vaultContribute).toContain("from './vaultContributionService'");
    expect(vaultContribute).toContain('<VaultContributeRouteView');
    expect(vaultContribute).toContain('loadEnabledVaultContributionConfig(siteSlug, vaultYear, buildVaultAccessPayload(siteSlug))');
    expect(vaultContribute).toContain('listEnabledVaultContributionConfigs(siteSlug, buildVaultAccessPayload(siteSlug))');
    expect(vaultContribute).toContain('uploadVaultContributionToGoogleDrive({');
    expect(vaultContribute).toContain('uploadVaultContributionAttachment({');
    expect(vaultContribute).toContain("submitVaultContributionRows(rows, buildVaultAccessPayload(siteSlug ?? ''), qaOpen)");
    expect(vaultContribute).toContain('fetchPublicSiteAccess({');
    expect(vaultContribute).toContain('buildVaultAccessPayload(siteSlug)');
    expect(vaultContribute).not.toContain("if (step === 'loading')");
    expect(vaultContribute).not.toContain("if (step === 'invalid')");
    expect(vaultContribute).not.toContain("if (step === 'hub')");
    expect(vaultContribute).not.toContain("if (step === 'success')");
    expect(vaultContribute).not.toContain("if (step === 'error')");
    expect(vaultContributionService).toContain("supabase.functions.invoke('vault-contribution-public'");
    expect(vaultContributionService).toContain("supabase.functions.invoke('vault-upload-google-drive'");
    expect(vaultContributionService).toContain("supabase.functions.invoke('vault-entry-submit'");

    const guestbook = readSource('src/pages/GuestbookSubmit.tsx');
    expect(guestbook).toContain("from './guestPublicSubmissionService'");
    expect(guestbook).toContain('submitGuestbookEntry({');
    expect(guestbook).toContain('buildGuestbookAccessPayload(siteSlug)');
    expect(guestSubmissionService).toContain('/functions/v1/guestbook-submit');

    const guestContact = readSource('src/pages/GuestContactUpdate.tsx');
    expect(guestContact).toContain("from './guestPublicSubmissionService'");
    expect(guestContact).toContain("callGuestContactFunction<{ matches?: Match[] }>('guest-contact-lookup'");
    expect(guestContact).toContain("callGuestContactFunction('guest-contact-submit'");
    expect(guestContact).toContain('buildGuestContactAccessPayload(siteRef)');
    expect(guestSubmissionService).toContain('/functions/v1/${name}');

    const rsvpPage = readSource('src/pages/RSVP.tsx');
    const eventRsvpPage = readSource('src/pages/EventRSVP.tsx');
    const rsvpFunctionService = readSource('src/pages/rsvpFunctionService.ts');
    expect(rsvpPage).toContain("from './rsvpFunctionService'");
    expect(rsvpPage).toContain("callValidateRsvpToken({ action: 'lookup', searchValue: searchValue.trim() })");
    expect(rsvpPage).toContain("callValidateRsvpToken({ action: 'lookup_guest', guestId: picked.id, rsvpSession: rsvpSessionToken })");
    expect(rsvpPage).toContain("callValidateRsvpToken({");
    expect(eventRsvpPage).toContain("from './rsvpFunctionService'");
    expect(eventRsvpPage).toContain('const CAN_USE_EVENT_RSVP_FUNCTION = hasRsvpFunctionRuntime()');
    expect(eventRsvpPage).toContain("callValidateRsvpToken<Record<string, unknown>>({");
    expect(rsvpFunctionService).toContain('/functions/v1/validate-rsvp-token');

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
