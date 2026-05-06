import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readFunction(name: string) {
  return readFileSync(join(process.cwd(), 'supabase', 'functions', name, 'index.ts'), 'utf8');
}

function readSharedFunction(name: string) {
  return readFileSync(join(process.cwd(), 'supabase', 'functions', '_shared', name), 'utf8');
}

describe('launch edge function guards', () => {
  it('centralizes collaborator mutation permission helpers', () => {
    const source = readSharedFunction('collaboratorPermissions.ts');

    expect(source).toContain('function hasMutatingCollaboratorRole(role: unknown): boolean');
    expect(source).toContain('role === "planner" || role === "coordinator"');
    expect(source).toContain('export function canMutateMessages(role: unknown, permissions: unknown): boolean');
    expect(source).toContain('export function canMutateGuestsOrMessages(role: unknown, permissions: unknown): boolean');
    expect(source).toContain('export function canMutatePhotos(role: unknown, permissions: unknown): boolean');
    expect(source).toContain('if (!Array.isArray(permissions)) return true');
    expect(source).not.toContain('role === "viewer"');
  });

  it('keeps shared public submission rate limiting free of raw backend errors', () => {
    const source = readSharedFunction('rateLimit.ts');

    expect(source).toContain('PUBLIC_SUBMISSION_RATE_LIMIT_COUNT_FAILED');
    expect(source).toContain('PUBLIC_SUBMISSION_RATE_LIMIT_RECORD_FAILED');
    expect(source).toContain('async function subjectMarker');
    expect(source).toContain('async function requesterIpMarker');
    expect(source).toContain('function safeReferrer');
    expect(source).toContain('parsed.search = ""');
    expect(source).toContain('parsed.hash = ""');
    expect(source).toContain('const referrer = safeReferrer(request.headers.get("referer"))');
    expect(source).toContain('const safeSubject = subject ? await subjectMarker(scope, subject, siteId, siteSlug) : null');
    expect(source).toContain('const safeRequesterIp = ip ? await requesterIpMarker(scope, ip, siteId, siteSlug) : null');
    expect(source).toContain('subject: safeSubject');
    expect(source).toContain('requester_ip: safeRequesterIp');
    expect(source).toContain('requesterIpMarker: safeRequesterIp');
    expect(source).not.toContain('subject }, sinceIso');
    expect(source).not.toContain('subject,\\n    wedding_site_id');
    expect(source).not.toContain('requester_ip: ip');
    expect(source).not.toContain('requesterIp: safeRequesterIp');
    expect(source).not.toContain('{ scope, requester_ip: ip }');
    expect(source).not.toContain('(request.headers.get("referer") || "").slice(0, 500)');
    expect(source).not.toContain('throw new Error(error.message)');
  });

  it('keeps SMS RSVP inbound diagnostics fixed-code only', () => {
    const source = readFunction('sms-rsvp-inbound');

    expect(source).toContain('SMS_RSVP_UPDATE_FAILED');
    expect(source).toContain('SMS_RSVP_INBOUND_UNEXPECTED_FAILURE');
    expect(source).not.toContain('process_error: updateErr?.message');
    expect(source).not.toContain('const message = err instanceof Error ? err.message');
    expect(source).not.toContain('process_error: message');
  });

  it('keeps photo export manifests owner/collaborator gated with fresh hosted links', () => {
    const source = readFunction('photo-export-manifest');

    expect(source).toContain('searchParams.get("readiness") === "1"');
    expect(source).toContain('function: "photo-export-manifest"');
    expect(source).toContain('req.method !== "POST"');
    expect(source).toContain('Authorization');
    expect(source).toContain('auth.getUser');
    expect(source).toContain('site.user_id === user.id');
    expect(source).toContain('wedding_site_collaborators');
    expect(source).toContain('../_shared/collaboratorPermissions.ts');
    expect(source).toContain('.select("role,permissions")');
    expect(source).toContain('canMutatePhotos(collaborator?.role, collaborator?.permissions)');
    expect(source).not.toContain('hasPermissionKey(collaborator?.permissions, "photos")');
    expect(source).toContain('includeHidden');
    expect(source).toContain('query.eq("is_hidden", false)');
    expect(source).toContain('function safeSpreadsheetCell');
    expect(source).toContain('/^[=+\\-@\\t\\r\\n]/.test(text)');
    expect(source).toContain('function safeManifestUrl');
    expect(source).toContain('parsed.username = ""');
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
    expect(source).toContain('wedding_date');
    expect(source).toContain('venue_name');
    expect(source).toContain('venue_location');
    expect(source).toContain('couple_names');
    expect(source).toContain('site_slug');
    expect(source).toContain('inquiry_context');
    expect(source).toContain('Packaged wedding context');
    expect(source).toContain('RESEND_API_KEY');
    expect(source).toContain('reply_to: input.email');
    expect(source).toContain('import { escapeHtml, sanitizeEmailSubject }');
    expect(source).toContain('New wedding inquiry from');
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
    expect(source).toContain('function isPrivateIpv6');
    expect(source).toContain('METADATA_HOSTS');
    expect(source).toContain('Deno.resolveDns');
    expect(source).toContain('MAX_VENDOR_PREVIEW_REDIRECTS');
    expect(source).toContain('MAX_VENDOR_PREVIEW_BYTES');
    expect(source).toContain('VENDOR_PREVIEW_FETCH_TIMEOUT_MS');
    expect(source).toContain('redirect: \'manual\'');
    expect(source).toContain('fetchVendorPreviewHtml(normalizedWebsite)');
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
    expect(source).toContain('function isPublicPreviewResourceUrl(url: string, depth = 0)');
    expect(source).toContain("parsed.protocol === 'http:' || parsed.protocol === 'https:'");
    expect(source).toContain('!parsed.username');
    expect(source).toContain('!parsed.password');
    expect(source).toContain('!isBlockedPreviewHostname(parsed.hostname)');
    expect(source).toContain("parsed.hostname.toLowerCase() === 'images.weserv.nl'");
    expect(source).toContain("const proxiedTarget = parsed.searchParams.get('url')");
    expect(source).toContain('if (depth >= 2) return false');
    expect(source).toContain('return isPublicPreviewResourceUrl(normalizedTarget, depth + 1)');
    expect(source).not.toContain("if (url.includes('images.weserv.nl')) return url");
    expect(source).toContain('if (!isPublicPreviewResourceUrl(url)) return undefined');
    expect(source).toContain('a === 100 && b >= 64 && b <= 127');
    expect(source).toContain('a === 198 && (b === 18 || b === 19)');
    expect(source).toContain('a === 203 && b === 0');
    expect(source).toContain('a >= 224');
    expect(source).toContain('enforceDurableRegistryPreviewRateLimit');
    expect(source).toContain('const ipMarker = `h:${await hashRateLimitKey(`registry-preview-memory:${ip}:${Deno.env.get("SUPABASE_URL") ?? ""}`)}`');
    expect(source).toContain('rateLimitMap.get(ipMarker)');
    expect(source).toContain('rateLimitMap.set(ipMarker');
    expect(source).toContain('registry-preview-user:${userId}');
    expect(source).toContain('guest_token: safeSubjectMarker');
    expect(source).not.toContain('rateLimitMap.get(ip)');
    expect(source).not.toContain('rateLimitMap.set(ip,');
    expect(source).not.toContain('guest_token: userId.slice(0, 16)');
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
    expect(urlNormalizer).toContain('a === 100 && b >= 64 && b <= 127');
    expect(urlNormalizer).toContain('a === 198 && (b === 18 || b === 19)');
    expect(urlNormalizer).toContain('a === 203 && b === 0');
    expect(urlNormalizer).toContain('a >= 224');
    expect(urlNormalizer).toContain("parsed.protocol !== 'http:' && parsed.protocol !== 'https:'");
    expect(urlNormalizer).toContain('parsed.username || parsed.password');
    expect(urlNormalizer).toContain('metadata.google.internal');
    expect(urlNormalizer).toContain('Enter a public product URL.');
  });

  it('keeps transactional email HTML escaped before interpolation', () => {
    const direct = readFunction('send-wedding-email');
    const queue = readFunction('process-email-queue');
    const bulk = readFunction('send-bulk-message');
    const sharedEmailSafety = readFileSync(join(process.cwd(), 'supabase', 'functions', '_shared', 'emailSafety.ts'), 'utf8');
    const emailService = readFileSync(join(process.cwd(), 'src', 'lib', 'emailService.ts'), 'utf8');
    const packageJson = readFileSync(join(process.cwd(), 'package.json'), 'utf8');
    const authorizationProof = readFileSync(join(process.cwd(), 'scripts', 'v1-proof-email-messaging-authorization.mjs'), 'utf8');

    expect(sharedEmailSafety).toContain('export function escapeHtml');
    expect(sharedEmailSafety).toContain('export function safeEmailUrl');
    expect(sharedEmailSafety).toContain('export function safeEmailHref');
    expect(sharedEmailSafety).toContain('export function sanitizeEmailSubject');
    expect(sharedEmailSafety).toContain('.replace(/&/g, "&amp;")');
    expect(sharedEmailSafety).toContain('.replace(/</g, "&lt;")');
    expect(sharedEmailSafety).toContain('.replace(/>/g, "&gt;")');
    expect(sharedEmailSafety).toContain('.replace(/"/g, "&quot;")');
    expect(sharedEmailSafety).toContain('.replace(/\'/g, "&#39;")');
    expect(sharedEmailSafety).toContain('parsed.protocol !== "https:" && parsed.protocol !== "http:"');
    expect(sharedEmailSafety).toContain('code < 32 || code === 127');
    expect(sharedEmailSafety).toContain('.slice(0, 180)');

    for (const source of [direct, queue, bulk]) {
      expect(source).toContain('../_shared/emailSafety.ts');
      expect(source).not.toContain('function escapeHtml');
      expect(source).not.toContain('function sanitizeEmailSubject');
    }

    expect(direct).toContain('import { escapeHtml, safeEmailUrl, sanitizeEmailSubject }');
    expect(direct).toContain('req.method !== "POST"');
    expect(direct).toContain('METHOD_NOT_ALLOWED');
    expect(direct).toContain('subject: sanitizeEmailSubject(subject)');
    expect(direct).toContain('const AUTHENTICATED_EMAIL_TYPES = new Set(["wedding_invitation", "signup_welcome", "anniversary_reminder"])');
    expect(direct).toContain('const SERVICE_ROLE_ONLY_TYPES = new Set(["rsvp_notification", "rsvp_confirmation"])');
    expect(direct).toContain('../_shared/collaboratorPermissions.ts');
    expect(direct).toContain('canMutateGuestsOrMessages(collaborator?.role, collaborator?.permissions)');
    expect(direct).toContain('return canMutateMessages(collaborator?.role, collaborator?.permissions)');
    expect(direct).not.toContain('hasPermissionKey(collaborator?.permissions, "messages");');
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

    expect(queue).toContain('import { escapeHtml, safeEmailHref, sanitizeEmailSubject }');
    expect(queue).toContain('req.method !== "POST"');
    expect(queue).toContain('METHOD_NOT_ALLOWED');
    expect(queue).toContain('subject: sanitizeEmailSubject(built.subject)');
    expect(queue).toContain('escapeHtml(p.guestName');
    expect(queue).toContain('escapeHtml(p.notes)');
    expect(queue).toContain('safeEmailHref(p.recapUrl)');
    expect(queue).toContain('const SAFE_DELIVERY_ERROR = "Email delivery did not complete. Please try again."');
    expect(queue).toContain('PROCESS_EMAIL_QUEUE_PROVIDER_FAILED');
    expect(queue).toContain('error: SAFE_DELIVERY_ERROR');
    expect(queue).toContain('token !== serviceRoleKey');
    expect(queue).not.toContain('Email service not configured');
    expect(queue).not.toContain('Notes: ${p.notes}');
    expect(queue).not.toContain('Hi ${p.guestName || "there"}');
    expect(queue).not.toContain('const errBody = await res.text()');
    expect(queue).not.toContain('sendErr instanceof Error ? sendErr.message');

    expect(emailService).toContain('weddingSiteId?: string | null');
    expect(emailService).toContain('if (!opts.weddingSiteId) throw new Error');
    expect(emailService).toContain('weddingSiteId: opts.weddingSiteId');

    expect(bulk).toContain('import { escapeHtml, sanitizeEmailSubject }');
    expect(bulk).toContain('req.method !== "POST"');
    expect(bulk).toContain('METHOD_NOT_ALLOWED');
    expect(bulk).toContain('subject: sanitizeEmailSubject(opts.subject)');
    expect(bulk).toContain('const MESSAGE_DELIVERY_SELECT = [');
    expect(bulk).toContain('.select(MESSAGE_DELIVERY_SELECT)');
    expect(bulk).toContain('../_shared/collaboratorPermissions.ts');
    expect(bulk).toContain('if (canMutateMessages(role, collaboratorRow?.permissions))');
    expect(bulk).toContain('canMutateMessages(row.role, row.permissions)');
    expect(bulk).not.toContain('role === "planner" || role === "coordinator" || role === "viewer"');
    expect(bulk).not.toContain('.filter((row: { permissions?: unknown }) => hasPermissionKey(row.permissions, "messages"))');
    expect(bulk).not.toContain('.select("*, wedding_sites');

    expect(packageJson).toContain('"proof:v1:email-messaging-authorization": "node scripts/v1-proof-email-messaging-authorization.mjs"');
    expect(authorizationProof).toContain("functionName: 'process-email-queue'");
    expect(authorizationProof).toContain("functionName: 'queue-guest-followups'");
    expect(authorizationProof).toContain("functionName: 'send-bulk-message'");
    expect(authorizationProof).toContain("functionName: 'send-wedding-email'");
    expect(authorizationProof).toContain("mode: 'unauthenticated_live_denial'");
    expect(authorizationProof).toContain('postWithoutAuthorization');
  });

  it('keeps site translation model route owner-gated and free of raw infrastructure errors', () => {
    const source = readFunction('translate-site-content');

    expect(source).toContain('req.method !== "POST"');
    expect(source).toContain('Authorization');
    expect(source).toContain('auth.getUser');
    expect(source).toContain('site.user_id !== userData.user.id');
    expect(source).toContain('import { enforcePublicSubmissionRateLimit }');
    expect(source).toContain('scope: "translate_site_content"');
    expect(source).toContain('maxSubject: 8');
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

    expect(source).toContain('import { enforcePublicSubmissionRateLimit }');
    expect(source).toContain('scope: "onboarding_ai_orchestrate"');
    expect(source).toContain('resolveVerifiedUsageSiteId(');
    expect(source).toContain('const verifiedUsageSiteId = admin ? await resolveVerifiedUsageSiteId(req, admin, siteId) : null');
    expect(source).toContain('admin.auth.getUser(token)');
    expect(source).toContain('.from("wedding_site_collaborators")');
    expect(source).toContain('siteId: verifiedUsageSiteId');
    expect(source).toContain('if (verifiedUsageSiteId && admin && usage && provider === "openai")');
    expect(source).toContain('wedding_site_id: verifiedUsageSiteId');
    expect(source).not.toContain('wedding_site_id: siteId');
    expect(source).toContain('fallbackUsed: true');
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
    expect(source).toContain('../_shared/collaboratorPermissions.ts');
    expect(source).toContain('canMutatePhotos(collaborator?.role, collaborator?.permissions)');
    expect(source).not.toContain('hasPermissionKey(collaborator?.permissions, "photos")');
    expect(source).toContain('safePhotoAlbumManageError("LOOKUP_FAILED")');
    expect(source).toContain('safePhotoAlbumManageError("COLLABORATOR_FAILED")');
    expect(source).toContain('safePhotoAlbumManageError("PARENT_FAILED")');
    expect(source).toContain('safePhotoAlbumManageError("UPDATE_FAILED")');
    expect(source).toContain('safePhotoAlbumManageError("INTERNAL_ERROR")');
    expect(source).toContain('/photos/upload?t=');
    expect(source).toContain('reason: "ALBUM_ACTIVE_UPDATE_FAILED"');
    expect(source).toContain('reason: "ALBUM_LOOKUP_FAILED"');
    expect(source).toContain('reason: "ALBUM_WINDOW_UPDATE_FAILED"');
    expect(source).toContain('reason: "ALBUM_PARENT_UPDATE_FAILED"');
    expect(source).toContain('reason: "ALBUM_LINK_REGENERATION_FAILED"');
    expect(source).toContain('reason: "UNEXPECTED_PHOTO_ALBUM_MANAGE_FAILURE"');
    expect(source).not.toContain('collaboratorError.message');
    expect(source).not.toContain('parentError.message');
    expect(source).not.toContain('PHOTO_ALBUM_MANAGE_LOOKUP_FAILED", albumErr');
    expect(source).not.toContain('error: error.message');
    expect(source).not.toContain('err instanceof Error ? err.message');
    expect(source).not.toMatch(/console\.error\("PHOTO_ALBUM_MANAGE_[^"]+",\s*(err|error)\)/);
  });

  it('keeps photo album creation and moderation free of raw backend failures', () => {
    const create = readFunction('photo-album-create');
    const moderate = readFunction('photo-upload-moderate');
    const packageJson = readFileSync(join(process.cwd(), 'package.json'), 'utf8');
    const serviceRoleAuthorizationProof = readFileSync(join(process.cwd(), 'scripts', 'v1-proof-service-role-authorization.mjs'), 'utf8');

    expect(create).toContain('safePhotoAlbumCreateError("CONFIG")');
    expect(create).toContain('safePhotoAlbumCreateError("PARENT")');
    expect(create).toContain('safePhotoAlbumCreateError("SAVE")');
    expect(create).toContain('safePhotoAlbumCreateError("INTERNAL")');
    expect(create).toContain('../_shared/collaboratorPermissions.ts');
    expect(create).toContain('.select("role,permissions")');
    expect(create).toContain('canMutatePhotos(collaborator?.role, collaborator?.permissions)');
    expect(create).toContain('reason: "COLLABORATOR_LOAD_FAILED"');
    expect(create).not.toContain('if (!site || site.user_id !== user.id) return fail("FORBIDDEN"');
    expect(create).not.toContain('hasPermissionKey(collaborator?.permissions, "photos")');
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
    expect(moderate).toContain('../_shared/collaboratorPermissions.ts');
    expect(moderate).toContain('.select("wedding_site_id,role,permissions")');
    expect(moderate).toContain('canMutatePhotos(row.role, row.permissions)');
    expect(moderate).not.toContain('hasPermissionKey(row.permissions, "photos")');
    expect(moderate).toContain('reason: "PHOTO_MODERATION_SAVE_FAILED"');
    expect(moderate).toContain('reason: "UNEXPECTED_PHOTO_MODERATION_FAILURE"');
    expect(moderate).not.toContain('uploadsErr?.message');
    expect(moderate).not.toContain('collaboratorError.message');
    expect(moderate).not.toContain('updateErr.message');
    expect(moderate).not.toContain('err instanceof Error ? err.message');
    expect(moderate).not.toMatch(/console\.error\("PHOTO_UPLOAD_MODERATE_[^"]+",\s*(err|updateErr)\)/);

    expect(packageJson).toContain('"proof:v1:service-role-authorization": "node scripts/v1-proof-service-role-authorization.mjs"');
    expect(serviceRoleAuthorizationProof).toContain("functionName: 'photo-album-create'");
    expect(serviceRoleAuthorizationProof).toContain("functionName: 'photo-album-manage'");
    expect(serviceRoleAuthorizationProof).toContain("functionName: 'photo-upload-moderate'");
    expect(serviceRoleAuthorizationProof).toContain("functionName: 'photo-export-manifest'");
    expect(serviceRoleAuthorizationProof).toContain("functionName: 'photo-analyze-batch'");
    expect(serviceRoleAuthorizationProof).toContain("mode: 'service_role_media_unauthenticated_live_denial'");
    expect(serviceRoleAuthorizationProof).toContain('postWithoutAuthorization');
  });

  it('keeps photo AI analysis readbacks explicit after service-role upsert', () => {
    const source = readFunction('photo-analyze-batch');

    expect(source).toContain('import { enforcePublicSubmissionRateLimit }');
    expect(source).toContain('scope: "photo_analyze_batch"');
    expect(source).toContain('subject: `${userData.user.id}:${siteId}:${requestedProvider}:${analysisMode}`');
    expect(source).toContain('../_shared/collaboratorPermissions.ts');
    expect(source).toContain('hasAccess = canMutatePhotos(collaborator?.role, collaborator?.permissions)');
    expect(source).not.toContain('role === "owner" || role === "coordinator" || permissions.includes("photos") || permissions.includes("media")');
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
    const googleDriveStart = readFunction('google-drive-auth-start');
    const publicSiteAccess = readFunction('public-site-access');

    expect(rsvp).toContain('VALIDATE_RSVP_TOKEN_UNEXPECTED_FAILED');
    expect(rsvp).toContain('Could not update this RSVP. Please try again.');
    expect(rsvp).toContain('action === "lookup_guest"');
    expect(rsvp).toContain('rsvpSession');
    expect(rsvp).toContain('validateRsvpSession');
    expect(rsvp).toContain('if (!guestId?.trim() || !rsvpSession?.trim())');
    expect(rsvp).toContain('enforceRateLimit("rsvp_lookup"');
    expect(rsvp).toContain('enforceRateLimit("rsvp_lookup_guest"');
    expect(rsvp).toContain('const safeSubjectMarker = subject');
    expect(rsvp).toContain('sha256Hex(`${scope}:${subject}:${supabaseUrl}`)');
    expect(rsvp).not.toContain('guest_token: (subject ?? scope).slice(0, 16)');
    expect(rsvp).toContain('Please use the private RSVP link or code from your invitation.');
    const sanitizeGuestBody = rsvp.match(/function sanitizeGuest[\s\S]*?function sanitizeHouseholdGuest/)?.[0] ?? '';
    expect(sanitizeGuestBody).not.toContain('wedding_site_id: guest.wedding_site_id');
    expect(rsvp).not.toContain('invite_token, wedding_site_id, household_id, children_allowed');
    expect(rsvp).not.toContain('name.ilike.%');
    expect(rsvp).not.toContain('byName.map');
    expect(rsvp).not.toContain('const message = err instanceof Error ? err.message');

    const rsvpPage = readFileSync(join(process.cwd(), 'src', 'pages', 'RSVP.tsx'), 'utf8');
    expect(rsvpPage).toContain("action: 'lookup_guest', guestId: picked.id, rsvpSession: rsvpSessionToken");

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
    expect(googleDrive).toContain('import { verifySessionToken } from "../_shared/signedSession.ts"');
    expect(googleDrive).toContain('type GoogleDriveOAuthState = ');
    expect(googleDrive).toContain('scope: "google_drive_oauth"');
    expect(googleDrive).toContain('verifySessionToken<GoogleDriveOAuthState>');
    expect(googleDrive).toContain('Deno.env.get("GOOGLE_DRIVE_STATE_SECRET") || serviceRole');
    expect(googleDrive).toContain('state.scope !== "google_drive_oauth"');
    expect(googleDrive).not.toContain('JSON.parse(atob(stateRaw))');
    expect(googleDrive).toContain('Could not connect Google Drive. Please try again.');
    expect(googleDrive).toContain('Google Drive connection is not ready yet.');
    expect(googleDrive).not.toContain('details: tokenJson');
    expect(googleDrive).not.toContain('GOOGLE_DRIVE_AUTH_TOKEN_EXCHANGE_FAILED", tokenJson');
    expect(googleDrive).not.toContain('Google OAuth error: ${oauthErr}');
    expect(googleDrive).not.toContain('Google Drive OAuth is not configured on server env.');
    expect(googleDrive).not.toContain('err instanceof Error ? err.message');

    expect(googleDriveStart).toContain('import { signSessionToken } from "../_shared/signedSession.ts"');
    expect(googleDriveStart).toContain('const state = await signSessionToken');
    expect(googleDriveStart).toContain('scope: "google_drive_oauth"');
    expect(googleDriveStart).toContain('Deno.env.get("GOOGLE_DRIVE_STATE_SECRET") || serviceRole');
    expect(googleDriveStart).not.toContain('btoa(JSON.stringify({ siteId');

    expect(publicSiteAccess).toContain('PUBLIC_SITE_ACCESS_FAILED');
    expect(publicSiteAccess).toContain('reason: "UNEXPECTED_PUBLIC_SITE_ACCESS_FAILURE"');
    expect(publicSiteAccess).toContain('password_unlock');
    expect(publicSiteAccess).toContain('passwordSession');
    expect(publicSiteAccess).toContain('buildSafePublicSite');
    expect(publicSiteAccess).toContain('allow_search_indexing');
    expect(publicSiteAccess).toContain('enforcePasswordAttemptRateLimit');
    expect(publicSiteAccess).toContain('public-site-access:${slug}');
    expect(publicSiteAccess).toContain('guest_token: safeSubjectMarker');
    expect(publicSiteAccess).not.toContain('guest_token: slug.slice(0, 16)');
    expect(publicSiteAccess).toContain('Too many password attempts.');
    expect(publicSiteAccess).toContain('normalizePublicPrivacyMode');
    expect(publicSiteAccess).toContain('resolvePublicAccessStatus');
    expect(publicSiteAccess).toContain('if (!privacyMode)');
    expect(publicSiteAccess).toContain('status: "invite_required", site: null');
    expect(publicSiteAccess).toContain('status: "coming_soon", site: null');
    expect(publicSiteAccess).toContain('"privacy_mode"');
    expect(publicSiteAccess).toContain('"hide_from_search"');
    expect(publicSiteAccess).not.toContain('site: row');
    expect(publicSiteAccess).not.toContain('site: buildSafePublicSite(row), guest_access_token');
    expect(publicSiteAccess).not.toContain('ilike("site_url"');
    expect(publicSiteAccess).not.toContain('row.privacy_mode : "public"');
    const safeColumns = publicSiteAccess.match(/const SAFE_PUBLIC_SITE_COLUMNS = \[([\s\S]*?)\];/)?.[1] ?? '';
    expect(safeColumns).not.toContain('privacy_mode');
    expect(safeColumns).not.toContain('hide_from_search');

    const packageJson = readFileSync(join(process.cwd(), 'package.json'), 'utf8');
    const publicAccessCoverageProof = readFileSync(join(process.cwd(), 'scripts', 'v1-proof-public-access-coverage.mjs'), 'utf8');
    expect(packageJson).toContain('"proof:v1:public-access-coverage": "node scripts/v1-proof-public-access-coverage.mjs"');
    expect(publicAccessCoverageProof).toContain("mode: 'public_subresource_access_gate_static_coverage'");
    expect(publicAccessCoverageProof).toContain('allowedResolverFunctions');
    expect(publicAccessCoverageProof).toContain('canReadPublicSubresource({');
    expect(publicAccessCoverageProof).toContain('storedInviteToken');
  });

  it('keeps RSVP lookup token-only and non-enumerating', () => {
    const rsvp = readFunction('validate-rsvp-token');
    const lookupBlock = rsvp.match(/if \(payload\.action === "lookup"\) \{[\s\S]*?\n {4}if \(payload\.action === "lookup_guest"\)/)?.[0] ?? '';

    expect(lookupBlock).toContain('.eq("invite_token", trimmed)');
    expect(lookupBlock).toContain('Please use the private RSVP link or code from your invitation.');
    expect(lookupBlock).toContain('guests: null');
    expect(lookupBlock).toContain('rsvpSession');
    expect(lookupBlock).toContain('sanitizeGuest(guest)');
    expect(lookupBlock).not.toContain('.ilike(');
    expect(lookupBlock).not.toContain('name.ilike');
    expect(lookupBlock).not.toContain('byName');
    expect(lookupBlock).not.toContain('matches');
    expect(lookupBlock).not.toContain('guests: by');
    expect(lookupBlock).not.toContain('email');
    expect(lookupBlock).not.toContain('invite_token:');
    expect(lookupBlock).not.toContain('wedding_site_id: guest.wedding_site_id');
  });

  it('keeps public registry and itinerary subresources behind the public access gate', () => {
    const registry = readFunction('public-registry-items');
    const itinerary = readFunction('public-itinerary-by-slug');
    const sharedGate = readFileSync(join(process.cwd(), 'supabase', 'functions', '_shared', 'publicAccessGate.ts'), 'utf8');

    for (const source of [registry, itinerary]) {
      expect(source).toContain('canReadPublicSubresource');
      expect(source).toContain('privacy_mode');
      expect(source).toContain('guest_access_token');
      expect(source).toContain('isPublished: site.is_published === true');
      expect(source).not.toContain('privacy_mode ?? "public"');
    }

    expect(sharedGate).toContain('normalizePublicPrivacyMode');
    expect(sharedGate).toContain('return null;');
    expect(sharedGate).toContain('if (!privacyMode) return "unavailable"');
    expect(sharedGate).toContain('if (privacyMode === "hidden") return "coming_soon"');
    expect(sharedGate).toContain('privacyMode === "password_protected"');
    expect(sharedGate).toContain('privacyMode === "invite_only"');
    expect(sharedGate).toContain('return await resolvePublicAccessStatus(input) === "open"');
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
    expect(guestHubTrack).toContain('import { canReadPublicSubresource } from "../_shared/publicAccessGate.ts"');
    expect(guestHubTrack).toContain('.select("id,site_slug,is_published,privacy_mode,guest_access_token")');
    expect(guestHubTrack).toContain('canReadPublicSubresource');
    expect(guestHubTrack).toContain('storedInviteToken: site.guest_access_token');
    expect(guestHubTrack).toContain('import { enforcePublicSubmissionRateLimit } from "../_shared/rateLimit.ts"');
    expect(guestHubTrack).toContain('scope: "guest_hub_track"');
    expect(guestHubTrack).toContain('if (!rateLimit.ok) return json({ ok: true, tracked: false })');
    expect(guestHubTrack).toContain('function safeReferrer');
    expect(guestHubTrack).toContain('parsed.search = ""');
    expect(guestHubTrack).toContain('const referrer = safeReferrer(req.headers.get("referer"))');
    expect(guestHubTrack).not.toContain('(req.headers.get("referer") || "").slice(0, 500)');
    expect(guestHubTrack).not.toContain('Supabase not configured');

    const guestHubConfig = readFunction('guest-hub-config');
    expect(guestHubConfig).toContain('import { canReadPublicSubresource } from "../_shared/publicAccessGate.ts"');
    expect(guestHubConfig).toContain('x-dayof-invite-token');
    expect(guestHubConfig).toContain('x-dayof-password-session');
    expect(guestHubConfig).toContain('.select("id,is_published,site_slug,privacy_mode,guest_access_token,couple_name_1,couple_name_2,wedding_date")');
    expect(guestHubConfig).toContain('canReadPublicSubresource');
    expect(guestHubConfig).toContain('storedInviteToken: site.guest_access_token');
    expect(guestHubConfig).not.toContain('if (!site || !site.is_published)');

    const guestRecapConfig = readFunction('guest-recap-config');
    expect(guestRecapConfig).toContain('import { canReadPublicSubresource } from "../_shared/publicAccessGate.ts"');
    expect(guestRecapConfig).toContain('x-dayof-invite-token');
    expect(guestRecapConfig).toContain('x-dayof-password-session');
    expect(guestRecapConfig).toContain('.select("id,site_slug,is_published,privacy_mode,guest_access_token,couple_name_1,couple_name_2,wedding_date")');
    expect(guestRecapConfig).toContain('canReadPublicSubresource');
    expect(guestRecapConfig).toContain('storedInviteToken: site.guest_access_token');
    expect(guestRecapConfig).not.toContain('if (!site || !site.is_published)');

    const logClientError = readFunction('log-client-error');
    expect(logClientError).toContain('LOG_CLIENT_ERROR_UNEXPECTED_FAILED');
    expect(logClientError).toContain('Could not save error report.');
    expect(logClientError).toContain('import { enforcePublicSubmissionRateLimit } from "../_shared/rateLimit.ts"');
    expect(logClientError).toContain('scope: "log_client_error"');
    expect(logClientError).toContain('function sanitizeRoute');
    expect(logClientError).toContain('function sanitizeMetadataValue');
    expect(logClientError).toContain('token|secret|password|authorization|apikey|service_role|service-role|cookie');
    expect(logClientError).toContain('let inferredUserId: string | null = null');
    expect(logClientError).toContain('let inferredSiteId: string | null = null');
    expect(logClientError).toContain('.eq("user_id", inferredUserId)');
    expect(logClientError).not.toContain('let inferredUserId: string | null = payload.userId');
    expect(logClientError).not.toContain('let inferredSiteId: string | null = payload.weddingSiteId');
    expect(logClientError).toContain('reason: "CLIENT_ERROR_INSERT_FAILED"');
    expect(logClientError).toContain('reason: "UNEXPECTED_CLIENT_ERROR_LOG_FAILURE"');
    expect(logClientError).not.toContain('const msg = err instanceof Error ? err.message');
    expect(logClientError).not.toContain('return json({ error: msg }, 500)');

    const queue = readFunction('process-email-queue');
    expect(queue).toContain('const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!');
    expect(queue).toContain('token !== serviceRoleKey');
    expect(queue).toContain('Unauthorized');

    const queueFollowups = readFunction('queue-guest-followups');
    expect(queueFollowups).toContain('../_shared/collaboratorPermissions.ts');
    expect(queueFollowups).toContain('allowed = canMutateMessages(collaborator?.role, collaborator?.permissions)');
    expect(queueFollowups).not.toContain('allowed = hasPermissionKey(collaborator?.permissions, "messages")');
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
    expect(vaultResolve).toContain('VAULT_RESOLVE_ENTRY_SIGNED_URL_FAILED", { reason: "SIGNED_URL_FAILED" }');
    expect(vaultResolve).not.toContain('VAULT_RESOLVE_ENTRY_SIGNED_URL_FAILED", signedErr');

    const vaultUpload = readFunction('vault-upload-google-drive');
    expect(vaultUpload).toContain('import { canReadPublicSubresource } from "../_shared/publicAccessGate.ts"');
    expect(vaultUpload).toContain('.select("id,is_published,site_slug,privacy_mode,guest_access_token,vault_storage_provider');
    expect(vaultUpload).toContain('const hasAccess = site');
    expect(vaultUpload).toContain('storedInviteToken: typeof site.guest_access_token === "string" ? site.guest_access_token : null');
    expect(vaultUpload).not.toContain('if (!site || !site.is_published)');
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

    expect(readFunction('submit-contact-request')).toContain('SUBMIT_CONTACT_REQUEST_UPDATE_FAILED", { reason: "GUEST_UPDATE_FAILED" }');
    expect(readFunction('submit-contact-request')).not.toContain('SUBMIT_CONTACT_REQUEST_UPDATE_FAILED", guestErr');
    expect(readFunction('setup-bootstrap')).toContain('SETUP_BOOTSTRAP_LOAD_FAILED", { reason: "SITE_LOAD_FAILED" }');
    expect(readFunction('setup-bootstrap')).not.toContain('SETUP_BOOTSTRAP_LOAD_FAILED", siteErr');
    expect(readFunction('photo-upload-moderate')).toContain('PHOTO_UPLOAD_MODERATE_LOAD_FAILED", { reason: "UPLOAD_LOAD_FAILED" }');
    expect(readFunction('photo-upload-moderate')).not.toContain('PHOTO_UPLOAD_MODERATE_LOAD_FAILED", uploadsErr');
    expect(readFunction('photo-upload-moderate')).toContain('Array.from(new Set');
    expect(readFunction('photo-upload-moderate')).toContain('uploads.length !== uploadIds.length');
    expect(readFunction('photo-upload-moderate')).toContain('One or more selected photos could not be found.');
  });

  it('keeps public guest contact updates session-scoped instead of browser-id scoped', () => {
    const lookup = readFunction('guest-contact-lookup');
    const submit = readFunction('guest-contact-submit');
    const contactPage = readFileSync(join(process.cwd(), 'src', 'pages', 'GuestContactUpdate.tsx'), 'utf8');

    expect(lookup).toContain('req.method !== "POST"');
    expect(lookup).toContain('import { canReadPublicSubresource } from "../_shared/publicAccessGate.ts"');
    expect(lookup).toContain('.select("id,site_slug,is_published,privacy_mode,guest_access_token")');
    expect(lookup).toContain('const hasAccess = await canReadPublicSubresource');
    expect(lookup).toContain('storedInviteToken: typeof site.guest_access_token === "string" ? site.guest_access_token : null');
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
    expect(contactPage).toContain('buildGuestContactAccessPayload');
    expect(contactPage).toContain('...buildGuestContactAccessPayload(siteRef)');
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
      'public-site-rsvp-submit',
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

  it('keeps the public-site RSVP widget behind the same public access gate', () => {
    const submit = readFunction('public-site-rsvp-submit');
    const rsvpSection = readFileSync(join(process.cwd(), 'src', 'sections', 'components', 'RsvpSection.tsx'), 'utf8');
    const rsvpMultiEvent = readFileSync(join(process.cwd(), 'src', 'sections', 'variants', 'rsvp', 'multiEvent.tsx'), 'utf8');
    const rlsMigration = readFileSync(join(process.cwd(), 'supabase', 'migrations', '20260505102000_site_rsvps_public_gate_rls.sql'), 'utf8');

    expect(submit).toContain('canReadPublicSubresource');
    expect(submit).toContain('.select("id,site_slug,is_published,privacy_mode,guest_access_token")');
    expect(submit).toContain('enforceSubmitRateLimit');
    expect(submit).toContain('function isSafeEmail');
    expect(submit).toContain('Enter a valid email address or leave it blank.');
    expect(submit).toContain('guest_email: guestEmail');
    expect(submit).toContain('PUBLIC_SITE_RSVP_INSERT_FAILED');
    expect(submit).toContain('reason: "PUBLIC_SITE_RSVP_INSERT_FAILED"');
    expect(submit).toContain('reason: "UNEXPECTED_PUBLIC_SITE_RSVP_FAILURE"');
    expect(submit).toContain('public-site-rsvp:${slug}');
    expect(submit).toContain('guest_token: safeSubjectMarker');
    expect(submit).not.toContain('guest_token: slug.slice(0, 16)');
    expect(submit).not.toContain('site: row');
    expect(submit).not.toContain('.select("*")');

    expect(rsvpSection).toContain("supabase.functions.invoke('public-site-rsvp-submit'");
    expect(rsvpSection).toContain("supabase.functions.invoke('public-site-access'");
    expect(rsvpSection).not.toContain("supabase.from('wedding_sites').select('id')");
    expect(rsvpSection).not.toContain("supabase.from('site_rsvps').insert");
    expect(rsvpMultiEvent).toContain("supabase.functions.invoke('public-site-rsvp-submit'");
    expect(rsvpMultiEvent).not.toContain("supabase.from('wedding_sites')");
    expect(rsvpMultiEvent).not.toContain("supabase.from('site_rsvps').insert");

    expect(rlsMigration).toContain('ADD COLUMN IF NOT EXISTS guest_email text');
    expect(rlsMigration).toContain("ws.privacy_mode = 'public'");
    expect(rlsMigration).toContain('Public can submit site RSVPs for open public sites');
    expect(rlsMigration).not.toContain('WHERE is_published = true');
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
      'public-site-rsvp-submit',
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
      expect(source, name).not.toMatch(/console\.error\("[^"]+",\s*(err|error|albumErr|updateErr|saveError|sendErr|clearDeliveriesResult\.error|insertDeliveriesResult\.error|finalStatusUpdate\.error|updateError|lotsError|dueMessagesError|queueError|siteError|parentError|collaboratorError|txError|balError)\)/);
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
    expect(readFunction('photo-album-manage')).toContain('reason: "ALBUM_LOOKUP_FAILED"');
    expect(readFunction('photo-album-manage')).toContain('reason: "COLLABORATOR_LOAD_FAILED"');
    expect(readFunction('photo-album-manage')).toContain('reason: "PARENT_ALBUM_LOAD_FAILED"');
    expect(readFunction('photo-upload-moderate')).toContain('reason: "COLLABORATOR_LOAD_FAILED"');
    expect(readFunction('guest-contact-lookup')).toContain('reason: "UNEXPECTED_GUEST_CONTACT_LOOKUP_FAILURE"');
    expect(readFunction('guest-contact-submit')).toContain('reason: "UNEXPECTED_GUEST_CONTACT_SUBMIT_FAILURE"');
    expect(readFunction('submit-contact-request')).toContain('reason: "UNEXPECTED_CONTACT_REQUEST_SUBMIT_FAILURE"');
    expect(readFunction('submit-rsvp')).toContain('reason: "UNEXPECTED_RSVP_SUBMIT_FAILURE"');
    expect(readFunction('submit-rsvp')).toContain('hashRateLimitSubject');
    expect(readFunction('submit-rsvp')).toContain('function cleanText');
    expect(readFunction('submit-rsvp')).toContain('const notes = cleanText(body.notes, 1000)');
    expect(readFunction('submit-rsvp')).toContain('guest_token: await hashRateLimitSubject(inviteToken.trim())');
    expect(readFunction('submit-rsvp')).not.toContain('guest_token: inviteToken.slice(0, 16)');
    expect(readFunction('submit-rsvp')).not.toContain('id, invite_token, wedding_site_id');
    expect(readFunction('validate-rsvp-token')).toContain('reason: "UNEXPECTED_RSVP_TOKEN_VALIDATION_FAILURE"');
    expect(readFunction('guest-recap-config')).toContain('reason: "UNEXPECTED_GUEST_RECAP_CONFIG_FAILURE"');
    expect(readFunction('queue-guest-followups')).toContain('reason: "UNEXPECTED_QUEUE_GUEST_FOLLOWUPS_FAILURE"');
    expect(readFunction('public-site-access')).toContain('reason: "UNEXPECTED_PUBLIC_SITE_ACCESS_FAILURE"');
    expect(readFunction('public-site-rsvp-submit')).toContain('reason: "UNEXPECTED_PUBLIC_SITE_RSVP_FAILURE"');
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

    expect(source).toContain('import { escapeHtml, sanitizeEmailSubject }');
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
    expect(source).not.toContain('SEND_BULK_MESSAGE_EMAIL_CAP_LOAD_FAILED", sentErr');
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
    expect(source).toContain('PHOTO_UPLOAD_ROW_INSERT_FAILED');
    expect(source).toContain('import { canReadPublicSubresource } from "../_shared/publicAccessGate.ts"');
    expect(source).toContain('.select("id,site_slug,is_published,privacy_mode,guest_access_token")');
    expect(source).toContain('const hasAccess = siteBySlug');
    expect(source).toContain('storedInviteToken: typeof siteBySlug.guest_access_token === "string" ? siteBySlug.guest_access_token : null');
    expect(source).toContain('const requesterIpMarker = requesterIp ? `h:${await sha256Hex(`photo-upload:${album.id}:${requesterIp}`)}` : null');
    expect(source).toContain('const attemptTokenMarker = tokenHash ?? `site:${await sha256Hex(`photo-upload-site:${siteSlug}`)}`');
    expect(source).toContain('.select("id, vault_google_drive_connected, vault_google_drive_access_token, vault_google_drive_refresh_token, vault_google_drive_token_expires_at")');
    expect(source).toContain('if (!site) return fail("SITE_UNAVAILABLE", "Site not available for uploads.", 403);');
    expect(source).not.toContain('(!tokenHash && !site.is_published)');
    expect(source).toContain('.eq("requester_ip", requesterIpMarker)');
    expect(source).toContain('requester_ip: requesterIpMarker');
    expect(source).not.toContain('.eq("requester_ip", requesterIp)');
    expect(source).not.toContain('requester_ip: requesterIp,');
    expect(source).not.toContain('token_hash: tokenHash ?? `site:${siteSlug}`');
    expect(source).toContain('We couldn\'t upload this file. Please try again.');
    expect(source).toContain('We couldn\'t finish this upload. Please try again.');
    expect(source).not.toContain('return fail("INTERNAL_ERROR", err instanceof Error ? err.message');
    expect(source).not.toContain('error: error instanceof Error ? error.message');
    expect(source).not.toContain('if (error) throw new Error(error.message);');
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
    const vaultSubmit = readFunction('vault-entry-submit');
    expect(vaultSubmit).toContain('import { canReadPublicSubresource } from "../_shared/publicAccessGate.ts"');
    expect(vaultSubmit).toContain('.select("id,site_slug,is_published,privacy_mode,guest_access_token,wedding_date")');
    expect(vaultSubmit).toContain('const hasAccess = await canReadPublicSubresource');
    expect(vaultSubmit).toContain('storedInviteToken: typeof site.guest_access_token === "string" ? site.guest_access_token : null');
    expect(vaultSubmit).not.toContain('.select("id, is_published, wedding_date")');
    expect(vaultSubmit).not.toContain('if (!site?.is_published)');
    const guestbook = readFunction('guestbook-submit');
    expect(guestbook).toContain('Guestbook is temporarily unavailable. Please try again.');
    expect(guestbook).toContain('import { canReadPublicSubresource } from "../_shared/publicAccessGate.ts"');
    expect(guestbook).toContain('.select("id,site_slug,is_published,privacy_mode,guest_access_token")');
    expect(guestbook).toContain('canReadPublicSubresource');
    expect(guestbook).toContain('storedInviteToken: site.guest_access_token');
    expect(guestbook).not.toContain('if (!site || !site.is_published)');
    expect(guestbook).toContain('const requesterIpMarker = requesterIp ? `h:${await sha256Hex(`guestbook:${site.id}:${requesterIp}`)}` : null');
    expect(guestbook).toContain('.eq("requester_ip", requesterIpMarker)');
    expect(guestbook).toContain('requester_ip: requesterIpMarker');
    expect(guestbook).not.toContain('.eq("requester_ip", requesterIp)');
    expect(guestbook).not.toContain('requester_ip: requesterIp,');
    const guestProspect = readFunction('guest-prospect-submit');
    expect(guestProspect).toContain('eventError');
    expect(guestProspect).toContain('import { canReadPublicSubresource } from "../_shared/publicAccessGate.ts"');
    expect(guestProspect).toContain('.select("id,site_slug,is_published,privacy_mode,guest_access_token")');
    expect(guestProspect).toContain('const hasPublicAccess = await canReadPublicSubresource');
    expect(guestProspect).toContain('const uploadToken = typeof body.uploadToken === "string" ? body.uploadToken.trim() : null');
    expect(guestProspect).toContain('.eq("upload_token_hash", await sha256Hex(uploadToken))');
    expect(guestProspect).toContain('albumUploadWindowIsOpen(album)');
    expect(guestProspect).toContain('if (!hasPublicAccess && !hasUploadAccess) return json({ error: "Site not available" }, 404)');
    expect(guestProspect).not.toContain('if (!site || !site.is_published)');
    expect(guestProspect).toContain('function safeReferrer');
    expect(guestProspect).toContain('parsed.search = ""');
    expect(guestProspect).toContain('const referrer = safeReferrer(req.headers.get("referer"))');
    expect(guestProspect).not.toContain('(req.headers.get("referer") || "").slice(0, 500)');
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
