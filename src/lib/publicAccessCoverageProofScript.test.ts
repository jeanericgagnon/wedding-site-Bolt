import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('public access coverage proof script', () => {
  it('audits the resolver and signed-session exceptions alongside shared public subresource gates', () => {
    const script = readFileSync('scripts/v1-proof-public-access-coverage.mjs', 'utf8');

    expect(script).toContain("const allowedResolverFunctions = new Set(['public-site-access'])");
    expect(script).toContain("const auditedAlternateGateFunctions = new Set(['guest-contact-submit'])");
    expect(script).toContain("kind: 'shared_gate'");
    expect(script).toContain("kind: 'resolver'");
    expect(script).toContain("kind: 'alternate_gate'");
    expect(script).toContain('normalizePublicPrivacyMode(row.privacy_mode)');
    expect(script).toContain('storedInviteToken: typeof row.guest_access_token === "string" ? row.guest_access_token : null');
    expect(script).toContain('usesDedicatedSessionSecretSource');
    expect(script).toContain('getPublicSessionSecretSource');
    expect(script).toContain('const translatedRow = applyPublicSiteTranslation(row, translation);');
    expect(script).toContain('const site = buildPublicSiteRenderSite(translatedRow);');
    expect(script).toContain('translated_site_json,translated_published_json,translated_wedding_data,translated_layout_config');
    expect(script).toContain('const renderModelSource = readFileSync(join(process.cwd(), \'src\', \'lib\', \'publicSiteRenderModel.ts\'), \'utf8\')');
    expect(script).toContain('const clientContractSource = readFileSync(join(process.cwd(), \'src\', \'lib\', \'publicSiteAccess.ts\'), \'utf8\')');
    expect(script).toContain('const siteViewSource = readFileSync(join(process.cwd(), \'src\', \'pages\', \'SiteView.tsx\'), \'utf8\')');
    expect(script).toContain('ownsPersistedSectionsFallback');
    expect(script).toContain('usesAllowlistedRenderModel');
    expect(script).toContain('avoidsDraftFirstPublishedWeddingData');
    expect(script).toContain('removesWeddingMetaFromNetworkPayload');
    expect(script).toContain('clientSanitizerMatchesDto');
    expect(script).toContain('publicBrowserAvoidsSectionsReads');
    expect(script).toContain('verifySessionToken<ContactSessionPayload>');
    expect(script).toContain('contactPayload.scope !== "guest_contact_update"');
    expect(script).toContain('site.id !== contactPayload.siteId');
    expect(script).toContain('.eq("id", contactPayload.guestId)');
    expect(script).toContain("!source.includes('const guestId = String(body.guest_id')");
  });
});
