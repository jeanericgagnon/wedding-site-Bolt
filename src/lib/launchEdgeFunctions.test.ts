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
    expect(source).toContain('metadata.google.internal');
    expect(source).toContain('content-length');
    expect(source).toContain('URL does not point to an HTML page');
    expect(source).toContain('Enter a public product URL.');
    expect(source).toContain('Preview service unavailable. Please fill in details manually.');
    expect(source).toContain('extractProductData(normalized.canonical)');
    expect(source).not.toContain('details: msg');
    expect(source).not.toContain('JSON.stringify({ error: err instanceof Error ? err.message');
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

    for (const source of [direct, queue, bulk]) {
      expect(source).toContain('function escapeHtml');
      expect(source).toContain('.replace(/&/g, "&amp;")');
      expect(source).toContain('.replace(/</g, "&lt;")');
      expect(source).toContain('.replace(/>/g, "&gt;")');
      expect(source).toContain('.replace(/"/g, "&quot;")');
      expect(source).toContain('.replace(/\'/g, "&#39;")');
    }

    expect(direct).toContain('function safeEmailUrl');
    expect(direct).toContain('safeText(data.guestName');
    expect(direct).toContain('safeText(data.coupleName1');
    expect(direct).toContain('escapeHtml(rsvpUrl)');
    expect(direct).toContain('escapeHtml(vaultUrl)');
    expect(direct).not.toContain('const guestName = data.guestName as string;');
    expect(direct).not.toContain('const notes = data.notes as string | null;');

    expect(queue).toContain('function safeEmailHref');
    expect(queue).toContain('escapeHtml(p.guestName');
    expect(queue).toContain('escapeHtml(p.notes)');
    expect(queue).toContain('safeEmailHref(p.recapUrl)');
    expect(queue).not.toContain('Notes: ${p.notes}');
    expect(queue).not.toContain('Hi ${p.guestName || "there"}');
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
    expect(source).not.toContain('collaboratorError.message');
    expect(source).not.toContain('parentError.message');
    expect(source).not.toContain('error: error.message');
    expect(source).not.toContain('err instanceof Error ? err.message');
  });

  it('keeps photo album creation and moderation free of raw backend failures', () => {
    const create = readFunction('photo-album-create');
    const moderate = readFunction('photo-upload-moderate');

    expect(create).toContain('safePhotoAlbumCreateError("CONFIG")');
    expect(create).toContain('safePhotoAlbumCreateError("PARENT")');
    expect(create).toContain('safePhotoAlbumCreateError("SAVE")');
    expect(create).toContain('safePhotoAlbumCreateError("INTERNAL")');
    expect(create).toContain('driveBackupStatus');
    expect(create).not.toContain('Missing SUPABASE_ANON_KEY in function env');
    expect(create).not.toContain('userErr?.message');
    expect(create).not.toContain('parentError.message');
    expect(create).not.toContain('error.message, 400');
    expect(create).not.toContain('err instanceof Error ? err.message');

    expect(moderate).toContain('safePhotoModerationError("LOAD")');
    expect(moderate).toContain('safePhotoModerationError("PERMISSION")');
    expect(moderate).toContain('safePhotoModerationError("SAVE")');
    expect(moderate).toContain('safePhotoModerationError("INTERNAL")');
    expect(moderate).toContain('wedding_site_collaborators');
    expect(moderate).not.toContain('uploadsErr?.message');
    expect(moderate).not.toContain('collaboratorError.message');
    expect(moderate).not.toContain('updateErr.message');
    expect(moderate).not.toContain('err instanceof Error ? err.message');
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
    expect(rsvp).not.toContain('invite_token, wedding_site_id, household_id, children_allowed');
    expect(rsvp).not.toContain('const message = err instanceof Error ? err.message');

    expect(email).toContain('SEND_WEDDING_EMAIL_UNEXPECTED_FAILED');
    expect(email).toContain('Could not send this email. Please try again.');
    expect(email).not.toContain('details: errorBody');
    expect(email).not.toContain('error: message');

    expect(googleDrive).toContain('GOOGLE_DRIVE_AUTH_TOKEN_EXCHANGE_FAILED');
    expect(googleDrive).toContain('Could not connect Google Drive. Please try again.');
    expect(googleDrive).not.toContain('details: tokenJson');
    expect(googleDrive).not.toContain('err instanceof Error ? err.message');

    expect(publicSiteAccess).toContain('PUBLIC_SITE_ACCESS_FAILED');
    expect(publicSiteAccess).toContain('password_unlock');
    expect(publicSiteAccess).toContain('passwordSession');
    expect(publicSiteAccess).toContain('buildSafePublicSite');
    expect(publicSiteAccess).toContain('allow_search_indexing');
    expect(publicSiteAccess).not.toContain('site: row');
    expect(publicSiteAccess).not.toContain('site: buildSafePublicSite(row), guest_access_token');
    const safeColumns = publicSiteAccess.match(/const SAFE_PUBLIC_SITE_COLUMNS = \[([\s\S]*?)\];/)?.[1] ?? '';
    expect(safeColumns).not.toContain('privacy_mode');
    expect(safeColumns).not.toContain('hide_from_search');
  });

  it('keeps guest contact, recap, vault, queue, token, and webhook failures customer-safe', () => {
    for (const [name, fixedError] of [
      ['guest-contact-lookup', 'Could not look up guests. Please try again.'],
      ['guest-contact-submit', 'Could not save this contact update. Please try again.'],
      ['submit-contact-request', 'Could not save this contact update. Please try again.'],
      ['submit-rsvp', 'Could not submit this RSVP. Please try again.'],
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
      expect(source, name).not.toContain('error: error.message');
      expect(source, name).not.toContain('error: updateError.message');
      expect(source, name).not.toContain('const message = err instanceof Error ? err.message');
      expect(source, name).not.toContain('err instanceof Error ? err.message : "Internal server error"');
    }

    const vaultResolve = readFunction('vault-resolve-entry-link');
    expect(vaultResolve).toContain('function safeVaultAttachmentUrl');
    expect(vaultResolve).toContain('parsed.protocol === "https:" || parsed.protocol === "http:"');
    expect(vaultResolve).toContain('safeVaultAttachmentUrl(rawUrl)');
    expect(vaultResolve).toContain('safeVaultAttachmentUrl(entry.external_file_url ?? entry.attachment_url)');
    expect(vaultResolve).toContain('safeVaultAttachmentUrl(url)');
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
