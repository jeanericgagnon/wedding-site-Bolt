import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('super nice launch backlog safety guards', () => {
  it('keeps canonical smoke aligned with the proof board launch source of truth', () => {
    const source = read('scripts/v1-proof-canonical-smoke.mjs');

    expect(source).toContain('canonical_route_smoke_green_defer_to_current_proof_board_for_launch_call');
    expect(source).toContain('defer_to_docs_v1_smoke_proof_log_and_proof_board');
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
    expect(source.match(/window\.open\(`\/site\/\$\{stats\.siteSlug\}`, '_blank', 'noopener,noreferrer'\)/g)?.length).toBe(4);
  });

  it('keeps audited recoverable fallback paths from dumping raw errors to the browser console', () => {
    const planning = read('src/pages/dashboard/Planning.tsx');
    const guests = read('src/pages/dashboard/Guests.tsx');
    const onboarding = read('src/pages/Onboarding.tsx');
    const vault = read('src/pages/dashboard/Vault.tsx');
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
    const guestPhotoSharing = read('src/pages/dashboard/GuestPhotoSharing.tsx');
    const vaultContribute = read('src/pages/VaultContribute.tsx');
    const quickStart = read('src/pages/onboarding/QuickStart.tsx');
    const googleDriveHealth = read('supabase/functions/google-drive-health/index.ts');
    const itinerary = read('src/pages/dashboard/Itinerary.tsx');
    const registryService = read('src/pages/dashboard/registry/registryService.ts');
    const stripeService = read('src/lib/stripeService.ts');
    const messages = read('src/pages/dashboard/Messages.tsx');

    expect(planning).not.toContain('console.error(err)');
    expect(guests).not.toContain('console.error(error)');
    expect(guests).not.toContain("const msg = err instanceof Error ? err.message : 'Couldn’t read that guest file.'");
    expect(guests).toContain('function safeGuestImportReadError(err: unknown): string');
    expect(guests).toContain("toast(safeGuestImportReadError(err), 'error');");
    expect(onboarding).not.toContain("console.error('ONBOARDING_NEXT_STEP_FAILED', error)");
    expect(songRequests).not.toContain('console.error(err)');
    expect(addressCollection).not.toContain('console.error(err)');
    expect(vault).not.toContain('providerErr instanceof Error ? providerErr.message');
    expect(vault).not.toContain('Google Drive connection failed: ${error.message}');
    expect(vault).not.toContain('Google Drive OAuth was cancelled or failed: ${oauthError}');
    expect(vault).not.toContain('throw new Error(error.message);');
    expect(vault).toContain("throw new Error('A vault for that anniversary already exists.')");
    expect(vault).toContain("throw new Error('Couldn’t update this vault. Please try again.')");
    expect(vault).toContain("throw new Error('Couldn’t save this vault entry. Please try again.')");
    expect(vault).toContain('Google Drive connection failed. Please try again.');
    expect(vault).toContain('Google Drive connected, but dayof could not finish the vault backup setup. Please try reconnecting.');
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
    expect(guestPhotoSharing).toContain('customerSafeErrorMessage(err, fallback)');
    expect(guestPhotoSharing).not.toContain('return cleaned;');
    expect(vaultContribute).not.toContain('`${err.message} Uploading original video instead.`');
    expect(vaultContribute).toContain("setSubmitError('Couldn’t prepare a smaller version. Uploading the original video instead.');");
    expect(quickStart).not.toContain('setAiDebug(`finish_failed=${err instanceof Error ? err.message : String(err)}`)');
    expect(quickStart).toContain("setAiDebug('finish_failed=retry_safe')");
    expect(googleDriveHealth).not.toContain('message: err instanceof Error ? err.message : "Health check failed."');
    expect(googleDriveHealth).toContain('GOOGLE_DRIVE_HEALTH_CHECK_FAILED');
    expect(googleDriveHealth).toContain('Drive backup needs to be reconnected. dayof hosted storage is active.');
    expect(itinerary).not.toContain("const message = (err as { message?: string })?.message || 'Couldn’t save event. Please try again.'");
    expect(itinerary).not.toContain('setSaveError(message)');
    expect(itinerary).not.toContain("setSaveError((err as Error)?.message || 'Couldn’t update the timeline.')");
    expect(itinerary).not.toContain("setSaveError((err as Error)?.message || 'Couldn’t build the template.')");
    expect(itinerary).toContain("setSaveError(customerSafeErrorMessage(err, 'Couldn’t save event. Please try again.'))");
    expect(itinerary).toContain("setSaveError(customerSafeErrorMessage(err, 'Couldn’t update the timeline.'))");
    expect(itinerary).toContain("setSaveError(customerSafeErrorMessage(err, 'Couldn’t build the template.'))");
    expect(registryService).not.toContain('throw new Error(error.message)');
    expect(registryService).toContain('REGISTRY_LOAD_ERROR_COPY');
    expect(registryService).toContain('REGISTRY_SAVE_ERROR_COPY');
    expect(registryService).toContain('REGISTRY_DELETE_ERROR_COPY');
    expect(registryService).toContain('REGISTRY_PURCHASE_ERROR_COPY');
    expect(stripeService).not.toContain('throw new Error(error.message)');
    expect(stripeService).toContain("throw new Error('Couldn’t load billing right now.')");
    expect(stripeService).toContain("throw new Error('Couldn’t check payment status right now.')");
    expect(stripeService).toContain("throw new Error('Couldn’t find your wedding site right now.')");
    expect(messages).toContain('return customerSafeErrorMessage(cleaned, fallback, {');
    expect(messages).toContain('\\b(delivery|message|email|phone|contact|recipient|address|number|missing|invalid|blocked|bounced|unsubscribed|review|retry|attention|details)\\b');
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
    expect(topBar).not.toContain('hidden lg:inline-flex items-center gap-1 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-2 py-1 text-[12px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-subtle)]');
    expect(exploratory).toContain('builder Add photo has no visible mobile media entry point on the deployed frontend.');
    expect(exploratory).toContain("page.getByRole('button', { name: /^Add photo$/i })");
    expect(exploratory).toContain('openedFromVisibleButton');
    expect(exploratory.indexOf('openedFromVisibleButton')).toBeLessThan(exploratory.indexOf("page.getByText('Add a favorite photo'"));
  });

  it('keeps vendor profile creation explicitly gated for launch stance clarity', () => {
    const helper = read('src/lib/vendorProfileLaunch.ts');
    const templates = read('src/pages/VendorTemplates.tsx');
    const create = read('src/pages/VendorProfileCreate.tsx');
    const vendors = read('src/pages/dashboard/planning/VendorsTab.tsx');

    expect(helper).toContain("String(value ?? '').trim().toLowerCase() === 'true'");
    expect(templates).not.toContain("import.meta.env.VITE_ENABLE_VENDOR_PROFILE_CREATION !== 'false'");
    expect(templates).toContain('isVendorProfileCreationEnabled()');
    expect(create).toContain('Vendor page generation is paused');
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

    expect(currentEvidence).toContain('generated 2026-05-04 2:41 PM PT');
    expect(currentEvidence).toContain('dpl_BUWMeVETBxxuuuATpuv6XQJpby9p');
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
    expect(currentEvidence).not.toContain('generated 2026-05-03 9:53 PM PT');
    expect(currentEvidence).not.toContain('generated 2026-05-03 9:25 PM PT');
    expect(currentEvidence).not.toContain('generated 2026-05-03 6:49 PM PT');
    expect(currentEvidence).not.toContain('generated 2026-05-03 10:14 PM PT');
    expect(currentEvidence).not.toContain('generated 2026-05-03 10:35 PM PT');
    expect(currentEvidence).not.toContain('generated 2026-05-03 10:37 PM PT');
    expect(currentEvidence).not.toContain('generated 2026-05-03 10:47 PM PT');
    expect(currentEvidence).not.toContain('generated 2026-05-03 10:57 PM PT');
    expect(currentEvidence).not.toContain('generated 2026-05-03 10:58 PM PT');
    expect(currentEvidence).not.toContain('generated 2026-05-03 11:09 PM PT');
    expect(currentEvidence).not.toContain('generated 2026-05-03 11:10 PM PT');
    expect(currentEvidence).not.toContain('generated 2026-05-03 11:36 PM PT');
    expect(currentEvidence).not.toContain('generated 2026-05-03 11:21 PM PT after the latest no-deploy hardening pass');
    expect(currentEvidence).not.toContain('generated 2026-05-04 1:03 AM PT');
    expect(currentEvidence).not.toContain('generated 2026-05-04 1:20 AM PT');
    expect(currentEvidence).not.toContain('generated 2026-05-04 1:43 AM PT after the latest whole-site hardening pass');
    expect(currentEvidence).not.toContain('generated 2026-05-04 1:51 AM PT after the guarded deploy bookkeeping');
    expect(currentEvidence).not.toContain('generated 2026-05-04 2:08 AM PT after the latest whole-site hardening pass');
    expect(currentEvidence).not.toContain('generated 2026-05-04 2:26 AM PT after the latest whole-site hardening pass');
    expect(currentEvidence).not.toContain('generated 2026-05-04 2:43 AM PT after the latest whole-site hardening pass');
    expect(currentEvidence).not.toContain('generated 2026-05-04 3:14 AM PT after the latest whole-site hardening pass');
    expect(currentEvidence).not.toContain('generated 2026-05-04 3:30 AM PT after the latest whole-site hardening pass');
    expect(currentEvidence).not.toContain('generated 2026-05-04 3:40 AM PT after the latest guarded deploy');
    expect(currentEvidence).not.toContain('generated 2026-05-04 4:01 AM PT after the latest no-deploy hardening pass');
    expect(currentEvidence).not.toContain('generated 2026-05-04 4:14 AM PT after the latest no-deploy hardening pass');
    expect(currentEvidence).not.toContain('generated 2026-05-04 4:27 AM PT after the latest no-deploy hardening pass');
    expect(currentEvidence).not.toContain('generated 2026-05-04 4:37 AM PT after the latest no-deploy hardening pass');
    expect(currentEvidence).not.toContain('generated 2026-05-04 4:49 AM PT after the latest no-deploy hardening pass');
    expect(currentEvidence).not.toContain('generated 2026-05-04 5:00 AM PT after the latest guarded deploy evidence refresh');
    expect(currentEvidence).not.toContain('generated 2026-05-04 5:10 AM PT after the latest no-deploy hardening evidence refresh');
    expect(currentEvidence).not.toContain('generated 2026-05-04 5:19 AM PT after the latest no-deploy hardening evidence refresh');
    expect(currentEvidence).not.toContain('generated 2026-05-04 5:54 AM PT after the latest no-deploy hardening evidence refresh');
    expect(currentEvidence).not.toContain('public v1 claim is on hold for post-deploy runtime truth rerun');
    expect(currentEvidence).not.toContain('dpl_8euNoN6CC7trfpz9NVzfG2SfNCNJ` to `https://wedding-site-bolt-5schlmg6r-eric-gagnons-projects.vercel.app');
    expect(currentEvidence).not.toContain('dpl_4tmSgfpWcxQ37toV8giSsacnrTmb` to `https://wedding-site-bolt-edf9dd0x7-eric-gagnons-projects.vercel.app');
    expect(currentEvidence).not.toContain('dpl_AxkdjJNAY81QrvEsatQbuSdXhAoy` to `https://wedding-site-bolt-i20dv1cii-eric-gagnons-projects.vercel.app');
    expect(currentEvidence).not.toContain('run `1777871804248`');
    expect(currentEvidence).not.toContain('run `1777871932706`');
    expect(currentEvidence).not.toContain('run `1777872338193`');
    expect(currentEvidence).not.toContain('run `1777873046610`');
    expect(currentEvidence).not.toContain('run `1777873047798`');
    expect(currentEvidence).not.toContain('run `1777873231839`');
    expect(currentEvidence).not.toContain('run `1777873751126`');
    expect(currentEvidence).not.toContain('run `1777873753831`');
    expect(currentEvidence).not.toContain('run `1777873755351`');
    expect(currentEvidence).not.toContain('run `1777874327137`');
    expect(currentEvidence).not.toContain('run `1777874326702`');
    expect(currentEvidence).not.toContain('run `1777874326349`');
    expect(currentEvidence).not.toContain('run `1777875070113`');
    expect(currentEvidence).not.toContain('run `1777875071508`');
    expect(currentEvidence).not.toContain('run `1777876014458`');
    expect(currentEvidence).not.toContain('run `1777875071675`');
    expect(currentEvidence).not.toContain('run `1777880904637`');
    expect(currentEvidence).not.toContain('run `1777881034864`');
    expect(currentEvidence).not.toContain('run `1777881437658`');
    expect(currentEvidence).not.toContain('run `1777881887926`');
    expect(currentEvidence).not.toContain('run `1777882024063`');
    expect(currentEvidence).not.toContain('run `1777882432152`');
    expect(currentEvidence).not.toContain('run `1777882951565`');
    expect(currentEvidence).not.toContain('run `1777883461340`');
    expect(currentEvidence).not.toContain('run `1777883861613`');
    expect(currentEvidence).not.toContain('run `1777884771505`');
    expect(currentEvidence).not.toContain('run `1777884926064`');
    expect(currentEvidence).not.toContain('run `1777885340647`');
    expect(currentEvidence).not.toContain('run `1777885884425`');
    expect(currentEvidence).not.toContain('run `1777886025583`');
    expect(currentEvidence).not.toContain('run `1777886433493`');
    expect(currentEvidence).not.toContain('run `1777886894298`');
    expect(currentEvidence).not.toContain('run `1777887037180`');
    expect(currentEvidence).not.toContain('run `1777887447032`');
    expect(currentEvidence).not.toContain('run `1777887939133`');
    expect(currentEvidence).not.toContain('run `1777888132038`');
    expect(currentEvidence).not.toContain('run `1777889085451`');
    expect(currentEvidence).not.toContain('run `1777889865894`');
    expect(currentEvidence).not.toContain('run `1777890082163`');
    expect(currentEvidence).not.toContain('run `1777890084009`');
    expect(currentEvidence).not.toContain('run `1777891459535`');
    expect(currentEvidence).not.toContain('run `1777891471182`');
    expect(currentEvidence).not.toContain('run `1777891922521`');
    expect(currentEvidence).not.toContain('run `1777892708419`');
    expect(currentEvidence).not.toContain('run `1777892709931`');
    expect(currentEvidence).not.toContain('run `1777892710714`');
    expect(currentEvidence).not.toContain('run `1777893484691`');
    expect(currentEvidence).not.toContain('run `1777893487370`');
    expect(currentEvidence).not.toContain('run `1777893486912`');
    expect(currentEvidence).not.toContain('run `1777894178603`');
    expect(currentEvidence).not.toContain('run `1777894182036`');
    expect(currentEvidence).not.toContain('run `1777894181987`');
    expect(currentEvidence).not.toContain('run `1777894801610`');
    expect(currentEvidence).not.toContain('run `1777894807038`');
    expect(currentEvidence).not.toContain('run `1777894805908`');
    expect(currentEvidence).not.toContain('run `1777896113913`');
    expect(currentEvidence).not.toContain('run `1777896113312`');
    expect(currentEvidence).not.toContain('run `1777896112526`');
    expect(currentEvidence).not.toContain('run `1777896700077`');
    expect(currentEvidence).not.toContain('run `1777896701239`');
    expect(currentEvidence).not.toContain('run `1777896700815`');
    expect(currentEvidence).not.toContain('run `1777868920796`');
    expect(currentEvidence).not.toContain('run `1777871218090`');
    expect(currentEvidence).not.toContain('run `1777869433850`');
    expect(currentEvidence).not.toContain('run `1777869911532`');
    expect(currentEvidence).not.toContain('run `1777868227502`');
    expect(currentEvidence).not.toContain('run `1777868227874`');
    expect(currentEvidence).not.toContain('run `1777868227133`');
    expect(currentEvidence).not.toContain('run `1777859619292`');
    expect(currentEvidence).not.toContain('run `1777859423276`');
    expect(currentEvidence).not.toContain('run `1777859833017`');
    expect(currentEvidence).not.toContain('run `1777863222708`');
    expect(currentEvidence).not.toContain('run `1777863225622`');
    expect(currentEvidence).not.toContain('run `1777863685702`');
    expect(currentEvidence).not.toContain('run `1777865232137`');
    expect(currentEvidence).not.toContain('run `1777865367218`');
    expect(currentEvidence).not.toContain('run `1777865367371`');
    expect(currentEvidence).not.toContain('run `1777866413005`');
    expect(currentEvidence).not.toContain('run `1777866848386`');
    expect(currentEvidence).not.toContain('run `1777866406321`');
    expect(currentEvidence).not.toContain('run `1777867420110`');
    expect(currentEvidence).not.toContain('run `1777867419425`');
    expect(currentEvidence).not.toContain('run `1777867418798`');
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
});
