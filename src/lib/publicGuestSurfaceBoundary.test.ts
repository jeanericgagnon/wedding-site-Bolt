import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function readSource(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('public guest surface boundary', () => {
  it('keeps public site access limited to the approved browser readers', () => {
    const siteView = readSource('src/pages/SiteView.tsx');
    const vaultContribute = readSource('src/pages/VaultContribute.tsx');
    const publicSiteAccess = readSource('src/lib/publicSiteAccess.ts');
    const rsvpSection = readSource('src/sections/components/RsvpSection.tsx');
    const interactiveService = readSource('src/sections/interactiveSectionService.ts');

    expect(siteView).toContain('fetchPublicSiteAccess({');
    expect(siteView).not.toContain('fetchPublishedSections(');
    expect(siteView).not.toContain('PageRendererFromDB');
    expect(siteView).not.toContain("from '../data/siteRepository'");
    expect(vaultContribute).toContain('fetchPublicSiteAccess({');
    expect(rsvpSection).toContain("supabase.functions.invoke('public-site-access'");
    expect(interactiveService).not.toContain("supabase.functions.invoke('public-site-access'");
    expect(publicSiteAccess).not.toContain(".from('wedding_sites')");
    expect(publicSiteAccess).not.toContain('fetchPublicSiteTranslation');
  });

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
    expect(siteView).toContain('hasLiveRegistryItems(data.id as string, subresourceAccess)');
    expect(siteView).not.toContain('hasLiveRegistryItems(siteId, access)');
    expect(siteView).not.toContain('fetchPublishedSections(');
    expect(siteView).not.toContain('PageRendererFromDB');
    expect(siteView).not.toContain('Loading wedding site...');
    expect(siteView).not.toContain('Something went wrong');
    expect(siteViewService).toContain("supabase.functions.invoke('public-itinerary-by-slug'");
    expect(siteViewService).toContain("supabase.functions.invoke('public-registry-items'");

    const eventHub = readSource('src/pages/EventHub.tsx');
    const eventHubLiveContent = readSource('src/pages/EventHubLiveContent.tsx');
    const guestHubService = readSource('src/pages/guestHubPublicService.ts');
    expect(eventHub).toContain("from './EventHubRouteView'");
    expect(eventHub).toContain("from './EventHubLiveContent'");
    expect(eventHub).toContain("from './guestHubPublicService'");
    expect(eventHub).toContain('<EventHubRouteView');
    expect(eventHub).toContain('<EventHubLiveContent');
    expect(eventHub).toContain('fetchGuestHubConfig<');
    expect(eventHub).toContain("trackGuestHubEvent(slug, 'view', '/event'");
    expect(eventHub).toContain('submitGuestHubProspect(');
    expect(eventHub).toContain('buildGuestHubAccessPayload(slug, searchParams)');
    expect(eventHub).toContain('guestInviteToken: guestIdentity.guestInviteToken');
    expect(eventHub).not.toContain('if (!slug) {');
    expect(eventHubLiveContent).toContain("from './EventHubConfigStatusCard'");
    expect(eventHubLiveContent).toContain("Travel guest path");
    expect(guestHubService).toContain('/functions/v1/guest-hub-config?site=');
    expect(guestHubService).toContain('/functions/v1/guest-hub-track');
    expect(guestHubService).toContain('/functions/v1/guest-prospect-submit');

    const eventRecap = readSource('src/pages/EventRecap.tsx');
    const eventRecapLiveContent = readSource('src/pages/EventRecapLiveContent.tsx');
    expect(eventRecap).toContain("from './EventRecapLiveContent'");
    expect(eventRecap).toContain("from './guestHubPublicService'");
    expect(eventRecap).toContain("from '../components/site/OwnerPreviewBanner'");
    expect(eventRecap).toContain('<EventRecapLiveContent');
    expect(eventRecap).toContain('<OwnerPreviewBanner />');
    expect(eventRecap).toContain('captureGuestInviteTokenFromSearch(slug, searchParams);');
    expect(eventRecap).toContain('fetchGuestRecapConfig<RecapData>(');
    expect(eventRecap).toContain("trackGuestHubEvent(slug, 'view', '/event/recap'");
    expect(eventRecap).toContain('submitGuestHubProspect(');
    expect(eventRecap).toContain('buildEventRecapGuestHubAccessPayload(slug)');
    expect(eventRecap).not.toContain("{loading && <div className=\"mt-6 rounded-lg border border-neutral-200 bg-white p-6 text-neutral-600\">");
    expect(eventRecap).not.toContain("{error && <div className=\"mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-neutral-700\">");
    expect(eventRecapLiveContent).toContain("from './EventRecapRouteView'");
    expect(eventRecapLiveContent).toContain('{t(\'event_recap.back_hub\')}');
    expect(guestHubService).toContain('/functions/v1/guest-recap-config?site=');

    const photoUpload = readSource('src/pages/PhotoUpload.tsx');
    const photoUploadStatusPanel = readSource('src/pages/PhotoUploadStatusPanel.tsx');
    const guestSubmissionService = readSource('src/pages/guestPublicSubmissionService.ts');
    expect(photoUpload).toContain("from '../components/site/OwnerPreviewBanner'");
    expect(photoUpload).toContain('<OwnerPreviewBanner />');
    expect(photoUpload).toContain("from './PhotoUploadStatusPanel'");
    expect(photoUpload).toContain('<PhotoUploadStatusPanel');
    expect(photoUpload).toContain("from './guestPublicSubmissionService'");
    expect(photoUpload).toContain('uploadGuestPhotos(form)');
    expect(photoUpload).toContain('submitGuestHubProspect(');
    expect(photoUpload).toContain('buildPhotoUploadAccessPayload(siteSlug)');
    expect(photoUpload).toContain('captureGuestInviteTokenFromSearch(siteSlug, params);');
    expect(photoUploadStatusPanel).toContain("href={`/event/${encodeURIComponent(siteSlug)}/recap`}");
    expect(guestSubmissionService).toContain('/functions/v1/photo-upload');
    expect(guestHubService).toContain('/functions/v1/guest-prospect-submit');

    const vaultContribute = readSource('src/pages/VaultContribute.tsx');
    const vaultContributionService = readSource('src/pages/vaultContributionService.ts');
    expect(vaultContribute).toContain("from '../components/site/OwnerPreviewBanner'");
    expect(vaultContribute).toContain('<OwnerPreviewBanner />');
    expect(vaultContribute).not.toContain("from '../lib/supabase'");
    expect(vaultContribute).toContain("from './VaultContributeRouteView'");
    expect(vaultContribute).toContain("from './vaultContributionService'");
    expect(vaultContribute).toContain('<VaultContributeRouteView');
    expect(vaultContribute).toContain('loadEnabledVaultContributionConfig(siteSlug, vaultYear, buildVaultAccessPayload(siteSlug))');
    expect(vaultContribute).toContain('listEnabledVaultContributionConfigs(siteSlug, buildVaultAccessPayload(siteSlug))');
    expect(vaultContribute).toContain('captureGuestInviteTokenFromSearch(siteSlug, searchParams);');
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
    const guestbookFormPanel = readSource('src/pages/GuestbookSubmitFormPanel.tsx');
    expect(guestbook).toContain("from '../components/site/OwnerPreviewBanner'");
    expect(guestbook).toContain('<OwnerPreviewBanner />');
    expect(guestbook).toContain("from './GuestbookSubmitFormPanel'");
    expect(guestbook).toContain('<GuestbookSubmitFormPanel');
    expect(guestbook).toContain("from './guestPublicSubmissionService'");
    expect(guestbook).toContain('submitGuestbookEntry({');
    expect(guestbook).toContain('buildGuestbookAccessPayload(siteSlug)');
    expect(guestbook).toContain('captureGuestInviteTokenFromSearch(siteSlug, searchParams);');
    expect(guestbookFormPanel).toContain('id="guestbook-message"');
    expect(guestbookFormPanel).toContain('Back to wedding hub');
    expect(guestSubmissionService).toContain('/functions/v1/guestbook-submit');

    const guestContact = readSource('src/pages/GuestContactUpdate.tsx');
    const guestContactLookupPanel = readSource('src/pages/GuestContactLookupPanel.tsx');
    expect(guestContact).toContain("from '../components/site/OwnerPreviewBanner'");
    expect(guestContact).toContain('<OwnerPreviewBanner />');
    expect(guestContact).toContain("from './GuestContactLookupPanel'");
    expect(guestContact).toContain('<GuestContactLookupPanel');
    expect(guestContact).toContain("from './guestPublicSubmissionService'");
    expect(guestContact).toContain("callGuestContactFunction<{ matches?: Match[] }>('guest-contact-lookup'");
    expect(guestContact).toContain("callGuestContactFunction('guest-contact-submit'");
    expect(guestContact).toContain('buildGuestContactAccessPayload(siteRef)');
    expect(guestContactLookupPanel).toContain('id="guest-contact-search"');
    expect(guestContactLookupPanel).toContain('id="guest-contact-match"');
    expect(guestSubmissionService).toContain('/functions/v1/${name}');

    const rsvpPage = readSource('src/pages/RSVP.tsx');
    const rsvpDerivedViewState = readSource('src/pages/buildRsvpDerivedViewState.ts');
    const rsvpAmbiguousLookupState = readSource('src/pages/applyAmbiguousRsvpLookupState.ts');
    const rsvpManualLookupResult = readSource('src/pages/applyManualRsvpLookupResult.ts');
    const rsvpResolvedGuest = readSource('src/pages/applyResolvedRsvpGuest.ts');
    const rsvpGuestSelection = readSource('src/pages/applyRsvpGuestSelection.ts');
    const rsvpLookupGuest = readSource('src/pages/lookupRsvpGuest.ts');
    const rsvpLookupToken = readSource('src/pages/lookupRsvpToken.ts');
    const rsvpRunGuestLookup = readSource('src/pages/runRsvpGuestLookup.ts');
    const rsvpRunSubmit = readSource('src/pages/runRsvpSubmit.ts');
    const rsvpRunTokenLookup = readSource('src/pages/runRsvpTokenLookup.ts');
    const rsvpSubmitSuccess = readSource('src/pages/applyRsvpSubmitSuccess.ts');
    const rsvpTokenLookupResult = readSource('src/pages/applyTokenRsvpLookupResult.ts');
    const rsvpSubmitPayload = readSource('src/pages/buildRsvpSubmitPayload.ts');
    const rsvpSubmitSuccessArgs = readSource('src/pages/buildRsvpSubmitSuccessArgs.ts');
    const rsvpTokenLookupPreparation = readSource('src/pages/prepareRsvpTokenLookupState.ts');
    const rsvpLookupClassification = readSource('src/pages/classifyRsvpLookupResponse.ts');
    const rsvpLiveContentActions = readSource('src/pages/buildRsvpLiveContentActions.ts');
    const rsvpPageViewModel = readSource('src/pages/buildRsvpPageViewModel.ts');
    const rsvpLiveContentProps = readSource('src/pages/buildRsvpLiveContentViewProps.ts');
    const rsvpResetLookupFlow = readSource('src/pages/resetRsvpLookupFlow.ts');
    const rsvpResetPageState = readSource('src/pages/resetRsvpPageState.ts');
    const rsvpRestoreLoadedState = readSource('src/pages/restoreLoadedRsvpState.ts');
    const rsvpPageRouteView = readSource('src/pages/RsvpPageRouteView.tsx');
    const rsvpValidateAdvance = readSource('src/pages/validateRsvpFormAdvance.ts');
    const rsvpValidateSubmitReadiness = readSource('src/pages/validateRsvpSubmitReadiness.ts');
    const rsvpDemoSubmit = readSource('src/pages/applyDemoRsvpSubmit.ts');
    const rsvpSubmitResponse = readSource('src/pages/submitRsvpResponse.ts');
    const rsvpLiveContentView = readSource('src/pages/RsvpLiveContentView.tsx');
    const rsvpTokenLoadingView = readSource('src/pages/RsvpTokenLoadingView.tsx');
    const rsvpFlowView = readSource('src/pages/RsvpFlowView.tsx');
    const rsvpFormView = readSource('src/pages/RsvpFormView.tsx');
    const rsvpGuestPickerView = readSource('src/pages/RsvpGuestPickerView.tsx');
    const rsvpSearchView = readSource('src/pages/RsvpSearchView.tsx');
    const rsvpSuccessView = readSource('src/pages/RsvpSuccessView.tsx');
    const eventRsvpPage = readSource('src/pages/EventRSVP.tsx');
    const eventRsvpLiveContent = readSource('src/pages/EventRsvpLiveContent.tsx');
    const rsvpFunctionService = readSource('src/pages/rsvpFunctionService.ts');
    const rsvpRouteView = readSource('src/pages/RsvpRouteView.tsx');
    expect(rsvpPage).toContain("from './buildRsvpDerivedViewState'");
    expect(rsvpPage).toContain("from './applyManualRsvpLookupResult'");
    expect(rsvpPage).toContain("from './applyResolvedRsvpGuest'");
    expect(rsvpPage).toContain("from './applyRsvpSubmitSuccess'");
    expect(rsvpPage).toContain("from './applyTokenRsvpLookupResult'");
    expect(rsvpPage).toContain("from './runRsvpGuestLookup'");
    expect(rsvpPage).toContain("from './runRsvpSubmit'");
    expect(rsvpPage).toContain("from './runRsvpTokenLookup'");
    expect(rsvpPage).toContain("from './buildRsvpSubmitPayload'");
    expect(rsvpPage).toContain("from './buildRsvpSubmitSuccessArgs'");
    expect(rsvpPage).toContain("from './prepareRsvpTokenLookupState'");
    expect(rsvpPage).toContain("from './buildRsvpLiveContentActions'");
    expect(rsvpPage).toContain("from './buildRsvpPageViewModel'");
    expect(rsvpPage).toContain("from './buildRsvpLiveContentViewProps'");
    expect(rsvpPage).toContain("from './resetRsvpLookupFlow'");
    expect(rsvpPage).toContain("from './resetRsvpPageState'");
    expect(rsvpPage).toContain("from './restoreLoadedRsvpState'");
    expect(rsvpPage).toContain("from './RsvpPageRouteView'");
    expect(rsvpPage).toContain("from './validateRsvpFormAdvance'");
    expect(rsvpPage).toContain("from './validateRsvpSubmitReadiness'");
    expect(rsvpPage).toContain("from './applyDemoRsvpSubmit'");
    expect(rsvpPage).toContain("from './submitRsvpResponse'");
    expect(rsvpPage).toContain('<RsvpPageRouteView');
    expect(rsvpPage).toContain('buildRsvpDerivedViewState({');
    expect(rsvpPage).toContain('applyResolvedRsvpGuest({');
    expect(rsvpPage).toContain('runRsvpGuestLookup({');
    expect(rsvpPage).toContain('runRsvpSubmit({');
    expect(rsvpPage).toContain('runRsvpTokenLookup({');
    expect(rsvpPage).toContain('prepareRsvpTokenLookupState({');
    expect(rsvpPage).toContain('buildRsvpLiveContentActions({');
    expect(rsvpPage).toContain('buildRsvpPageViewModel({');
    expect(rsvpPage).toContain('resetRsvpLookupFlow({');
    expect(rsvpPage).toContain('resetRsvpPageState({');
    expect(rsvpPage).toContain('restoreLoadedRsvpState({');
    expect(rsvpPage).toContain('const liveContentProps = buildRsvpLiveContentViewProps({');
    expect(rsvpPage).toContain('validateRsvpFormAdvance({');
    expect(rsvpDerivedViewState).toContain('guestPredictions');
    expect(rsvpDerivedViewState).toContain('childCountOptions');
    expect(rsvpDerivedViewState).toContain('inheritedHouseholdMembers');
    expect(rsvpAmbiguousLookupState).toContain('setAmbiguousGuests(guests)');
    expect(rsvpAmbiguousLookupState).toContain('setSelectedHouseholdGuestIds(householdGuests.map((guest) => guest.id))');
    expect(rsvpAmbiguousLookupState).toContain("setStep('pick')");
    expect(rsvpAmbiguousLookupState).toContain("export function applyAmbiguousRsvpLookupState");
    expect(rsvpManualLookupResult).toContain('fallbackGuest');
    expect(rsvpManualLookupResult).toContain('classifyRsvpLookupResponse(data as LookupResponse)');
    expect(rsvpManualLookupResult).toContain('applyAmbiguousRsvpLookupState({');
    expect(rsvpManualLookupResult).toContain('setError(normalizeRsvpGuestError(error))');
    expect(rsvpManualLookupResult).toContain('setError(RSVP_LOOKUP_ERROR_COPY)');
    expect(rsvpResolvedGuest).toContain("tokenLinkedSessionRef.current = source === 'token'");
    expect(rsvpResolvedGuest).toContain('deriveSelectedHouseholdGuestIds(normalizedRsvp, household)');
    expect(rsvpResolvedGuest).toContain('applyRsvpGuestSelection({');
    expect(rsvpLookupGuest).toContain("action: 'lookup_guest'");
    expect(rsvpLookupGuest).toContain("action: 'lookup'");
    expect(rsvpLookupGuest).toContain("data: demoLookup(guestId ?? searchValue?.trim() ?? '')");
    expect(rsvpRunGuestLookup).toContain("from './lookupRsvpGuest'");
    expect(rsvpRunGuestLookup).toContain('await lookupRsvpGuest({');
    expect(rsvpRunGuestLookup).toContain('applyManualRsvpLookupResult({');
    expect(rsvpRunGuestLookup).toContain("lookupSource === 'pick' && fallbackGuest");
    expect(rsvpRunSubmit).toContain('validateRsvpSubmitReadiness({');
    expect(rsvpRunSubmit).toContain('buildRsvpSubmitPayload({');
    expect(rsvpRunSubmit).toContain('applyDemoRsvpSubmit({ payload, targetGuestIds: targetIds })');
    expect(rsvpRunSubmit).toContain('await submitRsvpResponse({');
    expect(rsvpRunSubmit).toContain('applyRsvpSubmitSuccess(buildRsvpSubmitSuccessArgs({');
    expect(rsvpLookupToken).toContain("action: 'lookup'");
    expect(rsvpLookupToken).toContain("data: demoLookup(token) as unknown");
    expect(rsvpRunTokenLookup).toContain('await lookupRsvpToken({');
    expect(rsvpRunTokenLookup).toContain("from './lookupRsvpToken'");
    expect(rsvpRunTokenLookup).toContain('applyTokenRsvpLookupResult({');
    expect(rsvpRunTokenLookup).toContain('setError(RSVP_LOOKUP_ERROR_COPY);');
    expect(rsvpGuestSelection).toContain('existingFormData');
    expect(rsvpGuestSelection).toContain('setRsvpSessionToken(sessionToken)');
    expect(rsvpGuestSelection).toContain("setStep('form')");
    expect(rsvpSubmitSuccess).toContain('onContinuityUpdate()');
    expect(rsvpSubmitSuccess).toContain("setStep('success')");
    expect(rsvpSubmitSuccess).toContain('normalizeSelectedHouseholdGuestIds(');
    expect(rsvpTokenLookupResult).toContain("source?: 'manual' | 'token'");
    expect(rsvpTokenLookupResult).toContain('shouldPreserveVisibleState');
    expect(rsvpTokenLookupResult).toContain('setError(RSVP_LOOKUP_ERROR_COPY)');
    expect(rsvpSubmitPayload).toContain('targetGuestIds');
    expect(rsvpSubmitPayload).toContain('normalizedExistingRsvp');
    expect(rsvpSubmitPayload).toContain('plusOneCount: plusOneName ? 1 : 0');
    expect(rsvpSubmitSuccessArgs).toContain('ignoreNextLocalContinuityEventRef.current = true');
    expect(rsvpSubmitSuccessArgs).toContain('notifyRsvpContinuityUpdate()');
    expect(rsvpSubmitSuccessArgs).toContain("submitSource: tokenLinkedSession ? 'token' : 'manual'");
    expect(rsvpTokenLookupPreparation).toContain("kind: 'empty'");
    expect(rsvpTokenLookupPreparation).toContain("kind: 'lookup'");
    expect(rsvpTokenLookupPreparation).toContain('searchValue: token');
    expect(rsvpLookupClassification).toContain("kind: 'guest'");
    expect(rsvpLookupClassification).toContain("kind: 'ambiguous'");
    expect(rsvpLookupClassification).toContain("kind: 'not_found'");
    expect(rsvpLiveContentActions).toContain('onCancelLoading');
    expect(rsvpLiveContentActions).toContain('onDone');
    expect(rsvpLiveContentActions).toContain('onSubmitAnother');
    expect(rsvpPageViewModel).toContain('guestDisplayName');
    expect(rsvpPageViewModel).toContain('deadlinePassed');
    expect(rsvpPageViewModel).toContain('searchInputId');
    expect(rsvpResetLookupFlow).toContain('setFormData({');
    expect(rsvpResetLookupFlow).toContain('setMealConfig(DEFAULT_MEAL_CONFIG)');
    expect(rsvpResetLookupFlow).toContain('setSelectedHouseholdGuestIds([])');
    expect(rsvpResetPageState).toContain('setTokenAutoLoading?.(false)');
    expect(rsvpResetPageState).toContain("setStep('search')");
    expect(rsvpResetPageState).toContain('setSearchValue(searchValue)');
    expect(rsvpRestoreLoadedState).toContain("setStep('form')");
    expect(rsvpRestoreLoadedState).toContain('setExistingRsvp(normalizedExistingRsvp)');
    expect(rsvpRestoreLoadedState).toContain('tokenLinkedSessionRef.current = !!activeToken');
    expect(rsvpValidateSubmitReadiness).toContain('The RSVP deadline has passed.');
    expect(rsvpValidateSubmitReadiness).toContain('Please use the RSVP button from your invitation email');
    expect(rsvpValidateSubmitReadiness).toContain('Please choose at least one event from your invitation');
    expect(rsvpValidateSubmitReadiness).toContain('Pick at least one household guest to share this RSVP with');
    expect(rsvpDemoSubmit).toContain('readDemoStoredResponses()');
    expect(rsvpDemoSubmit).toContain('writeDemoStoredResponses(stored)');
    expect(rsvpDemoSubmit).toContain("id: `demo-rsvp-${id}`");
    expect(rsvpSubmitResponse).toContain("action: 'submit'");
    expect(rsvpSubmitResponse).toContain('callValidateRsvpToken({');
    expect(rsvpSubmitResponse).toContain('submitSucceeded');
    expect(rsvpPageRouteView).toContain("from './RsvpRouteView'");
    expect(rsvpPageRouteView).toContain("from './RsvpLiveContentView'");
    expect(rsvpPageRouteView).toContain("from './RsvpTokenLoadingView'");
    expect(rsvpPageRouteView).toContain('<RsvpRouteView');
    expect(rsvpPageRouteView).toContain('<RsvpLiveContentView');
    expect(rsvpPageRouteView).toContain('<RsvpTokenLoadingView');
    expect(rsvpLiveContentProps).toContain('return props;');
    expect(rsvpValidateAdvance).toContain('Please choose a meal option before review.');
    expect(rsvpValidateAdvance).toContain('Please answer:');
    expect(rsvpPage).toContain("from './rsvpFunctionService'");
    expect(rsvpLookupGuest).toContain("callValidateRsvpToken({");
    expect(rsvpLookupToken).toContain("callValidateRsvpToken({");
    expect(rsvpRouteView).toContain('if (tokenAutoLoading) return <>{tokenAutoLoadingView}</>;');
    expect(rsvpTokenLoadingView).toContain('Loading your invitation…');
    expect(rsvpTokenLoadingView).toContain('Enter invitation code instead');
    expect(rsvpLiveContentView).toContain("from './RsvpSearchView'");
    expect(rsvpLiveContentView).toContain("from './RsvpFlowView'");
    expect(rsvpLiveContentView).toContain("from './RsvpFormView'");
    expect(rsvpLiveContentView).toContain("from './RsvpGuestPickerView'");
    expect(rsvpLiveContentView).toContain("from './RsvpSuccessView'");
    expect(rsvpLiveContentView).toContain('step === \'search\' ?');
    expect(rsvpLiveContentView).toContain('<RsvpSearchView');
    expect(rsvpLiveContentView).toContain('<RsvpFlowView');
    expect(rsvpLiveContentView).toContain('<RsvpFormView');
    expect(rsvpLiveContentView).toContain('<RsvpGuestPickerView');
    expect(rsvpLiveContentView).toContain('<RsvpSuccessView');
    expect(rsvpFlowView).toContain("{step === 'pick' && pickerContent}");
    expect(rsvpFlowView).toContain("{step === 'form' && formContent}");
    expect(rsvpFlowView).toContain("{step === 'success' && successContent}");
    expect(rsvpFormView).toContain('Welcome, {guestDisplayName}!');
    expect(rsvpFormView).toContain("Can't submit — missing invitation link");
    expect(rsvpFormView).toContain("Continue to review");
    expect(rsvpGuestPickerView).toContain('Multiple matches found');
    expect(rsvpGuestPickerView).toContain('Search again');
    expect(rsvpSearchView).toContain("{t('rsvp.hero_title')}");
    expect(rsvpSearchView).toContain("{t('rsvp.search_button')}");
    expect(rsvpSuccessView).toContain(`{formData.attending ? "You're confirmed!" : "Response recorded"}`);
    expect(rsvpSuccessView).toContain('Submit another RSVP');
    expect(eventRsvpPage).toContain("from './rsvpFunctionService'");
    expect(eventRsvpPage).toContain("from './EventRsvpRouteView'");
    expect(eventRsvpPage).toContain("from './EventRsvpLiveContent'");
    expect(eventRsvpPage).toContain('const CAN_USE_EVENT_RSVP_FUNCTION = hasRsvpFunctionRuntime()');
    expect(eventRsvpPage).toContain('<EventRsvpRouteView');
    expect(eventRsvpPage).toContain('<EventRsvpLiveContent');
    expect(eventRsvpPage).toContain("callValidateRsvpToken<Record<string, unknown>>({");
    expect(eventRsvpLiveContent).toContain('Hello, {guestName}!');
    expect(eventRsvpLiveContent).toContain('No additional events found for your invitation.');
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
