#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const envFiles = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.production.local',
  '.vercel/.env.production.local',
];

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const parsed = {};
  const raw = readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const equalsIndex = trimmed.indexOf('=');
    const key = trimmed.slice(0, equalsIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = trimmed.slice(equalsIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    value = value.replace(/\\n$/, '').trim();
    parsed[key] = value;
  }
  return parsed;
}

const fileEnv = envFiles.reduce((merged, filePath) => ({ ...merged, ...parseEnvFile(filePath) }), {});

const getEnv = (key) => process.env[key] ?? fileEnv[key] ?? '';

const envChecks = [
  {
    key: 'VITE_SUPABASE_URL',
    requiredFor: ['canonical-smoke', 'guests-rsvp-ops', 'site-lookup', 'runtime proofs'],
    validate: (value) => /^https:\/\/.+\.supabase\.co$/.test(value),
    hint: 'Use the proof Supabase project URL, for example https://project-ref.supabase.co.',
  },
  {
    key: 'VITE_SUPABASE_ANON_KEY',
    requiredFor: ['canonical-smoke', 'guests-rsvp-ops', 'site-lookup', 'runtime proofs'],
    validate: (value) => value.length > 20,
    hint: 'Use the anon public key from the same proof Supabase project.',
  },
  {
    key: 'PLAYWRIGHT_BASE_URL',
    requiredFor: ['browser runtime proofs'],
    optional: true,
    validate: (value) => /^https?:\/\/.+/.test(value),
    hint: 'Defaults to http://127.0.0.1:4173 when omitted.',
  },
  {
    key: 'VITE_ENABLE_VENDOR_PROFILE_CREATION',
    requiredFor: ['vendor-template-runtime'],
    optional: true,
    validate: (value) => ['true', 'false'].includes(value.toLowerCase()),
    hint: 'Use true for internal generator access, false to keep only the browse/review environment enabled.',
  },
  {
    key: 'ONBOARDING_AI_MODEL',
    requiredFor: ['onboarding-edge-function'],
    optional: true,
    validate: (value) => value.trim().length > 2,
    hint: 'Supabase Edge Function secret/env. Defaults to gpt-4.1-mini when omitted.',
  },
  {
    key: 'V1_OWNER_EMAIL',
    requiredFor: ['collaborator-runtime'],
    optional: true,
    validate: (value) => value.includes('@'),
    hint: 'Disposable owner proof account email.',
  },
  {
    key: 'V1_OWNER_PASSWORD',
    requiredFor: ['collaborator-runtime'],
    optional: true,
    validate: (value) => value.length >= 8,
    hint: 'Disposable owner proof account password.',
  },
  {
    key: 'V1_COLLABORATOR_EMAIL',
    requiredFor: ['collaborator-runtime'],
    optional: true,
    validate: (value) => value.includes('@'),
    hint: 'Disposable collaborator proof account email.',
  },
  {
    key: 'V1_COLLABORATOR_PASSWORD',
    requiredFor: ['collaborator-runtime'],
    optional: true,
    validate: (value) => value.length >= 8,
    hint: 'Disposable collaborator proof account password.',
  },
];

const internalAiSecretChecks = [
  {
    key: 'OPENAI_API_KEY',
    requiredFor: ['server-side onboarding and photo AI proof'],
  },
];

const requiredMigrationFiles = [
  'supabase/migrations/20260429013000_restore_site_privacy_runtime_schema.sql',
  'supabase/migrations/20260429203000_add_site_translations.sql',
  'supabase/migrations/20260429223000_add_guestbook_entries.sql',
  'supabase/migrations/20260430001000_add_photo_ai_analysis.sql',
  'supabase/migrations/20260430002000_photo_metadata_and_ai_bucket_controls.sql',
  'supabase/migrations/20260430004000_add_guest_prospect_optins.sql',
  'supabase/migrations/20260430006000_internal_ai_usage_events.sql',
  'supabase/migrations/20260430007000_add_photo_album_hierarchy.sql',
  'supabase/migrations/20260430008000_add_photo_recap_curation.sql',
  'supabase/migrations/20260430009000_add_guest_recap_publish_status.sql',
  'supabase/migrations/20260430010000_expand_site_translation_languages.sql',
  'supabase/migrations/20260501050000_add_public_submission_events_rate_limit.sql',
  'supabase/migrations/20260501082000_harden_vendor_profile_inquiries.sql',
  'supabase/migrations/20260501130000_add_app_action_audit_logs.sql',
  'supabase/migrations/20260503100000_harden_ai_photo_column_privileges.sql',
];

const requiredFunctionDirs = [
  'guest-hub-config',
  'guest-hub-track',
  'guest-prospect-submit',
  'guest-recap-config',
  'guestbook-submit',
  'onboarding-ai-orchestrate',
  'photo-analyze-batch',
  'photo-export-manifest',
  'photo-upload',
  'public-registry-items',
  'public-site-rsvp-submit',
  'queue-guest-followups',
  'translate-site-content',
  'vault-entry-submit',
  'validate-rsvp-token',
  'vendor-profile-inquiry-submit',
];

const requiredRestTables = [
  'wedding_sites',
  'guests',
  'site_rsvps',
  'event_rsvps',
  'registry_items',
  'itinerary_events',
  'seating_tables',
  'seating_assignments',
  'vault_entries',
  'vault_configs',
  'photo_albums',
  'photo_uploads',
  'photo_upload_ai_analysis',
  'photo_upload_metadata',
  'photo_ai_bucket_corrections',
  'guestbook_entries',
  'guest_prospect_optins',
  'email_queue',
  'site_translations',
  'internal_ai_usage_events',
  'message_deliveries',
  'public_submission_events',
  'vendor_profiles',
  'vendor_profile_inquiries',
  'app_action_audit_logs',
];

const requiredStorageBuckets = [
  'site-media',
  'builder-media',
  'photos',
  'photo-uploads',
  'wedding-media',
  'vault-attachments',
];

const requiredProofScripts = [
  {
    id: 'ai-migration-ready-command',
    filePath: 'scripts/v1-proof-ai-migration-ready.mjs',
    packageScript: 'proof:v1:ai-migration-ready',
    packageCommand: 'node scripts/v1-proof-ai-migration-ready.mjs',
    requiredMarkers: [
      'safeToApplyMigration',
      'frontend_ready_migration_pending',
      'authenticatedReadbackReady',
      'expectedPendingSensitiveFailures',
      '20260503100000_harden_ai_photo_column_privileges.sql',
    ],
  },
  {
    id: 'ai-exposure-column-contract',
    filePath: 'scripts/v1-proof-ai-exposure.mjs',
    packageScript: 'proof:v1:ai-exposure',
    packageCommand: 'node scripts/v1-proof-ai-exposure.mjs',
    requiredMarkers: [
      'grantColumns',
      'safe-column-grant-exact',
      'no-anon-column-grant',
      'laterMigrationStaticChecks',
      'no-later-broad-grant',
    ],
  },
  {
    id: 'ai-clearance-migration-readiness',
    filePath: 'scripts/v1-proof-ai-clearance.mjs',
    packageScript: 'proof:v1:ai-clearance',
    packageCommand: 'node scripts/v1-proof-ai-clearance.mjs',
    requiredMarkers: [
      'migrationReadiness',
      'safeToApplyMigration',
      'frontend_ready_migration_pending',
      'authenticatedReadbackReady',
    ],
  },
];

const requiredFunctionSourceChecks = [
  {
    id: 'photo-upload-guest-safe-readiness-and-errors',
    filePath: 'supabase/functions/photo-upload/index.ts',
    requiredMarkers: [
      'searchParams.get("readiness") === "1"',
      'function: "photo-upload"',
      'req.method !== "POST"',
      'METHOD_NOT_ALLOWED',
      'Hosted upload failed.',
      "We couldn't upload this file. Please try again.",
      "We couldn't finish this upload. Please try again.",
    ],
    forbiddenMarkers: [
      'return fail("INTERNAL_ERROR", err instanceof Error ? err.message',
      'error: error instanceof Error ? error.message',
      'if (error) throw new Error(error.message);\n\n  const { data: signed }',
    ],
  },
  {
    id: 'photo-export-manifest-safe-readiness-and-errors',
    filePath: 'supabase/functions/photo-export-manifest/index.ts',
    requiredMarkers: [
      'searchParams.get("readiness") === "1"',
      'function: "photo-export-manifest"',
      'req.method !== "POST"',
      'Could not export photo manifest. Please try again.',
    ],
    forbiddenMarkers: [
      'siteError.message',
      'collaboratorError.message',
      'uploadError.message',
      'albumError.message',
      'error instanceof Error ? error.message',
    ],
  },
  {
    id: 'guestbook-submit-safe-readiness-and-errors',
    filePath: 'supabase/functions/guestbook-submit/index.ts',
    requiredMarkers: [
      'searchParams.get("readiness") === "1"',
      'function: "guestbook-submit"',
      'req.method !== "POST"',
      'Guestbook is temporarily unavailable. Please try again.',
      'Could not submit guestbook entry. Please try again.',
    ],
    forbiddenMarkers: [
      'siteError) throw siteError',
      'if (error) throw error',
      'error instanceof Error ? error.message',
      'Supabase not configured',
    ],
  },
  {
    id: 'guest-prospect-submit-safe-readiness-and-errors',
    filePath: 'supabase/functions/guest-prospect-submit/index.ts',
    requiredMarkers: [
      'searchParams.get("readiness") === "1"',
      'function: "guest-prospect-submit"',
      'req.method !== "POST"',
      'We could not save this update. Please try again.',
      'eventError',
    ],
    forbiddenMarkers: [
      'siteError) throw siteError',
      'if (error) throw error',
      'error instanceof Error ? error.message',
      'Supabase not configured',
    ],
  },
  {
    id: 'vendor-profile-inquiry-safe-readiness-and-errors',
    filePath: 'supabase/functions/vendor-profile-inquiry-submit/index.ts',
    requiredMarkers: [
      'searchParams.get("readiness") === "1"',
      'function: "vendor-profile-inquiry-submit"',
      'req.method !== "POST"',
      'Could not send inquiry. Please try again.',
    ],
    forbiddenMarkers: [
      'profileError) throw profileError',
      'if (error) throw error',
      'error instanceof Error ? error.message',
      'Supabase not configured',
    ],
  },
  {
    id: 'vault-entry-submit-safe-readiness-and-errors',
    filePath: 'supabase/functions/vault-entry-submit/index.ts',
    requiredMarkers: [
      'searchParams.get("readiness") === "1"',
      'function: "vault-entry-submit"',
      'req.method !== "POST"',
      'Could not save this vault memory. Please try again.',
      'Could not upload this vault attachment. Please try again.',
    ],
    forbiddenMarkers: [
      'siteError.message',
      'configError.message',
      'uploadError.message }, 500',
      'insertError.message',
      'err instanceof Error ? err.message',
    ],
  },
];

const deferredProviderChecks = [
  {
    key: 'TELNYX_API_KEY',
    requiredFor: ['deferred live SMS sending'],
    note: 'Deferred until LLC, Telnyx, compliance, and sender setup are complete.',
  },
  {
    key: 'TELNYX_MESSAGING_PROFILE_ID',
    requiredFor: ['deferred live SMS sending'],
    note: 'Deferred until LLC, Telnyx, compliance, and sender setup are complete.',
  },
  {
    key: 'TELNYX_FROM_NUMBER',
    requiredFor: ['deferred live SMS sending'],
    note: 'Deferred until LLC, Telnyx, compliance, and sender setup are complete.',
  },
  {
    key: 'STRIPE_SMS_PRICE_ID_100',
    requiredFor: ['deferred SMS credit purchase proof'],
    note: 'Deferred until SMS provider and billing SKU decisions are final.',
  },
  {
    key: 'STRIPE_SMS_PRICE_ID_500',
    requiredFor: ['deferred SMS credit purchase proof'],
    note: 'Deferred until SMS provider and billing SKU decisions are final.',
  },
  {
    key: 'STRIPE_SMS_PRICE_ID_1000',
    requiredFor: ['deferred SMS credit purchase proof'],
    note: 'Deferred until SMS provider and billing SKU decisions are final.',
  },
];

function checkPlaywrightBrowser() {
  try {
    const { chromium } = require('playwright');
    const executablePath = chromium.executablePath();
    return {
      ok: existsSync(executablePath),
      detail: executablePath,
    };
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : 'Unable to verify Playwright Chromium. Run: npx playwright install chromium',
    };
  }
}

function localMigrationChecks() {
  return requiredMigrationFiles.map((filePath) => ({
    filePath,
    present: existsSync(filePath),
  }));
}

function localFunctionChecks() {
  return requiredFunctionDirs.map((name) => ({
    name,
    path: `supabase/functions/${name}/index.ts`,
    present: existsSync(`supabase/functions/${name}/index.ts`),
  }));
}

function localProofScriptChecks() {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  return requiredProofScripts.map((check) => {
    const present = existsSync(check.filePath);
    const content = present ? readFileSync(check.filePath, 'utf8') : '';
    const missingMarkers = check.requiredMarkers.filter((marker) => !content.includes(marker));
    const configuredCommand = packageJson.scripts?.[check.packageScript] ?? '';
    return {
      id: check.id,
      filePath: check.filePath,
      present,
      packageScript: check.packageScript,
      packageWired: configuredCommand === check.packageCommand,
      requiredMarkers: check.requiredMarkers,
      missingMarkers,
    };
  });
}

function localFunctionSourceChecks() {
  return requiredFunctionSourceChecks.map((check) => {
    const present = existsSync(check.filePath);
    const content = present ? readFileSync(check.filePath, 'utf8') : '';
    const missingMarkers = check.requiredMarkers.filter((marker) => !content.includes(marker));
    const presentForbiddenMarkers = check.forbiddenMarkers.filter((marker) => content.includes(marker));
    return {
      id: check.id,
      filePath: check.filePath,
      present,
      requiredMarkers: check.requiredMarkers,
      missingMarkers,
      forbiddenMarkers: check.forbiddenMarkers,
      presentForbiddenMarkers,
    };
  });
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function classifyRestStatus(status, bodyText) {
  if (status >= 200 && status < 300) return 'reachable';
  if (status === 401 || status === 403) return 'protected';
  if (status === 404 || /could not find the table|schema cache|does not exist/i.test(bodyText)) return 'missing';
  return 'unexpected';
}

function classifyFunctionStatus(status) {
  if (status >= 200 && status < 300) return 'reachable';
  if ([400, 401, 403, 405, 422].includes(status)) return 'deployed';
  if (status >= 500 && status < 600) return 'deployed_with_runtime_error';
  if (status === 404) return 'missing';
  return 'unexpected';
}

function classifyStorageStatus(status, bodyText) {
  if (status >= 200 && status < 300) return 'reachable';
  if (status === 401 || status === 403) return 'protected';
  if (status === 404 || /not found|does not exist/i.test(bodyText)) return 'missing';
  return 'unexpected';
}

async function checkRestTable(supabaseUrl, anonKey, table) {
  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
  url.searchParams.set('select', '*');
  url.searchParams.set('limit', '1');
  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Prefer: 'count=exact',
      },
    });
    const bodyText = await response.text().catch(() => '');
    const status = classifyRestStatus(response.status, bodyText);
    return {
      table,
      ok: status === 'reachable' || status === 'protected',
      status,
      httpStatus: response.status,
      detail: status === 'unexpected' || status === 'missing' ? bodyText.slice(0, 240) : undefined,
    };
  } catch (error) {
    return {
      table,
      ok: false,
      status: 'error',
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkStorageBucket(supabaseUrl, anonKey, bucket) {
  const storageKey = getEnv('SUPABASE_SERVICE_ROLE_KEY').trim() || getEnv('V1_SUPABASE_SERVICE_ROLE_KEY').trim();
  if (!storageKey) {
    return {
      bucket,
      ok: true,
      status: 'skipped_no_service_key',
      detail: 'Anon keys cannot reliably inspect private storage buckets. Runtime upload proofs cover these buckets; set SUPABASE_SERVICE_ROLE_KEY for direct bucket existence checks.',
    };
  }
  const url = new URL(`/storage/v1/bucket/${bucket}`, supabaseUrl);
  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${storageKey}`,
      },
    });
    const bodyText = await response.text().catch(() => '');
    const status = classifyStorageStatus(response.status, bodyText);
    return {
      bucket,
      ok: status === 'reachable' || status === 'protected',
      status,
      httpStatus: response.status,
      detail: status === 'unexpected' || status === 'missing' ? bodyText.slice(0, 240) : undefined,
    };
  } catch (error) {
    return {
      bucket,
      ok: false,
      status: 'error',
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkEdgeFunction(supabaseUrl, anonKey, name) {
  const url = new URL(`/functions/v1/${name}`, supabaseUrl);
  url.searchParams.set('readiness', '1');
  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });
    const status = classifyFunctionStatus(response.status);
    return {
      name,
      ok: status === 'reachable' || status === 'deployed' || status === 'deployed_with_runtime_error',
      status,
      httpStatus: response.status,
    };
  } catch (error) {
    return {
      name,
      ok: false,
      status: 'error',
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkLiveBackend(envResults) {
  const supabaseUrl = getEnv('VITE_SUPABASE_URL').trim();
  const anonKey = getEnv('VITE_SUPABASE_ANON_KEY').trim();
  const hasValidSupabaseEnv = envResults
    .filter((result) => ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].includes(result.key))
    .every((result) => result.valid);

  if (!hasValidSupabaseEnv) {
    return {
      enabled: false,
      reason: 'Valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required for live backend readiness checks.',
      restTables: [],
      storageBuckets: [],
      edgeFunctions: [],
    };
  }

  const restTables = await Promise.all(requiredRestTables.map((table) => checkRestTable(supabaseUrl, anonKey, table)));
  const storageBuckets = await Promise.all(requiredStorageBuckets.map((bucket) => checkStorageBucket(supabaseUrl, anonKey, bucket)));
  const edgeFunctions = await Promise.all(requiredFunctionDirs.map((name) => checkEdgeFunction(supabaseUrl, anonKey, name)));

  return {
    enabled: true,
    restTables,
    storageBuckets,
    edgeFunctions,
  };
}

const envResults = envChecks.map((check) => {
  const value = getEnv(check.key);
  const present = value.trim().length > 0;
  const valid = present && check.validate(value.trim());
  return {
    key: check.key,
    present,
    valid,
    optional: check.optional === true,
    requiredFor: check.requiredFor,
    hint: check.hint,
  };
});

const internalAiSecretResults = internalAiSecretChecks.map((check) => ({
  ...check,
  present: Boolean(getEnv(check.key).trim()),
}));

const deferredProviderResults = deferredProviderChecks.map((check) => ({
  ...check,
  present: Boolean(getEnv(check.key).trim()),
}));

const playwrightBrowser = checkPlaywrightBrowser();
const nodeModulesPresent = existsSync('node_modules');
const distPresent = existsSync('dist/index.html');
const migrations = localMigrationChecks();
const localFunctions = localFunctionChecks();
const proofScripts = localProofScriptChecks();
const functionSourceChecks = localFunctionSourceChecks();

const missingRequiredEnv = envResults.filter((result) => !result.optional && !result.valid);
const invalidOptionalEnv = envResults.filter((result) => result.optional && result.present && !result.valid);
const missingInternalAiSecrets = internalAiSecretResults.filter((result) => !result.present);
const missingDeferredProviderSecrets = deferredProviderResults.filter((result) => !result.present);
const missingMigrations = migrations.filter((result) => !result.present);
const missingLocalFunctions = localFunctions.filter((result) => !result.present);
const failedProofScripts = proofScripts.filter((result) => !result.present || !result.packageWired || result.missingMarkers.length > 0);
const failedFunctionSourceChecks = functionSourceChecks.filter((result) => !result.present || result.missingMarkers.length > 0 || result.presentForbiddenMarkers.length > 0);
const liveBackend = await checkLiveBackend(envResults);
const failedRestTables = liveBackend.restTables?.filter((result) => !result.ok) ?? [];
const failedStorageBuckets = liveBackend.storageBuckets?.filter((result) => !result.ok) ?? [];
const failedEdgeFunctions = liveBackend.edgeFunctions?.filter((result) => !result.ok) ?? [];
const liveEdgeFunctionRuntimeWarnings = liveBackend.edgeFunctions?.filter((result) => result.status === 'deployed_with_runtime_error') ?? [];
const aiPhotoProtectedTables = new Set([
  'photo_upload_ai_analysis',
  'photo_upload_metadata',
  'photo_ai_bucket_corrections',
  'internal_ai_usage_events',
]);
const aiPhotoColumnMigrationAppearsApplied = liveBackend.enabled === true
  && (liveBackend.restTables ?? [])
    .filter((result) => aiPhotoProtectedTables.has(result.table))
    .every((result) => result.status === 'protected');
const prereqsOk =
  missingRequiredEnv.length === 0 &&
  invalidOptionalEnv.length === 0 &&
  playwrightBrowser.ok &&
  nodeModulesPresent &&
  missingMigrations.length === 0 &&
  missingLocalFunctions.length === 0 &&
  failedProofScripts.length === 0 &&
  failedFunctionSourceChecks.length === 0 &&
  failedRestTables.length === 0 &&
  failedStorageBuckets.length === 0 &&
  failedEdgeFunctions.length === 0;

const output = {
  ok: prereqsOk,
  generatedAt: new Date().toISOString(),
  summary: {
    requiredEnvMissing: missingRequiredEnv.length,
    optionalEnvInvalid: invalidOptionalEnv.length,
    internalAiSecretsMissing: missingInternalAiSecrets.length,
    deferredProviderSecretsMissing: missingDeferredProviderSecrets.length,
    requiredMigrationsMissing: missingMigrations.length,
    requiredLocalFunctionsMissing: missingLocalFunctions.length,
    requiredProofScriptsFailing: failedProofScripts.length,
    requiredFunctionSourceChecksFailing: failedFunctionSourceChecks.length,
    liveRestTableFailures: failedRestTables.length,
    liveStorageBucketFailures: failedStorageBuckets.length,
    liveEdgeFunctionFailures: failedEdgeFunctions.length,
    liveEdgeFunctionRuntimeWarnings: liveEdgeFunctionRuntimeWarnings.length,
    nodeModulesPresent,
    distPresent,
    playwrightChromiumReady: playwrightBrowser.ok,
    loadedEnvFiles: envFiles.filter((filePath) => existsSync(filePath)),
  },
  contractSummary: prereqsOk
    ? 'Prereqs proof is green: this readiness lane confirms the local/live foundations for later proof bundles without acting like a shipped-feature or launch-truth artifact source.'
    : 'Prereqs proof is not green: fix missing local/live readiness foundations before leaning on downstream proof bundles.',
  localProofReadiness: {
    nodeModulesPresent,
    distPresent,
    playwrightBrowser,
  },
  env: envResults,
  internalAiSecrets: internalAiSecretResults,
  deferredProviderSecrets: deferredProviderResults,
  backendReadiness: {
    migrations,
    localFunctions,
    proofScripts,
    functionSourceChecks,
    liveBackend,
  },
  nextSteps: [
    ...(!nodeModulesPresent ? ['Run npm ci before proof commands.'] : []),
    ...(!playwrightBrowser.ok ? ['Run npx playwright install chromium before browser proof commands.'] : []),
    ...(missingRequiredEnv.length > 0 ? ['Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for Supabase-backed proof gates.'] : []),
    ...(missingInternalAiSecrets.length > 0 ? ['Set OPENAI_API_KEY in Supabase/Vercel server-side environments before AI proof.'] : []),
    ...(missingMigrations.length > 0 ? ['Restore or add missing required Supabase migration files before claiming backend readiness.'] : []),
    ...(missingLocalFunctions.length > 0 ? ['Restore or add missing required Supabase Edge Function directories before claiming backend readiness.'] : []),
    ...(failedProofScripts.length > 0 ? ['Repair AI migration/exposure proof script wiring before claiming backend readiness.'] : []),
    ...(failedFunctionSourceChecks.length > 0 ? ['Repair launch-critical Edge Function source hardening before claiming backend readiness.'] : []),
    ...(failedProofScripts.length === 0 && !aiPhotoColumnMigrationAppearsApplied ? ['Before applying the live AI/photo column migration, run PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-migration-ready and require safeToApplyMigration: true with state: frontend_ready_migration_pending.'] : []),
    ...(failedProofScripts.length === 0 && aiPhotoColumnMigrationAppearsApplied ? ['AI/photo live REST table protection is visible in prereqs; keep V1_AI_CLEARANCE_LIVE=1 PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:ai-clearance green after future deploys or schema changes.'] : []),
    ...(failedRestTables.length > 0 ? [`Fix missing/unreachable required Supabase tables: ${failedRestTables.map((item) => item.table).join(', ')}.`] : []),
    ...(failedStorageBuckets.length > 0 ? [`Fix missing/unreachable storage buckets: ${failedStorageBuckets.map((item) => item.bucket).join(', ')}.`] : []),
    ...(failedEdgeFunctions.length > 0 ? [`Deploy or repair required Edge Functions: ${failedEdgeFunctions.map((item) => item.name).join(', ')}.`] : []),
    ...(liveEdgeFunctionRuntimeWarnings.length > 0 ? [`Review live Edge Function readiness warnings before launch-clear: ${liveEdgeFunctionRuntimeWarnings.map((item) => item.name).join(', ')} returned runtime-error readiness responses.`] : []),
    ...(missingDeferredProviderSecrets.length > 0 ? ['Deferred SMS/Telnyx/SMS-credit secrets remain intentionally outside this proof gate until provider setup is ready.'] : []),
    ...(!distPresent ? ['Run npm run build before preview/server-based browser proof, or let the proof script build first.'] : []),
  ],
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
