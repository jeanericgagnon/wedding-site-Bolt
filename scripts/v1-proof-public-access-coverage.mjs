#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const functionsRoot = join(process.cwd(), 'supabase', 'functions');
const allowedResolverFunctions = new Set(['public-site-access']);

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

const publicSubresourceFunctions = collectFunctionEntrypoints(functionsRoot)
  .filter(({ name, source }) => {
    if (allowedResolverFunctions.has(name)) return false;
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

console.log(JSON.stringify({
  ok: failures.length === 0,
  generatedAt: new Date().toISOString(),
  mode: 'public_subresource_access_gate_static_coverage',
  resolverFunction: 'public-site-access',
  checkedFunctions: checks.map((check) => check.name),
  checks,
  failures,
}, null, 2));

process.exit(failures.length === 0 ? 0 : 1);
