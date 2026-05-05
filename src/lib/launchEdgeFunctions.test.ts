import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readFunction(name: string) {
  return readFileSync(join(process.cwd(), 'supabase', 'functions', name, 'index.ts'), 'utf8');
}

describe('launch edge function guards', () => {
  it('keeps photo export manifests owner/collaborator gated with fresh hosted links', () => {
    const source = readFunction('photo-export-manifest');

    expect(source).toContain('searchParams.get("readiness") === "1"');
    expect(source).toContain('function: "photo-export-manifest"');
    expect(source).toContain('req.method !== "POST"');
    expect(source).toContain('Authorization');
    expect(source).toContain('auth.getUser');
    expect(source).toContain('site.user_id === user.id');
    expect(source).toContain('wedding_site_collaborators');
    expect(source).toContain('hasPermissionKey(collaborator?.permissions, "photos")');
    expect(source).toContain('includeHidden');
    expect(source).toContain('query.eq("is_hidden", false)');
    expect(source).toContain('createSignedUrl(driveFileId, 60 * 60 * 24)');
    expect(source).toContain('expiresInSeconds: 60 * 60 * 24');
    expect(source).toContain('Could not export photo manifest. Please try again.');
    expect(source).not.toContain('siteError.message');
    expect(source).not.toContain('collaboratorError.message');
    expect(source).not.toContain('uploadError.message');
    expect(source).not.toContain('albumError.message');
    expect(source).not.toContain('error instanceof Error ? error.message');
  });

  it('keeps vendor inquiry submits validated, rate limited, and service-role only', () => {
    const source = readFunction('vendor-profile-inquiry-submit');

    expect(source).toContain('searchParams.get("readiness") === "1"');
    expect(source).toContain('function: "vendor-profile-inquiry-submit"');
    expect(source).toContain('req.method !== "POST"');
    expect(source).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(source).toContain('typeof value !== "string" && typeof value !== "number"');
    expect(source).toContain('vendor_profile_id');
    expect(source).toContain('Enter a valid email.');
    expect(source).toContain('message.length < 8');
    expect(source).toContain('vendor_profiles');
    expect(source).toContain('enforcePublicSubmissionRateLimit');
    expect(source).toContain('scope: "vendor_profile_inquiry_submit"');
    expect(source).toContain('maxSubject: 3');
    expect(source).toContain('vendor_profile_inquiries');
    expect(source).toContain('Could not send inquiry. Please try again.');
    expect(source).not.toContain('profileError) throw profileError');
    expect(source).not.toContain('if (error) throw error');
    expect(source).not.toContain('error instanceof Error ? error.message');
    expect(source).not.toContain('Supabase not configured');
  });

  it('keeps vendor profile preview public-source fetching bounded and customer-safe', () => {
    const source = readFunction('vendor-profile-preview');

    expect(source).toContain('searchParams.get("readiness") === "1"');
    expect(source).toContain('function: "vendor-profile-preview"');
    expect(source).toContain('req.method !== "POST"');
    expect(source).toContain('function isBlockedHostname');
    expect(source).toContain('function isPrivateIpv4');
    expect(source).toContain('parsed.protocol !==');
    expect(source).toContain('parsed.username || parsed.password');
    expect(source).toContain('allowedHost && !allowedHost.test');
    expect(source).toContain('Enter a public website URL.');
    expect(source).toContain('Enter a public Instagram URL.');
    expect(source).toContain('Could not prepare vendor preview. Please try again.');
    expect(source).toContain('enforcePublicSubmissionRateLimit');
    expect(source).not.toContain("error instanceof Error ? error.message : 'Failed to generate vendor preview'");
    expect(source).not.toContain('return new Response(JSON.stringify({ error: error instanceof Error ? error.message');
  });

  it('keeps registry preview product fetching public-only and customer-safe', () => {
    const source = readFunction('registry-preview');
    const urlNormalizer = readFileSync(join(process.cwd(), 'supabase', 'functions', 'registry-preview', 'urlNormalizer.ts'), 'utf8');

    expect(source).toContain('req.method !== "POST"');
    expect(source).toContain('auth.getUser');
    expect(source).toContain('checkRateLimit');
    expect(source).toContain('MAX_PREVIEW_REDIRECTS');
    expect(source).toContain('MAX_PREVIEW_BYTES');
    expect(source).toContain('PREVIEW_FETCH_TIMEOUT_MS');
    expect(source).toContain('function assertPublicPreviewTarget');
    expect(source).toContain('function fetchPreviewHtml');
    expect(source).toContain('redirect: "manual"');
    expect(source).toContain('Deno.resolveDns');
    expect(source).toContain('Deno.resolveDns(parsed.hostname, "AAAA")');
    expect(source).toContain('function isPrivateIpv6');
    expect(source).toContain('enforceDurableRegistryPreviewRateLimit');
    expect(source).toContain('const REGISTRY_URL_CACHE_SELECT = [');
    expect(source).toContain('.select(REGISTRY_URL_CACHE_SELECT)');
    expect(source).not.toContain('.from("registry_url_cache")\n      .select("*")');
    expect(source).toContain('metadata.google.internal');
    expect(source).toContain('content-length');
    expect(source).toContain('URL does not point to an HTML page');
    expect(source).toContain('Enter a public product URL.');
    expect(source).toContain('Preview service unavailable. Please fill in details manually.');
    expect(source).toContain('extractProductData(normalized.canonical)');
    expect(source).not.toContain('details: msg');
    expect(source).not.toContain('JSON.stringify({ error: err instanceof Error ? err.message');
    expect(source).not.toContain('const msg = err instanceof Error ? err.message');
    expect(source).not.toContain('console.error("registry-preview error:", msg)');
    expect(urlNormalizer).toContain('function isBlockedHostname');
    expect(urlNormalizer).toContain('function isPrivateIpv4');
    expect(urlNormalizer).toContain("parsed.protocol !== 'http:' && parsed.protocol !== 'https:'");
    expect(urlNormalizer).toContain('parsed.username || parsed.password');
    expect(urlNormalizer).toContain('metadata.google.internal');
    expect(urlNormalizer).toContain('Enter a public product URL.');
  });

  it('keeps transactional email HTML escaped before interpolation', () => {
    const direct = readFunction('send-wedding-email');
    const queue = readFunction('process-email-queue');
    const bulk = readFunction('send-bulk-message');
    const emailService = readFileSync(join(process.cwd(), 'src', 'lib', 'emailService.ts'), 'utf8');

    for (const source of [direct, queue, bulk]) {
      expect(source).toContain('function escapeHtml');
      expect(source).toContain('.replace(/&/g, "&amp;")');
      expect(source).toContain('.replace(/</g, "&lt;")');
      expect(source).toContain('.replace(/>/g, "&gt;")');
      expect(source).toContain('.replace(/"/g, "&quot;")');
      expect(source).toContain('.replace(/\'/g, "&#39;")');
    }

    expect(direct).toContain('function safeEmailUrl');
    expect(direct).toContain('function sanitizeEmailSubject');
    expect(direct).toContain('req.method !== "POST"');
    expect(direct).toContain('METHOD_NOT_ALLOWED');
    expect(direct).toContain('subject: sanitizeEmailSubject(subject)');
    expect(direct).toContain('const AUTHENTICATED_EMAIL_TYPES = new Set(["wedding_invitation", "signup_welcome", "anniversary_reminder"])');
    expect(direct).toContain('const SERVICE_ROLE_ONLY_TYPES = new Set(["rsvp_notification", "rsvp_confirmation"])');
    expect(direct).toContain('function canSendSiteScopedEmail');
    expect(direct).toContain('SERVICE_ROLE_ONLY_TYPES.has(type) && !isServiceRole');
    expect(direct).toContain('authedUserEmail.trim().toLowerCase() !== to.trim().toLowerCase()');
    expect(direct).toContain('type === "anniversary_reminder" && !isServiceRole');
    expect(direct).toContain('canSendSiteScopedEmail({');
    expect(direct).toContain('safeText(data.guestName');
    expect(direct).toContain('safeText(data.coupleName1');
    expect(direct).toContain('escapeHtml(rsvpUrl)');
    expect(direct).toContain('escapeHtml(vaultUrl)');
    expect(direct).toContain('SEND_WEDDING_EMAIL_PROVIDER_FAILED');
    expect(direct).not.toContain('console.error("Resend error:", errorBody)');
    expect(direct).not.toContain('const errorBody = await resendResponse.text()');
    expect(direct).not.toContain('Email service not configured');
    expect(direct).not.toContain('const guestName = data.guestName as string;');
    expect(direct).not.toContain('const notes = data.notes as string | null;');

    expect(queue).toContain('function safeEmailHref');
    expect(queue).toContain('function sanitizeEmailSubject');
    expect(queue).toContain('req.method !== "POST"');
    expect(queue).toContain('METHOD_NOT_ALLOWED');
    expect(queue).toContain('subject: sanitizeEmailSubject(built.subject)');
    expect(queue).toContain('escapeHtml(p.guestName');
    expect(queue).toContain('escapeHtml(p.notes)');
    expect(queue).toContain('safeEmailHref(p.recapUrl)');
    expect(queue).toContain('const SAFE_DELIVERY_ERROR = "Email delivery did not complete. Please try again."');
    expect(queue).toContain('PROCESS_EMAIL_QUEUE_PROVIDER_FAILED');
    expect(queue).toContain('error: SAFE_DELIVERY_ERROR');
    expect(queue).not.toContain('Email service not configured');
    expect(queue).not.toContain('Notes: ${p.notes}');
    expect(queue).not.toContain('Hi ${p.guestName || "there"}');
    expect(queue).not.toContain('const errBody = await res.text()');
    expect(queue).not.toContain('sendErr instanceof Error ? sendErr.message');

    expect(emailService).toContain('weddingSiteId?: string | null');
    expect(emailService).toContain('if (!opts.weddingSiteId) throw new Error');
    expect(emailService).toContain('weddingSiteId: opts.weddingSiteId');

    expect(bulk).toContain('function sanitizeEmailSubject');
    expect(bulk).toContain('req.method !== "POST"');
    expect(bulk).toContain('METHOD_NOT_ALLOWED');
    expect(bulk).toContain('subject: sanitizeEmailSubject(opts.subject)');
  });

  it('keeps site translation model route owner-gated and free of raw infrastructure errors', () => {
    const source = readFunction('translate-site-content');

    expect(source).toContain('req.method !== "POST"');
    expect(source).toContain('Authorization');
    expect(source).toContain('auth.getUser');
    expect(source).toContain('site.user_id !== userData.user.id');
    expect(source).toContain('Deno.env.get("OPENAI_API_KEY")');
    expect(source).toContain('safeTranslateSiteContentError("LOAD_FAILED")');
    expect(source).toContain('safeTranslateSiteContentError("SAVE_FAILED")');
    expect(source).toContain('safeTranslateSiteContentError("INTERNAL_ERROR")');
    expect(source).toContain('Translation could not be generated right now. Try again in a few minutes.');
    expect(source).not.toContain('siteError.message');
    expect(source).not.toContain('saveError.message');
    expect(source).not.toContain('err instanceof Error ? err.message');
  });

  it('keeps onboarding AI unexpected failures out of raw diagnostic logs', () => {
    const source = readFunction('onboarding-ai-orchestrate');

    expect(source).toContain('ONBOARDING_AI_ORCHESTRATE_UNEXPECTED_FAILED');
    expect(source).toContain('reason: "UNEXPECTED_ONBOARDING_AI_FAILURE"');
    expect(source).not.toContain('message: err instanceof Error ? err.message');
    expect(source).not.toContain('String(err ?? "unknown error")');
  });

  it('keeps setup bootstrap validation bounded and setup failures customer-safe', () => {
    const source = readFunction('setup-bootstrap');

    expect(source).toContain('Authorization');
    expect(source).toContain('allowedGuestBands');
    expect(source).toContain('allowedTemplateIds');
    expect(source).toContain('allowedStyleTags');
    expect(source).toContain('safeSetupBootstrapError("SERVER_CONFIG_ERROR")');
    expect(source).toContain('safeSetupBootstrapError("LOAD_FAILED")');
    expect(source).toContain('safeSetupBootstrapError("SAVE_FAILED")');
    expect(source).toContain('safeSetupBootstrapError("INTERNAL_ERROR")');
    expect(source).toContain('Could not save your setup details. Please try again.');
    expect(source).not.toContain('Missing SUPABASE_ANON_KEY');
    expect(source).not.toContain('userErr?.message');
    expect(source).not.toContain('siteErr.message');
    expect(source).not.toContain('updateErr.message');
    expect(source).not.toContain('err instanceof Error ? err.message');
  });

  it('keeps photo album management method-gated, permission-gated, and raw-error safe', () => {
    const source = readFunction('photo-album-manage');

    expect(source).toContain('req.method !== "POST"');
    expect(source).toContain('Authorization');
    expect(source).toContain('auth.getUser');
    expect(source).toContain('wedding_site_collaborators');
    expect(source).toContain('hasPermissionKey(collaborator?.permissions, "photos")');
    expect(source).toContain('safePhotoAlbumManageError("LOOKUP_FAILED")');
    expect(source).toContain('safePhotoAlbumManageError("COLLABORATOR_FAILED")');
    expect(source).toContain('safePhotoAlbumManageError("PARENT_FAILED")');
    expect(source).toContain('safePhotoAlbumManageError("UPDATE_FAILED")');
    expect(source).toContain('safePhotoAlbumManageError("INTERNAL_ERROR")');
    expect(source).toContain('/photos/upload?t=');
    expect(source).toContain('reason: "ALBUM_ACTIVE_UPDATE_FAILED"');
    expect(source).toContain('reason: "ALBUM_WINDOW_UPDATE_FAILED"');
    expect(source).toContain('reason: "ALBUM_PARENT_UPDATE_FAILED"');
    expect(source).toContain('reason: "ALBUM_LINK_REGENERATION_FAILED"');
    expect(source).toContain('reason: "UNEXPECTED_PHOTO_ALBUM_MANAGE_FAILURE"');
    expect(source).not.toContain('collaboratorError.message');
    expect(source).not.toContain('parentError.message');
    expect(source).not.toContain('error: error.message');
    expect(source).not.toContain('err instanceof Error ? err.message');
    expect(source).not.toMatch(/console\.error\("PHOTO_ALBUM_MANAGE_[^"]+",\s*(err|error)\)/);
  });

  it('keeps photo album creation and moderation free of raw backend failures', () => {
    const create = readFunction('photo-album-create');
    const moderate = readFunction('photo-upload-moderate');

    expect(create).toContain('safePhotoAlbumCreateError("CONFIG")');
    expect(create).toContain('safePhotoAlbumCreateError("PARENT")');
    expect(create).toContain('safePhotoAlbumCreateError("SAVE")');
    expect(create).toContain('safePhotoAlbumCreateError("INTERNAL")');
    expect(create).toContain('driveBackupStatus');
    expect(create).toContain('reason: "ALBUM_CREATE_SAVE_FAILED"');
    expect(create).toContain('reason: "UNEXPECTED_PHOTO_ALBUM_CREATE_FAILURE"');
    expect(create).not.toContain('Missing SUPABASE_ANON_KEY in function env');
    expect(create).not.toContain('userErr?.message');
    expect(create).not.toContain('parentError.message');
    expect(create).not.toContain('error.message, 400');
    expect(create).not.toContain('err instanceof Error ? err.message');
    expect(create).not.toMatch(/console\.error\("PHOTO_ALBUM_CREATE_[^"]+",\s*(err|error)\)/);

    expect(moderate).toContain('safePhotoModerationError("LOAD")');
    expect(moderate).toContain('safePhotoModerationError("PERMISSION")');
    expect(moderate).toContain('safePhotoModerationError("SAVE")');
    expect(moderate).toContain('safePhotoModerationError("INTERNAL")');
    expect(moderate).toContain('wedding_site_collaborators');
    expect(moderate).toContain('reason: "PHOTO_MODERATION_SAVE_FAILED"');
    expect(moderate).toContain('reason: "UNEXPECTED_PHOTO_MODERATION_FAILURE"');
    expect(moderate).not.toContain('uploadsErr?.message');
    expect(moderate).not.toContain('collaboratorError.message');
    expect(moderate).not.toContain('updateErr.message');
    expect(moderate).not.toContain('err instanceof Error ? err.message');
    expect(moderate).not.toMatch(/console\.error\("PHOTO_UPLOAD_MODERATE_[^"]+",\s*(err|updateErr)\)/);
  });

  it('keeps photo AI analysis readbacks explicit after service-role upsert', () => {
    const source = readFunction('photo-analyze-batch');

    expect(source).toContain('const PHOTO_UPLOAD_AI_ANALYSIS_SELECT = [');
    expect(source).toContain('.select(PHOTO_UPLOAD_AI_ANALYSIS_SELECT)');
    expect(source).toContain('reason: "USAGE_EVENT_INSERT_FAILED"');
    expect(source).toContain('reason: "UNEXPECTED_PHOTO_ANALYSIS_FAILURE"');
    expect(source).not.toContain('.from("photo_upload_ai_analysis")\n        .upsert(row, { onConflict: "upload_id" })\n        .select("*")');
    expect(source).not.toContain('message: usageError.message');
    expect(source).not.toContain('message: err instanceof Error ? err.message');
  });

  it('keeps checkout redirects bounded and payment failures customer-safe', () => {
    for (const name of ['stripe-create-checkout', 'stripe-create-subscription', 'stripe-create-sms-credits'] as const) {
      const source = readFunction(name);

      expect(source, name).toContain('function isAllowedCheckoutRedirect');
      expect(source, name).toContain('APP_PUBLIC_URL');
      expect(source, name).toContain('parsed.hostname === "dayof.love"');
      expect(source, name).toContain('parsed.hostname === "localhost"');
      expect(source, name).toContain('Checkout return URL is not allowed.');
      expect(source, name).not.toContain('const message = err instanceof Error ? err.message');
      expect(source, name).not.toContain('error: message');
    }

    const verify = readFunction('stripe-verify-checkout-session');
    expect(verify).toContain('STRIPE_VERIFY_CHECKOUT_UPDATE_FAILED');
    expect(verify).toContain('Could not confirm payment yet. Please try again.');
    expect(verify).not.toContain('updateError.message');
    expect(verify).not.toContain('const message = err instanceof Error ? err.message');
  });

  it('keeps public RSVP, wedding email, and Google Drive callback failures customer-safe', () => {
    const rsvp = readFunction('validate-rsvp-token');
    const email = readFunction('send-wedding-email');
    const googleDrive = readFunction('google-drive-auth-callback');
    const publicSiteAccess = readFunction('public-site-access');

    expect(rsvp).toContain('VALIDATE_RSVP_TOKEN_UNEXPECTED_FAILED');
    expect(rsvp).toContain('Could not update this RSVP. Please try again.');
    expect(rsvp).toContain('action === "lookup_guest"');
    expect(rsvp).toContain('rsvpSession');
    expect(rsvp).toContain('validateRsvpSession');
    expect(rsvp).toContain('enforceRateLimit("rsvp_lookup"');
    expect(rsvp).toContain('enforceRateLimit("rsvp_lookup_guest"');
    expect(rsvp).toContain('Please use the private RSVP link or code from your invitation.');
    expect(rsvp).not.toContain('invite_token, wedding_site_id, household_id, children_allowed');
    expect(rsvp).not.toContain('name.ilike.%');
    expect(rsvp).not.toContain('byName.map');
    expect(rsvp).not.toContain('const message = err instanceof Error ? err.message');

    expect(email).toContain('SEND_WEDDING_EMAIL_UNEXPECTED_FAILED');
    expect(email).toContain('Could not send this email. Please try again.');
    expect(email).toContain('SERVICE_ROLE_ONLY_TYPES.has(type) && !isServiceRole');
    expect(email).toContain('type === "signup_welcome" && !isServiceRole');
    expect(email).toContain('type === "anniversary_reminder" && !isServiceRole');
    expect(email).not.toContain('details: errorBody');
    expect(email).not.toContain('error: message');

    expect(googleDrive).toContain('GOOGLE_DRIVE_AUTH_TOKEN_EXCHANGE_FAILED');
    expect(googleDrive).toContain('GOOGLE_DRIVE_AUTH_TOKEN_EXCHANGE_FAILED", { status: tokenRes.status }');
    expect(googleDrive).toContain('GOOGLE_DRIVE_AUTH_PROVIDER_DECLINED');
    expect(googleDrive).toContain('Could not connect Google Drive. Please try again.');
    expect(googleDrive).toContain('Google Drive connection is not ready yet.');
    expect(googleDrive).not.toContain('details: tokenJson');
    expect(googleDrive).not.toContain('GOOGLE_DRIVE_AUTH_TOKEN_EXCHANGE_FAILED", tokenJson');
    expect(googleDrive).not.toContain('Google OAuth error: ${oauthErr}');
    expect(googleDrive).not.toContain('Google Drive OAuth is not configured on server env.');
    expect(googleDrive).not.toContain('err instanceof Error ? err.message');

    expect(publicSiteAccess).toContain('PUBLIC_SITE_ACCESS_FAILED');
    expect(publicSiteAccess).toContain('reason: "UNEXPECTED_PUBLIC_SITE_ACCESS_FAILURE"');
    expect(publicSiteAccess).toContain('password_unlock');
    expect(publicSiteAccess).toContain('passwordSession');
    expect(publicSiteAccess).toContain('buildSafePublicSite');
    expect(publicSiteAccess).toContain('allow_search_indexing');
    expect(publicSiteAccess).toContain('enforcePasswordAttemptRateLimit');
    expect(publicSiteAccess).toContain('Too many password attempts.');
    expect(publicSiteAccess).toContain('"privacy_mode"');
    expect(publicSiteAccess).toContain('"hide_from_search"');
    expect(publicSiteAccess).not.toContain('site: row');
    expect(publicSiteAccess).not.toContain('site: buildSafePublicSite(row), guest_access_token');
    expect(publicSiteAccess).not.toContain('ilike("site_url"');
    const safeColumns = publicSiteAccess.match(/const SAFE_PUBLIC_SITE_COLUMNS = \[([\s\S]*?)\];/)?.[1] ?? '';
    expect(safeColumns).not.toContain('privacy_mode');
    expect(safeColumns).not.toContain('hide_from_search');
  });

  it('keeps public registry and itinerary subresources behind the public access gate', () => {
    const registry = readFunction('public-registry-items');
    const itinerary = readFunction('public-itinerary-by-slug');

    for (const source of [registry, itinerary]) {
      expect(source).toContain('verifySessionToken');
      expect(source).toContain('canReadPublicSubresource');
      expect(source).toContain('privacy_mode');
      expect(source).toContain('guest_access_token');
      expect(source).toContain('password_protected');
      expect(source).toContain('invite_only');
      expect(source).toContain('is_published !== true');
    }

    expect(registry).not.toContain('.select("*")');
    expect(registry).toContain('return json({ items: [] }, 200)');
    expect(itinerary).toContain('JSON.stringify({ events: [] })');
    expect(registry).not.toContain('server misconfigured');
    expect(itinerary).not.toContain('server misconfigured');
  });

  it('keeps guest contact, recap, vault, queue, token, and webhook failures customer-safe', () => {
    for (const [name, fixedError] of [
      ['guest-contact-lookup', 'Could not look up guests. Please try again.'],
      ['guest-contact-submit', 'Could not save this contact update. Please try again.'],
      ['submit-contact-request', 'Could not save this contact update. Please try again.'],
      ['submit-rsvp', 'Could not submit this RSVP. Please try again.'],
      ['guest-hub-config', 'Could not load hub config'],
      ['guest-recap-config', 'Could not load this recap. Please try again.'],
      ['google-drive-auth-start', 'Could not start Google Drive connection. Please try again.'],
      ['google-drive-health', 'Drive backup needs to be reconnected. dayof hosted storage is active.'],
      ['vault-upload-google-drive', 'Could not upload this file to Google Drive. Please try again.'],
      ['vault-resolve-entry-link', 'Could not open this vault attachment. Please try again.'],
      ['generate-token', 'Could not generate token. Please try again.'],
      ['send-bulk-message', 'Could not process this message. Please try again.'],
      ['process-email-queue', 'Could not process email queue. Please try again.'],
      ['queue-guest-followups', 'Could not queue follow-ups. Please try again.'],
      ['log-client-error', 'Could not save error report.'],
      ['stripe-webhook', 'Could not process Stripe webhook.'],
    ] as const) {
      const source = readFunction(name);
      expect(source, name).toContain(fixedError);
      expect(source, name).not.toContain('details: uploadJson');
      expect(source, name).not.toContain('details: fileJson');
      expect(source, name).not.toContain('VAULT_UPLOAD_GOOGLE_DRIVE_UPLOAD_FAILED", uploadJson');
      expect(source, name).not.toContain('VAULT_RESOLVE_ENTRY_GOOGLE_DRIVE_FAILED", fileJson');
      expect(source, name).not.toContain('Supabase not configured');
      expect(source, name).not.toContain('error: error.message');
      expect(source, name).not.toContain('error: updateError.message');
      expect(source, name).not.toContain('const message = err instanceof Error ? err.message');
      expect(source, name).not.toContain('err instanceof Error ? err.message : "Internal server error"');
    }

    const stripeWebhook = readFunction('stripe-webhook');
    expect(stripeWebhook).toContain('STRIPE_WEBHOOK_SIGNATURE_FAILED');
    expect(stripeWebhook).toContain('reason: "SIGNATURE_VERIFICATION_FAILED"');
    expect(stripeWebhook).toContain('Could not process Stripe webhook.');
    expect(stripeWebhook).toContain('reason: "SUBSCRIPTION_STATUS_UPDATE_FAILED"');
    expect(stripeWebhook).toContain('reason: "PAYMENT_STATUS_UPDATE_FAILED"');
    expect(stripeWebhook).toContain('reason: "SMS_CREDIT_TRANSACTION_INSERT_FAILED"');
    expect(stripeWebhook).toContain('reason: "SMS_CREDIT_BALANCE_UPDATE_FAILED"');
    expect(stripeWebhook).toContain('reason: "UNEXPECTED_STRIPE_WEBHOOK_FAILURE"');
    expect(stripeWebhook).not.toContain('const msg = err instanceof Error ? err.message');
    expect(stripeWebhook).not.toContain('JSON.stringify({ error: msg })');
    expect(stripeWebhook).not.toContain('console.error("STRIPE_WEBHOOK_SUBSCRIPTION_UPDATE_FAILED", updateError)');
    expect(stripeWebhook).not.toContain('console.error("STRIPE_WEBHOOK_PAYMENT_UPDATE_FAILED", updateError)');
    expect(stripeWebhook).not.toContain('console.error("STRIPE_WEBHOOK_UNEXPECTED_FAILED", err)');

    const guestHubTrack = readFunction('guest-hub-track');
    expect(guestHubTrack).toContain('return json({ ok: true, tracked: false })');
    expect(guestHubTrack).not.toContain('Supabase not configured');

    const logClientError = readFunction('log-client-error');
    expect(logClientError).toContain('LOG_CLIENT_ERROR_UNEXPECTED_FAILED');
    expect(logClientError).toContain('Could not save error report.');
    expect(logClientError).toContain('reason: "CLIENT_ERROR_INSERT_FAILED"');
    expect(logClientError).toContain('reason: "UNEXPECTED_CLIENT_ERROR_LOG_FAILURE"');
    expect(logClientError).not.toContain('const msg = err instanceof Error ? err.message');
    expect(logClientError).not.toContain('return json({ error: msg }, 500)');

    const queue = readFunction('process-email-queue');
    expect(queue).toContain('const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!');
    expect(queue).toContain('token !== serviceRoleKey');
    expect(queue).toContain('Unauthorized');

    const queueFollowups = readFunction('queue-guest-followups');
    expect(queueFollowups).toContain('hasPermissionKey(collaborator?.permissions, "messages")');
    expect(queueFollowups).toContain('reason: "FOLLOWUP_QUEUE_INSERT_FAILED"');
    expect(queueFollowups).toContain('reason: "FOLLOWUP_OPTIN_MARK_FAILED"');
    expect(queueFollowups).toContain('reason: "UNEXPECTED_QUEUE_GUEST_FOLLOWUPS_FAILURE"');
    expect(queueFollowups).not.toContain('hasPermissionKey(collaborator?.permissions, "photos") || hasPermissionKey(collaborator?.permissions, "messages")');

    const vaultResolve = readFunction('vault-resolve-entry-link');
    expect(vaultResolve).toContain('function safeVaultAttachmentUrl');
    expect(vaultResolve).toContain('parsed.protocol === "https:" || parsed.protocol === "http:"');
    expect(vaultResolve).toContain('safeVaultAttachmentUrl(rawUrl)');
    expect(vaultResolve).toContain('safeVaultAttachmentUrl(entry.external_file_url ?? entry.attachment_url)');
    expect(vaultResolve).toContain('safeVaultAttachmentUrl(url)');

    const vaultUpload = readFunction('vault-upload-google-drive');
    expect(vaultUpload).toContain('VAULT_UPLOAD_GOOGLE_DRIVE_UPLOAD_FAILED", { status: uploadRes.status }');
    expect(vaultUpload).toContain('enforcePublicSubmissionRateLimit');
    expect(vaultUpload).toContain('scope: "vault_google_drive_upload"');
    expect(vaultUpload).toContain('MAX_GOOGLE_DRIVE_UPLOAD_BYTES');
    expect(vaultUpload).toContain('MAX_GOOGLE_DRIVE_UPLOAD_BASE64_CHARS');
    expect(vaultUpload).toContain('function sanitizeDriveFileName');
    expect(vaultUpload).toContain('function isAllowedVaultMimeType');
    expect(vaultUpload).toContain('value !== "image/svg+xml"');
    expect(vaultUpload).toContain('File is too large for vault uploads.');
    expect(vaultResolve).toContain('VAULT_RESOLVE_ENTRY_GOOGLE_DRIVE_FAILED", { status: fileRes.status }');
  });

  it('keeps public guest contact updates session-scoped instead of browser-id scoped', () => {
    const lookup = readFunction('guest-contact-lookup');
    const submit = readFunction('guest-contact-submit');
    const contactPage = readFileSync(join(process.cwd(), 'src', 'pages', 'GuestContactUpdate.tsx'), 'utf8');

    expect(lookup).toContain('req.method !== "POST"');
    expect(lookup).toContain('enforcePublicSubmissionRateLimit');
    expect(lookup).toContain('scope: "guest_contact_lookup"');
    expect(lookup).toContain('signSessionToken<ContactSessionPayload>');
    expect(lookup).toContain('contact_session: await signSessionToken');
    expect(lookup).toContain('queryParts.length < 2');
    expect(lookup).toContain('normalizeName(displayName(guest)) === normalizedQuery');
    expect(lookup).not.toContain('name.ilike.%');
    expect(lookup).not.toContain('id: g.id');
    expect(lookup).not.toContain('household_id: g.household_id');

    expect(submit).toContain('req.method !== "POST"');
    expect(submit).toContain('verifySessionToken<ContactSessionPayload>');
    expect(submit).toContain('contactPayload.scope !== "guest_contact_update"');
    expect(submit).toContain('contactPayload.exp <= Date.now()');
    expect(submit).toContain('site.id !== contactPayload.siteId');
    expect(submit).toContain('.eq("id", contactPayload.guestId)');
    expect(submit).toContain('scope: "guest_contact_submit"');
    expect(submit).not.toContain('const guestId = String(body.guest_id');
    expect(submit).not.toContain('.eq("id", guestId)');

    expect(contactPage).toContain('contact_session: string');
    expect(contactPage).toContain("contact_session: selectedContactSession");
    expect(contactPage).not.toContain('guest_id: selectedGuestId');
  });

  it('keeps service-role runtime functions method-gated before privileged work', () => {
    const postOnlyFunctions = [
      'generate-token',
      'google-drive-auth-start',
      'google-drive-health',
      'guest-contact-lookup',
      'guest-contact-submit',
      'photo-album-create',
      'photo-upload-moderate',
      'public-itinerary-by-slug',
      'public-registry-items',
      'setup-bootstrap',
      'stripe-create-checkout',
      'stripe-create-sms-credits',
      'stripe-create-subscription',
      'stripe-verify-checkout-session',
      'stripe-webhook',
      'submit-contact-request',
      'submit-rsvp',
      'validate-rsvp-token',
      'vault-resolve-entry-link',
      'vault-upload-google-drive',
    ] as const;

    for (const name of postOnlyFunctions) {
      const source = readFunction(name);
      expect(source, name).toContain('req.method === "OPTIONS"');
      expect(source, name).toContain('req.method !== "POST"');
      expect(source, name).toContain('Method not allowed');
    }

    for (const name of ['stripe-create-checkout', 'stripe-create-sms-credits', 'stripe-create-subscription'] as const) {
      const source = readFunction(name);
      expect(source, name).toContain('"Access-Control-Allow-Methods": "POST, OPTIONS"');
      expect(source, name).not.toContain('"Access-Control-Allow-Methods": "GET, POST');
      expect(source, name).not.toContain('"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"');
    }
  });

  it('keeps Stripe billing diagnostics fixed and free of raw provider/database errors', () => {
    for (const [name, reason] of [
      ['stripe-create-checkout', 'reason: "UNEXPECTED_CHECKOUT_CREATE_FAILURE"'],
      ['stripe-create-subscription', 'reason: "UNEXPECTED_SUBSCRIPTION_CREATE_FAILURE"'],
      ['stripe-create-sms-credits', 'reason: "UNEXPECTED_SMS_CREDITS_CHECKOUT_FAILURE"'],
      ['stripe-verify-checkout-session', 'reason: "UNEXPECTED_CHECKOUT_VERIFY_FAILURE"'],
    ] as const) {
      const source = readFunction(name);
      expect(source, name).toContain(reason);
      expect(source, name).not.toMatch(/console\.error\("[^"]+",\s*(err|updateError)\)/);
    }

    const verify = readFunction('stripe-verify-checkout-session');
    expect(verify).toContain('reason: "CHECKOUT_STATUS_UPDATE_FAILED"');
    expect(verify).not.toContain('console.error("STRIPE_VERIFY_CHECKOUT_UPDATE_FAILED", updateError)');
  });

  it('keeps hardened Edge Function diagnostics from logging raw caught errors', () => {
    const diagnosticHardenedFunctions = [
      'setup-bootstrap',
      'translate-site-content',
      'send-bulk-message',
      'process-email-queue',
      'send-wedding-email',
      'photo-album-create',
      'photo-album-manage',
      'photo-upload-moderate',
      'guest-contact-lookup',
      'guest-contact-submit',
      'submit-contact-request',
      'submit-rsvp',
      'validate-rsvp-token',
      'guest-recap-config',
      'queue-guest-followups',
      'public-site-access',
      'log-client-error',
      'generate-token',
      'vault-resolve-entry-link',
      'vault-upload-google-drive',
      'google-drive-auth-start',
      'google-drive-auth-callback',
      'google-drive-health',
    ] as const;

    for (const name of diagnosticHardenedFunctions) {
      const source = readFunction(name);
      expect(source, name).not.toMatch(/console\.error\("[^"]+",\s*(err|error|updateErr|saveError|sendErr|clearDeliveriesResult\.error|insertDeliveriesResult\.error|finalStatusUpdate\.error|updateError|lotsError|dueMessagesError|queueError|siteError|parentError|collaboratorError|txError|balError)\)/);
    }

    expect(readFunction('setup-bootstrap')).toContain('reason: "UNEXPECTED_SETUP_BOOTSTRAP_FAILURE"');
    expect(readFunction('translate-site-content')).toContain('reason: "UNEXPECTED_TRANSLATION_FAILURE"');
    expect(readFunction('translate-site-content')).toContain('reason: "SITE_LOAD_FAILED"');
    expect(readFunction('send-bulk-message')).toContain('reason: "UNEXPECTED_SEND_BULK_FAILURE"');
    expect(readFunction('send-bulk-message')).toContain('reason: "SMS_CREDITS_LOAD_FAILED"');
    expect(readFunction('send-bulk-message')).toContain('reason: "DUE_MESSAGES_LOAD_FAILED"');
    expect(readFunction('process-email-queue')).toContain('reason: "UNEXPECTED_EMAIL_QUEUE_FAILURE"');
    expect(readFunction('send-wedding-email')).toContain('reason: "UNEXPECTED_SEND_EMAIL_FAILURE"');
    expect(readFunction('photo-album-create')).toContain('reason: "PARENT_ALBUM_LOAD_FAILED"');
    expect(readFunction('photo-album-manage')).toContain('reason: "COLLABORATOR_LOAD_FAILED"');
    expect(readFunction('photo-album-manage')).toContain('reason: "PARENT_ALBUM_LOAD_FAILED"');
    expect(readFunction('photo-upload-moderate')).toContain('reason: "COLLABORATOR_LOAD_FAILED"');
    expect(readFunction('guest-contact-lookup')).toContain('reason: "UNEXPECTED_GUEST_CONTACT_LOOKUP_FAILURE"');
    expect(readFunction('guest-contact-submit')).toContain('reason: "UNEXPECTED_GUEST_CONTACT_SUBMIT_FAILURE"');
    expect(readFunction('submit-contact-request')).toContain('reason: "UNEXPECTED_CONTACT_REQUEST_SUBMIT_FAILURE"');
    expect(readFunction('submit-rsvp')).toContain('reason: "UNEXPECTED_RSVP_SUBMIT_FAILURE"');
    expect(readFunction('validate-rsvp-token')).toContain('reason: "UNEXPECTED_RSVP_TOKEN_VALIDATION_FAILURE"');
    expect(readFunction('guest-recap-config')).toContain('reason: "UNEXPECTED_GUEST_RECAP_CONFIG_FAILURE"');
    expect(readFunction('queue-guest-followups')).toContain('reason: "UNEXPECTED_QUEUE_GUEST_FOLLOWUPS_FAILURE"');
    expect(readFunction('public-site-access')).toContain('reason: "UNEXPECTED_PUBLIC_SITE_ACCESS_FAILURE"');
    expect(readFunction('log-client-error')).toContain('reason: "UNEXPECTED_CLIENT_ERROR_LOG_FAILURE"');
    expect(readFunction('generate-token')).toContain('reason: "UNEXPECTED_TOKEN_GENERATION_FAILURE"');
    expect(readFunction('vault-resolve-entry-link')).toContain('reason: "UNEXPECTED_VAULT_RESOLVE_FAILURE"');
    expect(readFunction('vault-upload-google-drive')).toContain('reason: "UNEXPECTED_VAULT_DRIVE_UPLOAD_FAILURE"');
    expect(readFunction('google-drive-auth-start')).toContain('reason: "UNEXPECTED_GOOGLE_DRIVE_AUTH_START_FAILURE"');
    expect(readFunction('google-drive-auth-callback')).toContain('reason: "UNEXPECTED_GOOGLE_DRIVE_CALLBACK_FAILURE"');
    expect(readFunction('google-drive-health')).toContain('reason: "DRIVE_HEALTH_CHECK_FAILED"');
  });

  it('keeps bulk message email HTML escaped and delivery/provider failures non-technical', () => {
    const source = readFunction('send-bulk-message');

    expect(source).toContain('function escapeHtml');
    expect(source).toContain('const safeSubject = escapeHtml(subject)');
    expect(source).toContain('const safeCoupleName1 = escapeHtml(coupleName1)');
    expect(source).toContain('const safeCoupleName2 = escapeHtml(coupleName2)');
    expect(source).toContain('Dear ${escapeHtml(guestName)}');
    expect(source).toContain('const safeBody = escapeHtml(body)');
    expect(source).toContain('safeDeliveryFailureMessage("email")');
    expect(source).toContain('safeDeliveryFailureMessage("sms")');
    expect(source).toContain('safeSendBulkError("DELIVERY_LOG_FAILED")');
    expect(source).toContain('safeSendBulkError("MESSAGE_UPDATE_FAILED")');
    expect(source).toContain('safeSendBulkError("AUDIENCE_LOAD_FAILED")');
    expect(source).toContain('SEND_BULK_MESSAGE_SMS_PROVIDER_FAILED", { status: res.status }');
    expect(source).toContain('SEND_BULK_MESSAGE_EMAIL_PROVIDER_FAILED", { status: res.status }');
    expect(source).not.toContain('const body = await res.text()');
    expect(source).not.toContain('{ status: res.status, body }');
    expect(source).not.toContain('Twilio ${res.status}: ${body}');
    expect(source).not.toContain('Resend ${res.status}: ${body}');
    expect(source).not.toContain('err instanceof Error ? err.message : "Network error"');
    expect(source).not.toContain('error: sentErr.message');
    expect(source).not.toContain('error: lotsError.message');
    expect(source).not.toContain('error: clearDeliveriesResult.error.message');
    expect(source).not.toContain('error: insertDeliveriesResult.error.message');
    expect(source).not.toContain('error: finalStatusUpdate.error.message');
    expect(source).not.toContain('error: dueMessagesError.message');
    expect(source).not.toContain('Email provider not configured (RESEND_API_KEY missing)');
    expect(source).not.toContain('SMS provider credentials are not configured yet.');
  });

  it('keeps guest photo upload readiness clean and hides raw backend failures from guests', () => {
    const source = readFunction('photo-upload');
    const prereqs = readFileSync(join(process.cwd(), 'scripts', 'v1-proof-prereqs.mjs'), 'utf8');

    expect(source).toContain('searchParams.get("readiness") === "1"');
    expect(source).toContain('function: "photo-upload"');
    expect(source).toContain('req.method !== "POST"');
    expect(source).toContain('METHOD_NOT_ALLOWED');
    expect(source).toContain('Hosted upload failed.');
    expect(source).toContain('We couldn\'t upload this file. Please try again.');
    expect(source).toContain('We couldn\'t finish this upload. Please try again.');
    expect(source).not.toContain('return fail("INTERNAL_ERROR", err instanceof Error ? err.message');
    expect(source).not.toContain('error: error instanceof Error ? error.message');
    expect(source).not.toContain('if (error) throw new Error(error.message);\n\n  const { data: signed }');
    expect(prereqs).toContain('requiredFunctionSourceChecks');
    expect(prereqs).toContain('photo-upload-guest-safe-readiness-and-errors');
    expect(prereqs).toContain('requiredFunctionSourceChecksFailing');
    expect(prereqs).toContain('liveEdgeFunctionRuntimeWarnings');
    expect(prereqs).toContain('Review live Edge Function readiness warnings before launch-clear');
  });

  it('keeps public guest Edge Function readiness and raw-error contracts in prereqs', () => {
    const prereqs = readFileSync(join(process.cwd(), 'scripts', 'v1-proof-prereqs.mjs'), 'utf8');

    for (const [name, fixedError] of [
      ['guestbook-submit', 'Could not submit guestbook entry. Please try again.'],
      ['guest-prospect-submit', 'We could not save this update. Please try again.'],
      ['vault-entry-submit', 'Could not save this vault memory. Please try again.'],
    ] as const) {
      const source = readFunction(name);
      expect(source, name).toContain('searchParams.get("readiness") === "1"');
      expect(source, name).toContain(`function: "${name}"`);
      expect(source, name).toContain('req.method !== "POST"');
      expect(source, name).toContain(fixedError);
      expect(source, name).not.toContain('error instanceof Error ? error.message');
      expect(source, name).not.toContain('err instanceof Error ? err.message');
    }

    expect(readFunction('vault-entry-submit')).toContain('Could not upload this vault attachment. Please try again.');
    expect(readFunction('guestbook-submit')).toContain('Guestbook is temporarily unavailable. Please try again.');
    expect(readFunction('guest-prospect-submit')).toContain('eventError');
    expect(prereqs).toContain('photo-export-manifest-safe-readiness-and-errors');
    expect(prereqs).toContain('guestbook-submit-safe-readiness-and-errors');
    expect(prereqs).toContain('guest-prospect-submit-safe-readiness-and-errors');
    expect(prereqs).toContain('vendor-profile-inquiry-safe-readiness-and-errors');
    expect(prereqs).toContain('vault-entry-submit-safe-readiness-and-errors');
  });

  it('keeps public recap image URLs displayable and avoids Google Drive web-view images', () => {
    const source = readFunction('guest-recap-config');

    expect(source).toContain('function isHostedStoragePath');
    expect(source).toContain('function isDisplayableImageUrl');
    expect(source).toContain('drive\\.google\\.com');
    expect(source).toContain('if (isHostedStoragePath(upload.drive_file_id))');
    expect(source).toContain('if (!imageUrl && isDisplayableImageUrl(upload.drive_web_view_link))');
    expect(source).not.toContain('let imageUrl = typeof upload.drive_web_view_link === "string" ? upload.drive_web_view_link : null');
  });
});
