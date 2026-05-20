#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const functionsRoot = join(process.cwd(), 'supabase', 'functions');
const renderModelSource = readFileSync(join(process.cwd(), 'src', 'lib', 'publicSiteRenderModel.ts'), 'utf8');
const clientContractSource = readFileSync(join(process.cwd(), 'src', 'lib', 'publicSiteAccess.ts'), 'utf8');
const publicRenderContractSource = readFileSync(join(process.cwd(), 'src', 'lib', 'publicRenderContract.ts'), 'utf8');
const siteViewSource = readFileSync(join(process.cwd(), 'src', 'pages', 'SiteView.tsx'), 'utf8');
const allowedResolverFunctions = new Set(['public-site-access']);
const auditedAlternateGateFunctions = new Set(['guest-contact-submit']);

function collectFunctionEntrypoints(root) {
  return readdirSync(root)
    .map((entry) => {
      const entryPath = join(root, entry);
      if (!statSync(entryPath).isDirectory()) return null;
      const indexPath = join(entryPath, 'index.ts');
      try {
        statSync(indexPath);
        return { name: entry, source: readFileSync(indexPath, 'utf8') };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

const functionEntrypoints = collectFunctionEntrypoints(functionsRoot);

const publicSubresourceFunctions = functionEntrypoints
  .filter(({ name, source }) => {
    if (allowedResolverFunctions.has(name) || auditedAlternateGateFunctions.has(name)) return false;
    return source.includes('privacy_mode') && source.includes('guest_access_token');
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const checks = publicSubresourceFunctions.map(({ name, source }) => {
  const importsSharedGate = source.includes('import { canReadPublicSubresource } from "../_shared/publicAccessGate.ts"');
  const callsSharedGate = source.includes('canReadPublicSubresource({');
  const carriesPublishedState = source.includes('isPublished: site.is_published === true')
    || source.includes('isPublished: siteBySlug.is_published === true');
  const passesPrivacyMode = source.includes('privacyMode: site.privacy_mode')
    || source.includes('privacyMode: siteBySlug.privacy_mode');
  const passesStoredInviteToken = source.includes('storedInviteToken: site.guest_access_token')
    || source.includes('storedInviteToken: typeof site.guest_access_token === "string" ? site.guest_access_token : null')
    || source.includes('storedInviteToken: typeof siteBySlug.guest_access_token === "string" ? siteBySlug.guest_access_token : null');
  const avoidsPublishedOnlyShortcut = !source.includes('if (!site || !site.is_published)')
    && !source.includes('if (!site?.is_published)')
    && !source.includes('(!tokenHash && !site.is_published)');

  return {
    name,
    ok: importsSharedGate
      && callsSharedGate
      && carriesPublishedState
      && passesPrivacyMode
      && passesStoredInviteToken
      && avoidsPublishedOnlyShortcut,
    importsSharedGate,
    callsSharedGate,
    carriesPublishedState,
    passesPrivacyMode,
    passesStoredInviteToken,
    avoidsPublishedOnlyShortcut,
  };
});

const failures = checks.filter((check) => !check.ok);

const resolverChecks = functionEntrypoints
  .filter(({ name }) => allowedResolverFunctions.has(name))
  .map(({ name, source }) => {
    const keepsPrivateColumnsPrivate = source.includes('const PRIVATE_PUBLIC_SITE_COLUMNS = [')
      && source.includes('"privacy_mode"')
      && source.includes('"site_password_hash"')
      && source.includes('"guest_access_token"');
    const buildsSafePublicSite = source.includes('function buildSafePublicSite')
      && source.includes('const translatedRow = applyPublicSiteTranslation(row, translation);')
      && source.includes('const site = buildPublicSiteRenderSite(translatedRow);')
      && source.includes('translated_site_json,translated_published_json,translated_wedding_data,translated_layout_config');
    const normalizesPrivacyMode = source.includes('normalizePublicPrivacyMode(row.privacy_mode)');
    const passesStoredInviteToken = source.includes('storedInviteToken: typeof row.guest_access_token === "string" ? row.guest_access_token : null');
    const usesDedicatedSessionSecretSource = source.includes('getPublicSessionSecretSource')
      && !source.includes('const sessionSecret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!')
      && !source.includes('PUBLIC_SITE_SESSION_SECRET") ||')
      && !source.includes('PUBLIC_SITE_SESSION_SECRET_V1") ||');
    const avoidsUnsafePayload = !source.includes('site: row')
      && !source.includes('site_password_hash:')
      && !source.includes('guest_access_token: row.guest_access_token')
      && !source.includes('site_json: row.site_json')
      && !source.includes('published_json: row.published_json')
      && !source.includes('wedding_data: row.wedding_data')
      && !source.includes('layout_config: row.layout_config')
      && !source.includes('builderProject:')
      && !source.includes('weddingData:')
      && !source.includes('layoutConfig:');
    const ownsPersistedSectionsFallback = source.includes('const PUBLIC_SECTION_FALLBACK_COLUMNS = [')
      && source.includes('.from("sections")')
      && source.includes('.eq("site_id", String(row.id))')
      && source.includes('.eq("visible", true)')
      && source.includes('buildPersistedPublicFallbackPages(persistedSections)');
    const usesAllowlistedRenderModel = renderModelSource.includes('const ALLOWED_THEME_TOKEN_KEYS')
      && publicRenderContractSource.includes('const PUBLIC_SECTION_SETTINGS_ALLOWLIST: Record<SectionType, readonly string[]> = {')
      && publicRenderContractSource.includes("hero: ['headline', 'eyebrow', 'subheadline', 'backgroundImage', 'overlayOpacity', 'ctaLabel', 'ctaHref', 'showDivider', 'textAlign', 'layoutStyle']")
      && publicRenderContractSource.includes('const PUBLIC_BINDINGS_BY_SECTION_TYPE: Partial<Record<SectionType, readonly (keyof PublicBindingDTO)[]>> = {')
      && publicRenderContractSource.includes("venue: ['venueIds']")
      && publicRenderContractSource.includes("schedule: ['scheduleItemIds']")
      && publicRenderContractSource.includes("registry: ['linkIds']")
      && publicRenderContractSource.includes("faq: ['faqIds']")
      && publicRenderContractSource.includes('export const PUBLIC_STYLE_OVERRIDE_KEYS = [')
      && !renderModelSource.includes("'customClassName'")
      && !renderModelSource.includes("'customCss'")
      && !renderModelSource.includes("'styleRecipeCss'")
      && publicRenderContractSource.includes('export function sanitizePublicSectionSettings(')
      && publicRenderContractSource.includes('manifestToCanonicalSectionDefinition(manifest)')
      && renderModelSource.includes('export function buildPersistedPublicFallbackPages(')
      && renderModelSource.includes('publishedSource?.weddingDataSnapshot')
      && renderModelSource.includes('publishedSource?.weddingData,')
      && !renderModelSource.includes('row.wedding_data,\n      ]')
      && !renderModelSource.includes('allowLegacyLayoutFallback')
      && !renderModelSource.includes('legacyLayoutPublished')
      && renderModelSource.includes('return isPublished ? buildCanonicalRowWeddingFallback(row) : null;')
      && !renderModelSource.includes('meta: normalized.meta')
      && !renderModelSource.includes('PUBLIC_SENSITIVE_KEY_PATTERN')
      && !renderModelSource.includes('sanitizeDeepPublicValue(');
    const avoidsDraftFirstPublishedWeddingData = !renderModelSource.includes('publishedSource?.weddingData,\n        row.wedding_data')
      && !renderModelSource.includes('publishedSource?.weddingDataSnapshot,\n        publishedSource?.weddingData,\n        row.wedding_data');
    const removesWeddingMetaFromNetworkPayload = !renderModelSource.includes('meta: normalized.meta')
      && !clientContractSource.includes('const meta = asRecord(wedding.meta);')
      && !clientContractSource.includes('createdAtISO')
      && !clientContractSource.includes('updatedAtISO');
    const clientSanitizerMatchesDto = clientContractSource.includes('function sanitizePublicWeddingModel(')
      && clientContractSource.includes('function sanitizePublicThemeModel(')
      && clientContractSource.includes('function sanitizePublicRenderSection(')
      && clientContractSource.includes("import { sanitizePublicBindings, sanitizePublicSectionSettings, sanitizePublicStyleOverrides } from './publicRenderContract';")
      && !clientContractSource.includes("wedding: asRecord(renderModel?.wedding) as PublicSiteRenderModel['wedding']")
      && !clientContractSource.includes('tokens: asRecord(asRecord(renderModel?.theme)?.tokens) ?? null')
      && !clientContractSource.includes('customClassName')
      && !clientContractSource.includes('customCss')
      && !clientContractSource.includes('styleRecipeCss');
    const publicBrowserAvoidsSectionsReads = siteViewSource.includes('fetchPublicSiteAccess({')
      && !siteViewSource.includes('fetchPublishedSections(')
      && !siteViewSource.includes('PageRendererFromDB')
      && !siteViewSource.includes("from '../data/siteRepository'");

    return {
      name,
      ok: keepsPrivateColumnsPrivate
        && buildsSafePublicSite
        && normalizesPrivacyMode
        && passesStoredInviteToken
        && usesDedicatedSessionSecretSource
        && avoidsUnsafePayload
        && ownsPersistedSectionsFallback
        && usesAllowlistedRenderModel
        && avoidsDraftFirstPublishedWeddingData
        && removesWeddingMetaFromNetworkPayload
        && clientSanitizerMatchesDto
        && publicBrowserAvoidsSectionsReads,
      keepsPrivateColumnsPrivate,
      buildsSafePublicSite,
      normalizesPrivacyMode,
      passesStoredInviteToken,
      usesDedicatedSessionSecretSource,
      avoidsUnsafePayload,
      ownsPersistedSectionsFallback,
      usesAllowlistedRenderModel,
      avoidsDraftFirstPublishedWeddingData,
      removesWeddingMetaFromNetworkPayload,
      clientSanitizerMatchesDto,
      publicBrowserAvoidsSectionsReads,
    };
  });

const resolverFailures = resolverChecks.filter((check) => !check.ok);

const alternateGateChecks = functionEntrypoints
  .filter(({ name }) => auditedAlternateGateFunctions.has(name))
  .map(({ name, source }) => {
    const verifiesSignedSession = source.includes('verifySessionToken<ContactSessionPayload>');
    const validatesScopedSession = source.includes('contactPayload.scope !== "guest_contact_update"')
      && source.includes('contactPayload.exp <= Date.now()');
    const bindsSiteToSession = source.includes('site.id !== contactPayload.siteId');
    const bindsGuestToSession = source.includes('.eq("id", contactPayload.guestId)');
    const avoidsBrowserGuestId = !source.includes('const guestId = String(body.guest_id')
      && !source.includes('.eq("id", guestId)');

    return {
      name,
      ok: verifiesSignedSession
        && validatesScopedSession
        && bindsSiteToSession
        && bindsGuestToSession
        && avoidsBrowserGuestId,
      verifiesSignedSession,
      validatesScopedSession,
      bindsSiteToSession,
      bindsGuestToSession,
      avoidsBrowserGuestId,
    };
  });

const alternateGateFailures = alternateGateChecks.filter((check) => !check.ok);

const ok = failures.length === 0 && resolverFailures.length === 0 && alternateGateFailures.length === 0;

console.log(JSON.stringify({
  ok,
  generatedAt: new Date().toISOString(),
  mode: 'public_subresource_access_gate_static_coverage',
  contractSummary: ok
    ? 'Public access coverage proof is green: this static boundary lane validates resolver/subresource gate wiring and payload minimization, but it remains supporting public-surface evidence alongside live guest/public proof.'
    : 'Public access coverage proof is not green: static resolver/subresource gate or payload-boundary regressions exist and must be fixed before public-surface launch claims stay credible.',
  resolverFunctions: resolverChecks.map((check) => check.name),
  alternateGateFunctions: alternateGateChecks.map((check) => check.name),
  checkedFunctions: checks.map((check) => check.name),
  resolverChecks,
  alternateGateChecks,
  checks,
  failures: [
    ...failures.map((check) => ({ kind: 'shared_gate', ...check })),
    ...resolverFailures.map((check) => ({ kind: 'resolver', ...check })),
    ...alternateGateFailures.map((check) => ({ kind: 'alternate_gate', ...check })),
  ],
}, null, 2));

process.exit(ok ? 0 : 1);
