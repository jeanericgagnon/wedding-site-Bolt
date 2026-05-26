import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('super nice launch backlog safety guards', () => {
  it('keeps canonical smoke aligned with the proof board launch source of truth', () => {
    const source = read('scripts/v1-proof-canonical-smoke.mjs');

    expect(source).toContain('canonical_route_smoke_green_defer_to_current_proof_board_for_launch_call');
    expect(source).toContain('defer_to_docs_v1_smoke_proof_log_and_proof_board');
    expect(source).toContain('it still defers the launch call to the proof-board flow instead of regenerating or replacing launch-truth artifacts');
    expect(source).toContain('canonicalSmokeGreenButLaunchRed: false');
    expect(source).not.toContain("publicV1ClaimStatus: 'hold_for_post_deploy_runtime_truth_rerun'");
    expect(source).not.toContain("launchCallRightNow: 'hold_until_post_deploy_wording_and_couple_path_rerun'");
    expect(source).not.toContain('post_deploy_runtime_truth_rerun_pending');
  });

  it('keeps live exploratory evidence writing resilient when the result folder is absent', () => {
    const source = read('scripts/live-exploratory-click-upload.mjs');

    expect(source).toContain("mkdirSync(outDir, { recursive: true });");
    const mkdirMatches = source.match(/mkdirSync\(outDir, \{ recursive: true \}\);/g) ?? [];
    expect(mkdirMatches.length).toBeGreaterThanOrEqual(2);
    expect(source.indexOf("mkdirSync(outDir, { recursive: true });")).toBeLessThan(source.indexOf('writeFileSync(outPath'));
    expect(source.lastIndexOf("mkdirSync(outDir, { recursive: true });")).toBeLessThan(source.lastIndexOf('writeFileSync(outPath'));
  });

  it('keeps Overview public-site tab opens isolated from the opener page', () => {
    const source = read('src/pages/dashboard/Overview.tsx');

    expect(source).not.toContain("window.open(`/site/${stats.siteSlug}`, '_blank')");
    expect(source).not.toContain("window.open(`/site/${stats.siteSlug}`, '_blank', 'noopener,noreferrer')");
    expect(source).not.toContain("window.open('/site/");
  });

  it('keeps external blank-target links explicit about opener isolation', () => {
    const files = [
      'src/pages/VendorProfileCreate.tsx',
      'src/pages/dashboard/registry/RegistryItemCard.tsx',
      'src/pages/VendorProfile.tsx',
      'src/sections/components/RegistrySection.tsx',
      'src/components/dashboard/DashboardLayout.tsx',
      'src/pages/dashboard/BuilderVariantGallery.tsx',
    ];

    for (const file of files) {
      const source = read(file);
      expect(source, file).not.toContain('rel="noreferrer"');
      expect(source, file).not.toContain("rel='noreferrer'");
    }
  });

  it('keeps audited recoverable fallback paths from dumping raw errors to the browser console', () => {
    const planning = read('src/pages/dashboard/Planning.tsx');
    const guests = read('src/pages/dashboard/Guests.tsx');
    const guestCsvImport = read('src/pages/dashboard/guests/useGuestDashboardCsvImport.ts');
    const onboarding = read('src/pages/Onboarding.tsx');
    const vault = read('src/pages/dashboard/Vault.tsx');
    const vaultActions = read('src/pages/dashboard/useVaultDashboardActions.ts');
    const vaultData = read('src/pages/dashboard/useVaultDashboardData.ts');
    const songRequests = read('src/pages/dashboard/planning/SongRequestsTab.tsx');
    const addressCollection = read('src/pages/dashboard/planning/AddressCollectionTab.tsx');
    const errorLogs = read('src/pages/dashboard/ErrorLogs.tsx');
    const builderSectionRenderer = read('src/builder/components/SectionRenderer.tsx');
    const acceptCollaboratorInvite = read('src/pages/AcceptCollaboratorInvite.tsx');
    const aiDraft = read('src/lib/aiDraftGenerator.ts');
    const aiOnboarding = read('src/lib/aiOnboarding.ts');
    const aiClarifyingQuestions = read('src/lib/aiClarifyingQuestions.ts');
    const billingModal = read('src/components/billing/BillingModal.tsx');
    const paymentRequired = read('src/pages/PaymentRequired.tsx');
    const customerSafeError = read('src/lib/customerSafeError.ts');
    const publicSiteAccess = read('src/lib/publicSiteAccess.ts');
    const guestPhotoSharing = read('src/pages/dashboard/GuestPhotoSharing.tsx');
    const guestPhotoDashboardData = read('src/pages/dashboard/guestPhotos/useGuestPhotoDashboardData.ts');
    const vaultContribute = read('src/pages/VaultContribute.tsx');
    const quickStart = read('src/pages/onboarding/QuickStart.tsx');
    const googleDriveHealth = read('supabase/functions/google-drive-health/index.ts');
    const itinerary = read('src/pages/dashboard/Itinerary.tsx');
    const itineraryTimelineActions = read('src/pages/dashboard/useItineraryTimelineActions.ts');
    const registryService = read('src/pages/dashboard/registry/registryService.ts');
    const stripeService = read('src/lib/stripeService.ts');
    const messages = read('src/pages/dashboard/Messages.tsx');
    const messageService = read('src/pages/dashboard/messages/messageService.ts');
    const messageDeliveryActions = read('src/pages/dashboard/messages/useMessageDeliveryActions.ts');
    const messageComposeActions = read('src/pages/dashboard/messages/useMessageComposeActions.ts');
    const messageUtils = read('src/pages/dashboard/messages/messageDashboardUtils.ts');
    const emailService = read('src/lib/emailService.ts');
    const guestContactUpdate = read('src/pages/GuestContactUpdate.tsx');
    const eventHub = read('src/pages/EventHub.tsx');
    const eventRecap = read('src/pages/EventRecap.tsx');
    const guestbookSubmit = read('src/pages/GuestbookSubmit.tsx');
    const settingsSiteData = read('src/pages/dashboard/settings/settingsSiteData.ts');
    const guestPhotoSharingService = read('src/pages/dashboard/guestPhotoSharingService.ts');
    const serviceRoleProof = read('scripts/v1-proof-service-role-authorization.mjs');
    const emailMessagingProof = read('scripts/v1-proof-email-messaging-authorization.mjs');
    const collaboratorRuntimeProof = read('scripts/v1-proof-collaborator-runtime.mjs');
    const actionAudit = read('src/lib/actionAudit.ts');
    const plannerAccess = read('src/lib/plannerAccess.ts');
    const setupDraft = read('src/lib/setupDraft.ts');
    const quickStartStateTransfer = read('src/lib/quickStartStateTransfer.ts');
    const guidedSetupPersistence = read('src/lib/guidedSetupPersistence.ts');
    const guidedSetup = read('src/pages/onboarding/GuidedSetup.tsx');
    const onboardingDraftPersistence = read('src/lib/onboardingDraftPersistence.ts');
    const coordinatorStorage = read('src/pages/dashboard/coordinator/coordinatorStorage.ts');
    const guestPhotoSharingUtils = read('src/pages/dashboard/guestPhotoSharingUtils.ts');
    const guestDashboardStorage = read('src/pages/dashboard/guests/guestDashboardStorage.ts');
    const settingsDemoStorage = read('src/pages/dashboard/settings/settingsDemoStorage.ts');
    const rsvpDemoStorage = read('src/pages/rsvpDemoStorage.ts');
    const messageDemoStorage = read('src/pages/dashboard/messages/messageDemoStorage.ts');
    const seatingDemoStorage = read('src/pages/dashboard/seating/seatingDemoStorage.ts');
    const itineraryDemoStorage = read('src/pages/dashboard/itineraryDemoStorage.ts');
    const dashboardItinerary = read('src/pages/dashboard/Itinerary.tsx');
    const itineraryData = read('src/pages/dashboard/useItineraryDashboardData.ts');
    const vaultDemoStorage = read('src/pages/vaultDemoStorage.ts');
    const vaultCard = read('src/pages/dashboard/VaultCard.tsx');
    const dashboardVault = read('src/pages/dashboard/Vault.tsx');
    const supabaseClient = read('src/lib/supabase.ts');
    const envConfig = read('src/config/env.ts');
    const mainEntry = read('src/main.tsx');
    const authContext = read('src/contexts/AuthContext.tsx');
    const localE2EBypassStorage = read('src/lib/localE2EBypassStorage.ts');

    expect(planning).not.toContain('console.error(err)');
    expect(guests).not.toContain('console.error(error)');
    expect(guests).not.toContain("const msg = err instanceof Error ? err.message : 'Couldn’t read that guest file.'");
    expect(guestCsvImport).toContain('safeGuestImportReadError, safeGuestsDashboardError');
    expect(guestCsvImport).toContain("toast(safeGuestImportReadError(err), 'error');");
    expect(onboarding).not.toContain("console.error('ONBOARDING_NEXT_STEP_FAILED', error)");
    expect(songRequests).not.toContain('console.error(err)');
    expect(addressCollection).not.toContain('console.error(err)');
    expect(vault).not.toContain('providerErr instanceof Error ? providerErr.message');
    expect(vault).not.toContain('Google Drive connection failed: ${error.message}');
    expect(vault).not.toContain('Google Drive OAuth was cancelled or failed: ${oauthError}');
    expect(vault).not.toContain('throw new Error(error.message);');
    expect(vaultActions).toContain("throw new Error('A vault for that anniversary already exists.')");
    expect(vaultActions).toContain("throw new Error('Couldn’t update this vault. Please try again.')");
    expect(vaultActions).toContain("throw new Error('Couldn’t save this vault entry. Please try again.')");
    expect(vaultData).toContain('Google Drive connection failed. Please try again.');
    expect(vaultData).toContain('Google Drive connected, but dayof could not finish the vault backup setup. Please try reconnecting.');
    expect(errorLogs).not.toContain('setError(error.message)');
    expect(errorLogs).toContain('Couldn’t verify error-log access right now.');
    expect(builderSectionRenderer).not.toContain('errorMessage: error.message');
    expect(builderSectionRenderer).not.toContain('errorMessage: string | null');
    expect(acceptCollaboratorInvite).not.toContain("setInviteLookupDebug(error.message || 'Invite lookup needs retry')");
    expect(acceptCollaboratorInvite).not.toContain('No invite row matched this token. rows=');
    expect(acceptCollaboratorInvite).not.toContain("trace(`finishClaim:error:${err instanceof Error ? err.message : 'invite-claim-needs-retry'}`)");
    expect(acceptCollaboratorInvite).toContain("setInviteLookupDebug('Invite lookup needs retry')");
    expect(acceptCollaboratorInvite).toContain("setInviteLookupDebug('No invite row matched this token.')");
    expect(acceptCollaboratorInvite).toContain("trace('finishClaim:error:invite-claim-needs-retry')");
    expect(aiClarifyingQuestions).not.toContain('OpenAI clarifying-question generation failed: ${error instanceof Error ? error.message : String(error)}');
    expect(aiClarifyingQuestions).toContain('Clarifying-question generation failed. Please use the deterministic setup flow.');
    expect(billingModal).not.toContain('return raw;');
    expect(billingModal).toContain("return 'No wedding site found. Complete setup first.';");
    expect(paymentRequired).not.toContain('const lower = raw.toLowerCase();');
    expect(paymentRequired).not.toContain('return raw;');
    expect(paymentRequired).toContain("return 'Couldn’t create your website record right now. Please refresh and try again.';");
    expect(customerSafeError).toContain('duplicate\\s*key');
    expect(customerSafeError).toContain('constraint');
    expect(customerSafeError).toContain('customerSafeErrorMessage');
    expect(envConfig).not.toContain('Supabase is not configured');
    expect(envConfig).not.toContain('Please set VITE_SUPABASE_URL');
    expect(envConfig).toContain('DayOf is still being connected. Please try again shortly.');
    expect(mainEntry).not.toContain('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required');
    expect(mainEntry).toContain('[dayof] App connection settings are missing.');
    expect(authContext).not.toContain('Supabase is not configured');
    expect(authContext).toContain('DayOf is still being connected. Please try again shortly.');
    expect(publicSiteAccess).not.toContain("throw new Error((json as { error?: string }).error || `Error ${response.status}`)");
    expect(publicSiteAccess).toContain('safePublicSiteAccessError');
    expect(guestPhotoDashboardData).toContain("setError(safePhotoOwnerError(err, 'Couldn’t load the photo space. Please refresh and try again.'))");
    expect(guestPhotoSharing).not.toContain('return cleaned;');
    expect(guestPhotoSharingUtils).toContain('function buildBucketLinksStorageKey(storageScope?: string | null): string {');
    expect(vaultContribute).not.toContain('`${err.message} Uploading original video instead.`');
    expect(vaultContribute).toContain("setSubmitError('Couldn’t prepare a smaller version. Uploading the original video instead.');");
    expect(quickStart).not.toContain('setAiDebug(`finish_failed=${err instanceof Error ? err.message : String(err)}`)');
    expect(quickStart).toContain("setAiDebug('finish_failed=retry_safe')");
    expect(googleDriveHealth).not.toContain('message: err instanceof Error ? err.message : "Health check failed."');
    expect(googleDriveHealth).toContain('GOOGLE_DRIVE_HEALTH_CHECK_FAILED');
    expect(googleDriveHealth).toContain('Storage needs attention. Uploads are still available here.');
    expect(itinerary).not.toContain("const message = (err as { message?: string })?.message || 'Couldn’t save event. Please try again.'");
    expect(itinerary).not.toContain('setSaveError(message)');
    expect(itinerary).not.toContain("setSaveError((err as Error)?.message || 'Couldn’t update the timeline.')");
    expect(itinerary).not.toContain("setSaveError((err as Error)?.message || 'Couldn’t build the template.')");
    expect(itineraryTimelineActions).toContain("setSaveError(customerSafeErrorMessage(err, 'Couldn’t save event. Please try again.'))");
    expect(itineraryTimelineActions).toContain("setSaveError(customerSafeErrorMessage(err, 'Couldn’t update the timeline.'))");
    expect(itineraryTimelineActions).toContain("setSaveError(customerSafeErrorMessage(err, 'Couldn’t build the template.'))");
    expect(registryService).not.toContain('throw new Error(error.message)');
    expect(registryService).toContain('REGISTRY_LOAD_ERROR_COPY');
    expect(registryService).toContain('REGISTRY_SAVE_ERROR_COPY');
    expect(registryService).toContain('REGISTRY_DELETE_ERROR_COPY');
    expect(registryService).toContain('REGISTRY_PURCHASE_ERROR_COPY');
    expect(stripeService).not.toContain('throw new Error(error.message)');
    expect(stripeService).not.toContain('throw new Error(out.json.error || out.raw');
    expect(stripeService).not.toContain('throw new Error(json.error || raw');
    expect(stripeService).toContain("const CHECKOUT_ERROR_COPY = 'Could not start checkout. Please try again.';");
    expect(stripeService).toContain("const VERIFY_CHECKOUT_ERROR_COPY = 'Could not confirm payment yet. Please try again.';");
    expect(stripeService).toContain('return fallback;');
    expect(stripeService).not.toContain('throw new Error(out.json.error || CHECKOUT_ERROR_COPY)');
    expect(stripeService).not.toContain('if (json.error) throw new Error(json.error)');
    expect(stripeService).toContain('safePaymentFunctionError(out.json.error, CHECKOUT_ERROR_COPY)');
    expect(stripeService).toContain('safePaymentFunctionError(json.error, VERIFY_CHECKOUT_ERROR_COPY)');
    expect(stripeService).toContain('safePaymentFunctionError(json.error, SMS_CREDITS_CHECKOUT_ERROR_COPY)');
    expect(stripeService).toContain("throw new Error('Couldn’t load billing right now.')");
    expect(stripeService).toContain("throw new Error('Couldn’t check payment status right now.')");
    expect(stripeService).toContain("throw new Error('Couldn’t find your wedding site right now.')");
    expect(messages).toContain('safeMessagesError,');
    expect(messages).not.toContain('throw new Error(body?.error ?? `Send failed (${res.status})`)');
    expect(messages).not.toContain('throw new Error(body?.error ?? `Scheduled send run failed (${res.status})`)');
    expect(messageService).toContain("throw new Error(safeMessagesError((body as { error?: unknown })?.error, 'Delivery needs review. Check message history.'))");
    expect(messageService).toContain("throw new Error(safeMessagesError((body as { error?: unknown })?.error, 'Couldn’t process scheduled messages right now.'))");
    expect(messageDeliveryActions).not.toContain("sendErr instanceof Error ? sendErr.message : 'Delivery needs review. Try again later.'");
    expect(messageDeliveryActions).toContain("toast(safeMessagesError(sendErr, 'Delivery needs review. Try again later.'), 'error');");
    expect(messageComposeActions).toContain("toast(safeMessagesError(sendErr, 'Delivery needs review. Check message history.'), 'error');");
    expect(messageUtils).toContain('return customerSafeErrorMessage(cleaned, fallback, {');
    expect(messageUtils).toContain('\\b(delivery|message|email|phone|contact|recipient|address|number|missing|invalid|blocked|bounced|unsubscribed|review|retry|attention|details)\\b');
    expect(guestContactUpdate).not.toContain("throw new Error((json as any).error || 'Couldn’t reach the couple’s guest list right now.')");
    expect(guestContactUpdate).not.toContain('throw new Error((json as any).error)');
    expect(guestContactUpdate).not.toContain('throw new Error((data as any).error)');
    expect(guestContactUpdate).toContain('safeGuestContactFunctionError');
    expect(eventHub).not.toContain("throw new Error(payload?.error || t('guest_hub.could_not_save'))");
    expect(eventHub).toContain('safeGuestHubFunctionError');
    expect(eventRecap).not.toContain("throw new Error(payload?.error || 'Couldn’t load the recap.')");
    expect(eventRecap).not.toContain("throw new Error(payload?.error || 'Couldn’t save.')");
    expect(eventRecap).toContain('safeEventRecapFunctionError');
    expect(guestbookSubmit).not.toContain("throw new Error(data?.error || 'Couldn’t send your note right now. Please try again in a moment.')");
    expect(guestbookSubmit).toContain('safeGuestbookFunctionError');
    expect(settingsSiteData).not.toContain('throw new Error(payload.error)');
    expect(settingsSiteData).toContain('safeSettingsFunctionError(payload.error');
    expect(emailService).not.toContain('let message = `Email service error (${res.status})`');
    expect(emailService).not.toContain('if (body?.error) message = body.error');
    expect(emailService).toContain('safeEmailFunctionError(body.error)');
    expect(guestPhotoSharingService).not.toContain("throw new Error(siteErr?.message ?? 'Choose a wedding site before managing photos.')");
    expect(guestPhotoSharingService).toContain('safeGuestPhotoOwnerServiceError(siteErr');
    expect(serviceRoleProof).toContain('unsafeDenialCopy');
    expect(serviceRoleProof).toContain('isPublicSafeDenialCopy(result.safeError)');
    expect(emailMessagingProof).toContain('unsafeDenialCopy');
    expect(emailMessagingProof).toContain('isPublicSafeDenialCopy(result.safeError)');
    expect(supabaseClient).toContain('safeFunctionFailureTelemetryMessage');
    expect(supabaseClient).toContain('customerSafeErrorMessage(');
    expect(supabaseClient).not.toContain('message = rawMessage.slice');
    expect(collaboratorRuntimeProof).toContain('runCollaboratorRoleProof');
    expect(collaboratorRuntimeProof).toContain("LIVE_COLLABORATOR_PERMISSION_RLS: '1'");
    expect(collaboratorRuntimeProof).toContain('tests/e2e/collaborator-permission-rls.spec.ts');
    expect(collaboratorRuntimeProof).toContain('stillManualProofNeeded: []');
    expect(collaboratorRuntimeProof).not.toContain('Attempt at least one forbidden action for the claimed collaborator role');
    expect(actionAudit).toContain('SENSITIVE_AUDIT_METADATA_KEY');
    expect(actionAudit).toContain('service[-_]?role');
    expect(actionAudit).toContain('sanitizeAuditMetadataValue');
    expect(actionAudit).toContain('MAX_AUDIT_METADATA_DEPTH');
    expect(actionAudit).not.toContain(".filter(([key]) => !/(password|secret|token|key|authorization|auth)/i.test(key))");
    expect(plannerAccess).toContain('MAX_PLANNER_INVITE_STORAGE_AGE_MS');
    expect(plannerAccess).toContain('normalizePlannerInvite');
    expect(plannerAccess).toContain('localStorage.removeItem(key)');
    expect(plannerAccess).toContain('PLANNER_INVITE_EMAIL_PATTERN');
    expect(setupDraft).toContain('SETUP_DRAFT_RETENTION_MS');
    expect(setupDraft).toContain('normalizeSetupDraft');
    expect(setupDraft).toContain('localStorage.removeItem(SETUP_DRAFT_KEY)');
    expect(setupDraft).toContain('MAX_SETUP_DRAFT_STYLE_PREFERENCES');
    expect(quickStartStateTransfer).toContain('QUICK_START_DRAFT_RETENTION_MS');
    expect(quickStartStateTransfer).toContain('savedAtISO');
    expect(quickStartStateTransfer).toContain('clearQuickStartDraftSnapshot(storageScope)');
    expect(quickStart).not.toContain('localStorage.setItem(STORAGE_KEY, JSON.stringify({ initialSetupAnswers');
    expect(quickStart).toContain('persistQuickStartDraftSnapshot({ initialSetupAnswers');
    expect(guidedSetupPersistence).toContain('GUIDED_SETUP_DRAFT_RETENTION_MS');
    expect(guidedSetupPersistence).toContain('MAX_GUIDED_SETUP_TEXT_LENGTH');
    expect(guidedSetupPersistence).toContain('savedAtISO');
    expect(guidedSetup).not.toContain('window.localStorage.setItem(GUIDED_SETUP_STORAGE_KEY, JSON.stringify({ currentStep, coupleNames, formData })');
    expect(guidedSetup).toContain('persistGuidedSetupDraftSnapshot({ currentStep, coupleNames, formData }');
    expect(onboardingDraftPersistence).toContain('ONBOARDING_DRAFT_RETENTION_MS');
    expect(onboardingDraftPersistence).toContain('savedAtISO');
    expect(onboarding).not.toContain('window.localStorage.setItem(\n      ONBOARDING_STORAGE_KEY');
    expect(onboarding).toContain('persistOnboardingDraftSnapshot({');
    expect(messageUtils).toContain('SAVED_COMPOSER_TEMPLATE_RETENTION_MS');
    expect(messageUtils).toContain('MAX_SAVED_COMPOSER_TEMPLATE_BODY_LENGTH');
    expect(messageUtils).toContain('normalizeSavedComposerTemplateText');
    expect(messageUtils).toContain('SavedComposerTemplatesEnvelope');
    expect(messageUtils).toContain('buildSavedComposerTemplatesEnvelope');
    expect(messageUtils).toContain('localStorage.removeItem(SAVED_COMPOSER_TEMPLATES_STORAGE_KEY)');
    expect(messageUtils).toContain('StoredPhotoAlbumLinksEnvelope');
    expect(messageUtils).toContain('normalizeStoredPhotoAlbumLinks');
    expect(messageUtils).toContain('localStorage.removeItem(LEGACY_PHOTO_ALBUM_LINKS_STORAGE_KEY)');
    expect(messageUtils).toContain('localStorage.removeItem(storageKey)');
    expect(coordinatorStorage).toContain('COORDINATOR_STORAGE_RETENTION_MS');
    expect(coordinatorStorage).toContain('savedAtISO');
    expect(coordinatorStorage).toContain('isCoordinatorStorageEnvelope');
    expect(coordinatorStorage).toContain('localStorage.removeItem(storageKey)');
    expect(guestPhotoSharingUtils).toContain('PHOTO_BUCKET_LINKS_RETENTION_MS');
    expect(guestPhotoSharingUtils).toContain('normalizeStoredBucketLinks');
    expect(guestPhotoSharingUtils).toContain('isStoredBucketLinksEnvelope');
    expect(guestPhotoSharingUtils).toContain('localStorage.removeItem(storageKey)');
    expect(guestDashboardStorage).toContain('GUEST_DASHBOARD_STORAGE_RETENTION_MS');
    expect(guestDashboardStorage).toContain('isGuestDashboardStorageEnvelope');
    expect(guestDashboardStorage).toContain('normalizeStoredFollowUpTask');
    expect(guestDashboardStorage).toContain('writeStoredValue(buildGuestDashboardStorageKey(RSVP_CAMPAIGN_PRESET_KEY, storageScope), campaignPreset)');
    expect(guestDashboardStorage).toContain('localStorage.removeItem(key)');
    expect(settingsDemoStorage).toContain('SETTINGS_DEMO_RSVP_RETENTION_MS');
    expect(settingsDemoStorage).toContain('isDemoRsvpStorageEnvelope');
    expect(settingsDemoStorage).toContain('writeDemoRsvpStorageValue(LOCAL_RSVP_QUESTIONS_KEY');
    expect(rsvpDemoStorage).toContain('RSVP_DEMO_STORAGE_RETENTION_MS');
    expect(rsvpDemoStorage).toContain('isRsvpDemoStorageEnvelope');
    expect(rsvpDemoStorage).toContain('normalizeDemoStoredResponses');
    expect(rsvpDemoStorage).toContain('writeDemoStorageValue(DEMO_RSVP_RESPONSES_KEY');
    expect(messageDemoStorage).toContain('DEMO_MESSAGES_RETENTION_MS');
    expect(messageDemoStorage).toContain('isDemoMessagesEnvelope');
    expect(messageDemoStorage).toContain('normalizeDemoMessage');
    expect(messageDemoStorage).toContain('writeDemoMessagesEnvelope(normalizeDemoMessages(items))');
    expect(seatingDemoStorage).toContain('SEATING_DEMO_STORAGE_RETENTION_MS');
    expect(seatingDemoStorage).toContain('isSeatingStorageEnvelope');
    expect(seatingDemoStorage).toContain('normalizeSeatingStateMap');
    expect(seatingDemoStorage).toContain('writeSeatingStorageValue(SEATING_VERSION_STORAGE_KEY');
    expect(itineraryDemoStorage).toContain('ITINERARY_DEMO_STORAGE_RETENTION_MS');
    expect(itineraryDemoStorage).toContain('isItineraryDemoStorageEnvelope');
    expect(itineraryDemoStorage).toContain('writeItineraryDemoStorageEnvelope(normalizeDemoItineraryEvents(events))');
    expect(itineraryData).toContain('writeDemoItineraryEvents(events)');
    expect(itineraryData).not.toContain('localStorage.setItem(DEMO_ITINERARY_STORAGE_KEY');
    expect(vaultDemoStorage).toContain('VAULT_DEMO_STORAGE_RETENTION_MS');
    expect(vaultDemoStorage).toContain('isVaultStorageEnvelope');
    expect(vaultDemoStorage).toContain('normalizeDemoVaultState');
    expect(vaultDemoStorage).toContain('markSubmittedVaultYear');
    expect(vaultContribute).toContain('appendDemoVaultEntries(vault, rows)');
    expect(vaultContribute).toContain('readSubmittedVaultYears(submittedKey)');
    expect(vaultData).toContain('writeDemoVaultState(nextConfigs, nextEntries)');
    expect(vaultData).not.toContain('localStorage.setItem(DEMO_VAULT_STORAGE_KEY');
    expect(vaultCard).toContain('readLocalE2EBypassFlag(LOCAL_E2E_VAULT_FORCE_UNLOCK_KEY)');
    expect(vaultCard).not.toContain("localStorage.getItem(E2E_FORCE_UNLOCK_KEY) === '1'");
    expect(authContext).toContain('readLocalE2EBypassFlag(LOCAL_E2E_AUTH_KEY)');
    expect(authContext).toContain('clearLocalE2EBypassFlag(LOCAL_E2E_AUTH_KEY)');
    expect(authContext).not.toContain("localStorage.getItem(LOCAL_E2E_AUTH_KEY) === '1'");
    expect(localE2EBypassStorage).toContain('LOCAL_E2E_BYPASS_RETENTION_MS');
    expect(localE2EBypassStorage).toContain("raw === '1'");
    expect(localE2EBypassStorage).toContain('window.localStorage.setItem(storageKey, JSON.stringify(buildEnvelope(now)))');
    expect(aiDraft).not.toContain("console.warn('[aiDraftGenerator] OpenAI draft generation failed, falling back to deterministic generator', error)");
    expect(aiOnboarding).not.toContain("console.warn('[aiOnboarding] OpenAI extraction failed, falling back to deterministic extractor', error)");
    expect(aiDraft).toContain("console.warn('[aiDraftGenerator] OpenAI draft generation failed; using deterministic fallback.')");
    expect(aiOnboarding).toContain("console.warn('[aiOnboarding] OpenAI extraction failed; using deterministic fallback.')");
  });

  it('keeps mobile builder media upload reachable from the top bar', () => {
    const topBar = read('src/builder/components/BuilderTopBar.tsx');
    const exploratory = read('scripts/live-exploratory-click-upload.mjs');

    expect(topBar).toContain('builderActions.openMediaLibrary()');
    expect(topBar).toContain('Add photo');
    expect(topBar).not.toContain('hidden lg:inline-flex items-center gap-1');
    expect(exploratory).toContain('builder Add photo has no visible mobile media entry point on the deployed frontend.');
    expect(exploratory).toContain("page.getByRole('button', { name: /^Add photo$/i })");
    expect(exploratory).toContain('openedFromVisibleButton');
    expect(exploratory.indexOf('openedFromVisibleButton')).toBeLessThan(exploratory.indexOf("page.getByText('Add a favorite photo'"));
  });

  it('keeps vendor profile creation wired through the shared launch helper', () => {
    const helper = read('src/lib/vendorProfileLaunch.ts');
    const templates = read('src/pages/VendorTemplates.tsx');
    const create = read('src/pages/VendorProfileCreate.tsx');
    const vendors = read('src/pages/dashboard/planning/VendorsTab.tsx');

    expect(helper).toContain("normalized !== 'false'");
    expect(templates).toContain('isVendorProfileCreationEnabled()');
    expect(create).toContain('const creationEnabled = isVendorProfileCreationEnabled();');
    expect(vendors).toContain('vendorProfileCreationEnabled &&');
  });

  it('keeps mobile tap/click skip proof classified instead of raw-count only', () => {
    const exploratory = read('scripts/live-exploratory-click-upload.mjs');
    const mobileVisual = read('scripts/live-mobile-visual-pass.mjs');

    expect(exploratory).toContain('function classifyClickSkip');
    expect(exploratory).toContain('clickSkipSummary: summarizeSkips(result.clickSkips)');
    expect(mobileVisual).toContain('function classifyTapSkip');
    expect(mobileVisual).toContain('tapSkipSummary: summarizeSkips(result.tapSkips)');
    expect(mobileVisual).toContain("const bodyInnerText = (document.body.innerText || '').replace(/\\s+/g, ' ').trim();");
    expect(mobileVisual).toContain("const bodyTextContent = (document.body.textContent || '').replace(/\\s+/g, ' ').trim();");
    expect(mobileVisual).toContain('const bodyText = bodyInnerText || bodyTextContent;');
    expect(mobileVisual).toContain('return (bodyInnerText || bodyTextContent).length >= 80;');
    expect(mobileVisual.lastIndexOf("mkdirSync(outDir, { recursive: true });")).toBeLessThan(mobileVisual.lastIndexOf("writeFileSync(join(outDir, 'result.json')"));
    expect(mobileVisual.lastIndexOf("mkdirSync(join(process.cwd(), 'test-results', 'live-mobile-visual-pass'), { recursive: true });")).toBeLessThan(mobileVisual.lastIndexOf('writeFileSync(latestPath'));
  });

  it('keeps a route chunk performance budget proof available', () => {
    const script = read('scripts/v1-proof-performance-budget.mjs');
    const pkg = read('package.json');

    expect(script).toContain('jsMaxKb: 350');
    expect(script).toContain('jsReviewKb: 250');
    expect(script).toContain('dist/assets is missing');
    expect(pkg).toContain('"proof:v1:performance-budget": "node scripts/v1-proof-performance-budget.mjs"');
  });

  it('keeps opt-in live write/read proof scheduling explicit', () => {
    const script = read('scripts/v1-proof-opt-in-schedule.mjs');
    const schedule = read('docs/v1-opt-in-live-proof-schedule.md');
    const pkg = read('package.json');

    for (const spec of [
      'tests/e2e/seating-write-read.spec.ts',
      'tests/e2e/quick-start-onboarding-write-read.spec.ts',
      'tests/e2e/planner-starter-suite-write-read.spec.ts',
      'tests/e2e/site-rsvp-widget-write-read.spec.ts',
      'tests/e2e/settings-team-invite-claim.spec.ts',
      'tests/e2e/vendor-profile-publish-inquiry.spec.ts',
      'tests/e2e/vendor-templates-smoke.spec.ts',
    ]) {
      expect(script).toContain(spec);
      expect(schedule).toContain(spec);
    }
    expect(schedule).toContain('Do not print secrets');
    expect(schedule).toContain('Exit bar');
    expect(pkg).toContain('"proof:v1:opt-in-schedule": "node scripts/v1-proof-opt-in-schedule.mjs"');
  });

  it('keeps the active super-nice backlog free of closed or scheduled proof-management items', () => {
    const backlog = read('docs/full-suite-launch-backlog-2026-04-30.md');
    const active = backlog.split('### Must Fix Or Explicitly Accept Before A Super Nice Launch')[1]?.split('### Deferred Or Outside Current Launch Scope')[0] ?? '';

    expect(active).not.toContain('Guests/RSVP product proof is automated-green');
    expect(active).not.toContain('Collaborator runtime proof accounts are still incomplete');
    expect(active).not.toContain('Mobile exploratory harness records many skipped taps');
    expect(active).not.toContain('Initial route bundle sizes');
    expect(active).not.toContain('Several deeper production write/read specs');
    expect(active).not.toContain('Mobile builder media-library upload path is still not proven');
    expect(active).not.toContain('Vendor profile creation/generator launch stance needs');
  });

  it('keeps the top backlog evidence aligned to the latest live exploratory proof runs', () => {
    const backlog = read('docs/full-suite-launch-backlog-2026-04-30.md');
    const currentEvidence = backlog.split('Evidence collected in this audit:')[1]?.split('### Closed In')[0] ?? '';

    expect(currentEvidence).toMatch(/generated 2026-05-04 \d{1,2}:\d{2} (?:AM|PM) PT/);
    expect(currentEvidence).toMatch(/dpl_[A-Za-z0-9]+/);
    expect(currentEvidence).toContain('`npm run proof:v1:postdeploy`: PASS 8/8');
    expect(currentEvidence).toContain('canonical_route_smoke_green_defer_to_current_proof_board_for_launch_call');
    expect(currentEvidence).toContain('canonicalSmokeGreenButLaunchRed: false');
    expect(currentEvidence).toContain('run `1777897297717`');
    expect(currentEvidence).toContain('run `1777897694000`');
    expect(currentEvidence).toContain('run `1777897301691`');
    expect(currentEvidence).toContain('0 known issues');
    expect(currentEvidence).toContain('0 unknown issues');
    expect(currentEvidence).toContain('0 layout issues');
    expect(currentEvidence).not.toContain('approved deploy/postdeploy proof for local live bug-sweep fixes');
    expect(currentEvidence).not.toContain('public v1 claim is on hold for post-deploy runtime truth rerun');
  });

  it('keeps the final gated unblock runbook explicit and guarded', () => {
    const runbook = read('docs/v1-final-gated-unblock-runbook.md');
    const script = read('scripts/v1-proof-gated-unblock-runbook.mjs');
    const pkg = read('package.json');

    for (const phrase of [
      'Do not deploy or apply migrations without explicit approval.',
      'Do not print, paste, commit, screenshot, or log secret values.',
      'supabase functions deploy photo-upload --project-ref atuzuobpprjstfmdnwso',
      'V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance',
      'npm run proof:v1:data-integrity',
      'V1_AI_EXPOSURE_LIVE=1 npm run proof:v1:ai-exposure',
    ]) {
      expect(runbook).toContain(phrase);
      expect(script).toContain(phrase);
    }
    expect(pkg).toContain('"proof:v1:gated-unblock-runbook": "node scripts/v1-proof-gated-unblock-runbook.mjs"');
  });

  it('keeps the secure launch closeout bundle explicit and guarded', () => {
    const source = read('scripts/v1-proof-launch-closeout.mjs');
    const pkg = read('package.json');
    const backlog = read('BACKLOG.md');
    const report = read('docs/PRODUCTION_HARDENING_REPORT.md');

    expect(source).toContain("id: 'service-role-authorization'");
    expect(source).toContain("id: 'email-messaging-authorization'");
    expect(source).toContain("id: 'board-freshness'");
    expect(source).toContain("id: 'board-raw'");
    expect(source).toContain("id: 'board-markdown'");
    expect(source).toContain("id: 'git-diff-check'");
    expect(source).toContain("blocker?.blockerType === 'missing_service_role_key'");
    expect(source).toContain('this helper/local bundle refreshes board freshness plus the raw and markdown board outputs');
    expect(source).toContain('it complements the proof board rather than replacing it');
    expect(source).toContain('Rerun npm run proof:v1:launch-closeout.');
    expect(pkg).toContain('"proof:v1:launch-closeout": "node scripts/v1-proof-launch-closeout.mjs"');
    expect(backlog).toContain('npm run proof:v1:launch-closeout');
    expect(report).toContain('npm run proof:v1:launch-closeout');
  });

  it('keeps runtime operator-note truth centralized and guarded', () => {
    const checklist = read('docs/v1-runtime-operator-notes-checklist.md');
    const script = read('scripts/v1-proof-runtime-note-checklist.mjs');
    const pkg = read('package.json');
    const backlog = read('BACKLOG.md');

    for (const phrase of [
      'Canonical Couple Path + Runtime Wording',
      'Guests / RSVP Ops',
      'Collaborator Access',
      'Coordinator Day-Of',
      'Registry',
      'Comms Center',
      'Seating Continuity',
      'docs/v1-smoke-proof-log.md',
      'npm run proof:v1:board',
      'npm run proof:v1:board:freshness',
      'npm run proof:v1:board:md',
      'local/helper proof paths regenerate the raw and markdown board outputs',
      'launch stays `HOLD` until that secure closeout bundle is green',
      'npm run proof:v1:launch-closeout',
    ]) {
      expect(checklist).toContain(phrase);
      expect(script).toContain(phrase);
    }

    expect(pkg).toContain('"proof:v1:runtime-note-checklist": "node scripts/v1-proof-runtime-note-checklist.mjs"');
    expect(backlog).toContain('docs/v1-runtime-operator-notes-checklist.md');
    expect(backlog).toContain('npm run proof:v1:runtime-note-checklist');
  });

  it('keeps the proof runbook aligned with the named board commands', () => {
    const runbook = read('docs/v1-proof-runbook.md');

    expect(runbook).toContain('npm run proof:v1:board:freshness');
    expect(runbook).toContain('npm run proof:v1:board');
    expect(runbook).toContain('npm run proof:v1:board:md');
    expect(runbook).toContain('Run `npm run proof:v1:board:freshness` before treating either board output as current truth.');
    expect(runbook).toContain('Workflow gates are intentionally narrower: `ci-hardpass` and `Release Launch Gate` enforce `npm run proof:v1:board:freshness`, but they do not regenerate `npm run proof:v1:board` or `npm run proof:v1:board:md`.');
    expect(runbook).not.toContain('node scripts/v1-proof-board.mjs --markdown');
  });

  it('keeps the proof test-lanes summary aligned with the workflow/helper split', () => {
    const script = read('scripts/v1-proof-test-lanes.mjs');

    expect(script).toContain('workflow gates stay freshness-only while helper/local proof paths regenerate board artifacts through the named proof bundles.');
  });

  it('keeps the small runbook/checklist proof summaries aligned with the workflow/helper split', () => {
    const gatedRunbookScript = read('scripts/v1-proof-gated-unblock-runbook.mjs');
    const runtimeChecklistScript = read('scripts/v1-proof-runtime-note-checklist.mjs');

    expect(gatedRunbookScript).toContain('approval-gated workflow notes remain separate from helper/local closeout paths that regenerate board artifacts');
    expect(runtimeChecklistScript).toContain('workflow gates stop at freshness while helper/local proof paths regenerate the raw and markdown board artifacts when needed.');
  });

  it('keeps the larger helper-bundle summaries aligned with the proof-board contract', () => {
    const closeout = read('scripts/v1-proof-launch-closeout.mjs');
    const fullSuite = read('scripts/v1-proof-full-suite-exit-gate.mjs');

    expect(closeout).toContain('this helper/local bundle refreshes board freshness plus the raw and markdown board outputs');
    expect(fullSuite).toContain('this helper proof bundle starts with the board trio');
  });

  it('keeps feature-lane helper summaries explicit about their lane role', () => {
    const registry = read('scripts/v1-proof-registry.mjs');
    const comms = read('scripts/v1-proof-comms-center.mjs');
    const guestLanguage = read('scripts/v1-proof-guest-language-continuity.mjs');

    expect(registry).toContain('this feature-lane bundle closes owner/public registry runtime truth for the shipped lane while still rolling up into the broader proof-board launch call');
    expect(comms).toContain('this bundle validates compose/save/review truth without implying reopened live SMS-send clearance');
    expect(guestLanguage).toContain('this guest-surface bundle validates translated RSVP and guest-hub continuity as supporting non-SMS launch evidence');
  });

  it('keeps adjacent feature-lane helper summaries explicit about their lane role', () => {
    const coordinator = read('scripts/v1-proof-coordinator-dayof.mjs');
    const seating = read('scripts/v1-proof-seating-continuity.mjs');
    const dayofWebMode = read('scripts/v1-proof-dayof-web-mode.mjs');

    expect(coordinator).toContain('this lane closes coordinator runtime truth for the shipped ops surface while still rolling up into the broader proof-board launch call');
    expect(seating).toContain('this lane validates seating packet, lookup, and assignment continuity as shipped feature evidence while still deferring the final launch call to the proof-board flow');
    expect(dayofWebMode).toContain('this read-only guest-hub lane validates invite-scoped day-of visibility without claiming the separate guest-hub write/read mutation lane');
  });

  it('keeps additional guest-facing feature-lane helper summaries explicit about their lane role', () => {
    const travel = read('scripts/v1-proof-travel-guest-portal.mjs');
    const photoMemory = read('scripts/v1-proof-photo-memory-flow.mjs');
    const guestPreview = read('scripts/v1-proof-guest-preview-confidence.mjs');

    expect(travel).toContain('this guest-surface lane validates invite-scoped travel/runtime continuity for the shipped portal while still rolling up into the broader proof-board launch call');
    expect(photoMemory).toContain('this feature bundle validates memory/recap upload-and-readback continuity as shipped lane evidence while still deferring the final launch call to the proof-board flow');
    expect(guestPreview).toContain('this guest-preview lane validates shipped preview-route visibility and navigation on live runtime without replacing the broader launch-truth flow');
  });

  it('keeps adjacent ops-and-analytics helper summaries explicit about their lane role', () => {
    const qrScanner = read('scripts/v1-proof-qr-scanner.mjs');
    const analytics = read('scripts/v1-proof-website-invite-analytics.mjs');
    const collaborator = read('scripts/v1-proof-collaborator-access.mjs');

    expect(qrScanner).toContain('this supporting ops-security lane validates payload safety, parsing, and fallback behavior without acting like a broader launch-truth artifact source');
    expect(analytics).toContain('this owner-facing lane closes analytics readback and public-route privacy truth for the shipped surface while still rolling up into the broader proof-board launch call');
    expect(collaborator).toContain('this permission-boundary lane validates invite/role access truth as shipped surface evidence while still deferring full runtime role flows to dedicated live/operator checks');
  });

  it('keeps infra proof helper summaries explicit about readiness, permission, and source-inventory roles', () => {
    const prereqs = read('scripts/v1-proof-prereqs.mjs');
    const clientRls = read('scripts/v1-proof-client-rls-matrix.mjs');
    const clientWriteInventory = read('scripts/v1-proof-client-write-inventory.mjs');

    expect(prereqs).toContain('this readiness lane confirms the local/live foundations for later proof bundles without acting like a shipped-feature or launch-truth artifact source');
    expect(clientRls).toContain('Client RLS matrix live proof is the strongest collaborator/client permission-boundary lane');
    expect(clientWriteInventory).toContain('this source-level guard proves shipped runtime files are not using direct client write chains, but it remains supporting inventory evidence rather than a runtime permission proof by itself');
  });

  it('keeps security-and-boundary infra helper summaries explicit about their lane role', () => {
    const performanceBudget = read('scripts/v1-proof-performance-budget.mjs');
    const astSecurity = read('scripts/v1-proof-ast-security.mjs');
    const publicAccessCoverage = read('scripts/v1-proof-public-access-coverage.mjs');

    expect(performanceBudget).toContain('this build-artifact lane guards shipped asset weight and review thresholds, but it remains supporting release evidence rather than a feature-runtime truth source by itself');
    expect(astSecurity).toContain('this source-level security lane guards critical runtime auth/storage/public-boundary patterns, but it supports rather than replaces live permission and guest-surface proof');
    expect(publicAccessCoverage).toContain('this static boundary lane validates resolver/subresource gate wiring and payload minimization, but it remains supporting public-surface evidence alongside live guest/public proof');
  });

  it('keeps long-tail owner and planning helper summaries explicit about their lane role', () => {
    const notificationDigest = read('scripts/v1-proof-notification-digest.mjs');
    const weddingIdentity = read('scripts/v1-proof-wedding-identity-exports.mjs');
    const budgetVendorLedger = read('scripts/v1-proof-budget-vendor-ledger.mjs');

    expect(notificationDigest).toContain('this owner-summary lane validates digest wording and dashboard-count continuity as shipped feature evidence while still leaving live inbox delivery truth to its own downstream pipeline proof');
    expect(weddingIdentity).toContain('this owner-tooling lane validates safe identity-export generation and download continuity while still deferring broader launch truth to the proof-board flow');
    expect(budgetVendorLedger).toContain('this planning lane validates financial/vendor continuity and non-exposure as shipped feature evidence while the canonical live collaborator/client-RLS matrix now carries the production planning-write truth');
  });

  it('keeps AI, fetch-safety, and integrity helper summaries explicit about their lane role', () => {
    const registryPreviewSsrf = read('scripts/v1-proof-registry-preview-ssrf.mjs');
    const aiClearance = read('scripts/v1-proof-ai-clearance.mjs');
    const aiProductReadiness = read('scripts/v1-proof-ai-product-readiness.mjs');
    const aiMigrationReady = read('scripts/v1-proof-ai-migration-ready.mjs');
    const dataIntegrity = read('scripts/v1-proof-data-integrity.mjs');

    expect(registryPreviewSsrf).toContain('this runtime security lane validates hostile URL blocking for the shipped preview fetch surface, but it remains supporting fetch-safety evidence rather than a broader launch-truth source by itself');
    expect(aiClearance).toContain('this lane still needs the live frontend and live readback rerun before AI/privacy launch truth is closed');
    expect(aiProductReadiness).toContain('this launch-scope lane validates audited AI product posture and labeling, but it still depends on the dedicated secure-model and AI-clearance gates for deeper runtime truth');
    expect(aiMigrationReady).toContain('this lane confirms the frontend and live readback are ready for the AI/photo column migration, but it is not the post-migration clearance proof by itself');
    expect(dataIntegrity).toContain('this lane provides partial cross-table evidence only and still defers the full integrity call to the secure service-role proof environment');
  });

  it('keeps secure AI and runtime guest/collaborator helper summaries explicit about their lane role', () => {
    const aiSecureModel = read('scripts/v1-proof-ai-secure-model.mjs');
    const aiExposure = read('scripts/v1-proof-ai-exposure.mjs');
    const collaboratorRuntime = read('scripts/v1-proof-collaborator-runtime.mjs');
    const guestLookupScope = read('scripts/v1-proof-guest-lookup-scope.mjs');

    expect(aiSecureModel).toContain('this live secure-env lane closes deeper model/runtime truth for retained AI routes and complements, rather than replaces, AI product-readiness and AI-clearance gates');
    expect(aiExposure).toContain('this privacy lane closes source/readback evidence that sensitive AI/photo fields are no longer browser-readable on the hardened surface');
    expect(collaboratorRuntime).toContain('this live permission lane closes invite acceptance and role-scoped runtime behavior beyond the static collaborator access boundary proof');
    expect(guestLookupScope).toContain('this live guest-contact lane closes scoped lookup/update runtime truth and complements the broader guest/public access proofs');
  });

  it('keeps proof board and checker-style helper summaries explicit about their contract role', () => {
    const proofBoard = read('scripts/v1-proof-board.mjs');
    const gatedRunbook = read('scripts/v1-proof-gated-unblock-runbook.mjs');
    const runtimeChecklist = read('scripts/v1-proof-runtime-note-checklist.mjs');
    const securityAutomation = read('scripts/v1-proof-security-automation.mjs');
    const testLanes = read('scripts/v1-proof-test-lanes.mjs');

    expect(proofBoard).toContain('this canonical launch-truth artifact depends on a fresh BACKLOG.md current-state block');
    expect(gatedRunbook).toContain('it does not itself establish launch truth, but it keeps the human unblock path aligned with the proof-board and closeout flow');
    expect(runtimeChecklist).toContain('it keeps the human proof path aligned, but it is not a launch-truth artifact by itself');
    expect(securityAutomation).toContain('it does not replace the proof-board or feature/runtime proof lanes');
    expect(testLanes).toContain('it is not itself a feature/runtime proof lane');
  });

  it('keeps guest-hub QR, guests/RSVP ops, and name-change runtime helper summaries explicit about their lane role', () => {
    const guestHubQr = read('scripts/v1-proof-guest-hub-qr.mjs');
    const guestsRsvpOps = read('scripts/v1-proof-guests-rsvp-ops.mjs');
    const nameChangeRuntime = read('scripts/v1-proof-name-change-runtime.mjs');

    expect(guestHubQr).toContain('this guest-surface/export lane closes shipped print-pack and safe QR runtime truth while still rolling up into the broader proof-board launch call');
    expect(guestsRsvpOps).toContain('this owner-plus-guest lane closes shipped RSVP settings, token, and household/runtime truth while still rolling up into the broader proof-board launch call');
    expect(nameChangeRuntime).toContain('this shipped planner lane closes authenticated saved-surface runtime truth while still rolling up into the broader proof-board launch call');
  });
});
