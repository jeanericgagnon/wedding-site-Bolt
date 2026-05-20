#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from 'node:fs';

const envFiles = ['.env', '.env.local', '.env.production', '.env.production.local', '.vercel/.env.production.local'];

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const parsed = {};
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed[key] = value.replace(/\\n$/, '').trim();
  }
  return parsed;
}

const fileEnv = envFiles.reduce((merged, filePath) => ({ ...merged, ...parseEnvFile(filePath) }), {});
const getEnv = (key) => {
  const runtimeValue = process.env[key];
  if (runtimeValue && runtimeValue.trim()) return runtimeValue.trim();
  return (fileEnv[key] ?? '').trim();
};

const migrationPath = 'supabase/migrations/20260503100000_harden_ai_photo_column_privileges.sql';
const migrationDir = 'supabase/migrations';
const aiSecurityTestPath = 'src/lib/aiProviderKeySecurity.test.ts';
const photoProofPath = 'tests/e2e/photo-upload-write-read.spec.ts';

const sensitiveColumnChecks = [
  {
    table: 'photo_upload_ai_analysis',
    blockedColumns: ['provider', 'model', 'raw_result'],
    safeColumns: ['upload_id', 'status', 'detected_moment', 'suggested_bucket_name', 'bucket_confidence', 'quality_score', 'caption', 'tags'],
    grantColumns: [
      'id',
      'upload_id',
      'wedding_site_id',
      'photo_album_id',
      'status',
      'source_hash',
      'detected_moment',
      'suggested_bucket_id',
      'suggested_bucket_name',
      'bucket_confidence',
      'quality_score',
      'blur_score',
      'people_count_range',
      'is_video',
      'slideshow_priority',
      'caption',
      'tags',
      'warnings',
      'error_message',
      'analyzed_at',
      'created_at',
      'updated_at',
    ],
  },
  {
    table: 'photo_upload_metadata',
    blockedColumns: ['raw_exif', 'gps_lat', 'gps_lng', 'gps_altitude'],
    safeColumns: ['upload_id', 'has_exif', 'has_gps', 'file_sha256', 'perceptual_hash', 'location_label'],
    grantColumns: [
      'id',
      'upload_id',
      'wedding_site_id',
      'photo_album_id',
      'file_sha256',
      'perceptual_hash',
      'width',
      'height',
      'orientation',
      'taken_at',
      'camera_make',
      'camera_model',
      'location_precision',
      'location_label',
      'event_match_id',
      'event_match_confidence',
      'event_match_reason',
      'metadata_source',
      'has_exif',
      'has_gps',
      'created_at',
      'updated_at',
    ],
  },
  {
    table: 'photo_ai_bucket_corrections',
    blockedColumns: ['metadata'],
    safeColumns: ['id', 'upload_id', 'action', 'previous_bucket_id', 'suggested_bucket_id', 'chosen_bucket_id', 'confidence', 'reason', 'created_at'],
    grantColumns: [
      'id',
      'wedding_site_id',
      'upload_id',
      'previous_bucket_id',
      'suggested_bucket_id',
      'chosen_bucket_id',
      'action',
      'confidence',
      'reason',
      'created_at',
    ],
  },
  {
    table: 'internal_ai_usage_events',
    blockedColumns: ['provider', 'model', 'input_tokens', 'cached_input_tokens', 'output_tokens', 'total_tokens', 'estimated_cost_usd', 'raw_usage'],
    safeColumns: [],
    tableMustStayBlocked: true,
  },
];

function readSource(filePath) {
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
}

function extractGrantColumns(source, table, role) {
  const grantMatch = source.match(new RegExp(String.raw`GRANT SELECT \(\s*([^)]+?)\s*\) ON public\.${table} TO ${role}`, 'i'));
  if (!grantMatch) return null;
  return grantMatch[1]
    .split(',')
    .map((column) => column.trim().replace(/--.*$/g, '').trim())
    .filter(Boolean);
}

function sameColumns(actualColumns, expectedColumns) {
  if (!Array.isArray(actualColumns)) return false;
  if (actualColumns.length !== expectedColumns.length) return false;
  return actualColumns.every((column, index) => column === expectedColumns[index]);
}

function laterMigrationFiles() {
  if (!existsSync(migrationDir)) return [];
  const migrationName = migrationPath.split('/').pop();
  return readdirSync(migrationDir)
    .filter((fileName) => fileName.endsWith('.sql') && fileName > migrationName)
    .map((fileName) => `${migrationDir}/${fileName}`);
}

function laterMigrationStaticChecks() {
  const checks = [];
  const files = laterMigrationFiles();
  checks.push({
    ok: true,
    id: 'later-migrations-scanned',
    detail: `Scanned ${files.length} later migrations for broad AI/photo SELECT grants.`,
    files,
  });

  for (const filePath of files) {
    const source = readSource(filePath);
    for (const item of sensitiveColumnChecks) {
      checks.push({
        ok: !new RegExp(String.raw`GRANT\s+(SELECT|ALL(?:\s+PRIVILEGES)?)\s+ON\s+public\.${item.table}\s+TO\s+(anon|authenticated)`, 'i').test(source),
        id: `${filePath}:${item.table}:no-later-broad-grant`,
        detail: `Later migration must not broadly grant ${item.table} to anon/authenticated.`,
      });

      checks.push({
        ok: !/GRANT\s+(SELECT|ALL(?:\s+PRIVILEGES)?)\s+ON\s+ALL\s+TABLES\s+IN\s+SCHEMA\s+public\s+TO\s+(anon|authenticated)/i.test(source),
        id: `${filePath}:no-later-public-schema-select-grant`,
        detail: 'Later migration must not grant SELECT/ALL on all public tables to anon/authenticated.',
      });

      for (const column of item.blockedColumns) {
        checks.push({
          ok: !new RegExp(String.raw`GRANT\s+SELECT\s+\([\s\S]*\b${column}\b[\s\S]*\)\s+ON\s+public\.${item.table}\s+TO\s+(anon|authenticated)`, 'i').test(source),
          id: `${filePath}:${item.table}:${column}:no-later-sensitive-column-grant`,
          detail: `Later migration must not grant sensitive column ${column} on ${item.table} to browser roles.`,
        });
      }
    }
  }

  return checks;
}

function migrationStaticChecks() {
  const source = readSource(migrationPath);
  if (!source) {
    return [{ ok: false, id: 'migration-present', detail: `${migrationPath} is missing.` }];
  }

  const checks = [];
  for (const item of sensitiveColumnChecks) {
    checks.push({
      ok: new RegExp(String.raw`REVOKE SELECT ON public\.${item.table} FROM anon, authenticated`, 'i').test(source),
      id: `${item.table}:revoke-select`,
      detail: `Expected SELECT revoke for anon/authenticated on ${item.table}.`,
    });

    if (!item.tableMustStayBlocked) {
      const authenticatedGrantColumns = extractGrantColumns(source, item.table, 'authenticated');
      checks.push({
        ok: sameColumns(authenticatedGrantColumns, item.grantColumns),
        id: `${item.table}:safe-column-grant-exact`,
        detail: `Expected authenticated SELECT grant for ${item.table} to match the browser-safe proof contract exactly.`,
        expectedColumns: item.grantColumns,
        actualColumns: authenticatedGrantColumns,
      });

      checks.push({
        ok: extractGrantColumns(source, item.table, 'anon') === null,
        id: `${item.table}:no-anon-column-grant`,
        detail: `Expected no anon SELECT column grant for ${item.table}.`,
      });
    }

    for (const column of item.blockedColumns) {
      checks.push({
        ok: !new RegExp(String.raw`GRANT SELECT \([\s\S]*\b${column}\b[\s\S]*\) ON public\.${item.table}`, 'i').test(source),
        id: `${item.table}:${column}:not-granted`,
        detail: `${column} must not be in browser-role SELECT grants for ${item.table}.`,
      });
    }
  }

  return checks;
}

function sourceStaticChecks() {
  const aiSecurityTest = readSource(aiSecurityTestPath);
  const photoProof = readSource(photoProofPath);

  const checks = [
    {
      ok: /sensitiveAiPhotoColumns/.test(aiSecurityTest) && /photo_upload_ai_analysis/.test(aiSecurityTest),
      id: 'ai-security-test-covers-ai-photo-columns',
      detail: `${aiSecurityTestPath} should guard sensitive AI/photo client-readable columns.`,
    },
    {
      ok: /photo_upload_ai_analysis/.test(photoProof) && !/select:\s*['"][^'"]*\bprovider\b/.test(photoProof) && !/select:\s*['"][^'"]*\bmodel\b/.test(photoProof),
      id: 'photo-proof-does-not-select-provider-model',
      detail: `${photoProofPath} should prove product analysis output without selecting provider/model fields.`,
    },
  ];

  return checks;
}

function restUrl(table, params = {}) {
  const supabaseUrl = getEnv('VITE_SUPABASE_URL');
  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url;
}

function classifySensitiveRead(response, bodyText) {
  if (response.status >= 200 && response.status < 300) return 'readable';
  if ([400, 401, 403, 406].includes(response.status)) {
    if (/permission denied|not authorized|not allowed|insufficient|invalid api key|jwt|rls|row-level|column|schema cache|does not exist|could not find/i.test(bodyText)) {
      return 'blocked';
    }
    return 'blocked';
  }
  if (response.status === 404) return 'missing';
  return 'unexpected';
}

async function restSelect(table, select, bearer) {
  const anonKey = getEnv('VITE_SUPABASE_ANON_KEY');
  const response = await fetch(restUrl(table, { select, limit: '1' }), {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${bearer || anonKey}`,
    },
    signal: AbortSignal.timeout(15_000),
  });
  const bodyText = await response.text().catch(() => '');
  return {
    httpStatus: response.status,
    classification: classifySensitiveRead(response, bodyText),
  };
}

async function signInOwnerIfConfigured() {
  const email = getEnv('V1_OWNER_EMAIL');
  const password = getEnv('V1_OWNER_PASSWORD');
  const supabaseUrl = getEnv('VITE_SUPABASE_URL');
  const anonKey = getEnv('VITE_SUPABASE_ANON_KEY');
  if (!email || !password || !supabaseUrl || !anonKey) {
    return { enabled: false, reason: 'Set V1_OWNER_EMAIL and V1_OWNER_PASSWORD for authenticated live column readback.' };
  }

  const url = new URL('/auth/v1/token', supabaseUrl);
  url.searchParams.set('grant_type', 'password');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => ({}));
  const accessToken = typeof payload.access_token === 'string' ? payload.access_token : '';
  return {
    enabled: response.ok && Boolean(accessToken),
    token: accessToken,
    reason: response.ok ? undefined : `Owner proof sign-in failed with status ${response.status}.`,
  };
}

async function liveExposureChecks() {
  const supabaseUrl = getEnv('VITE_SUPABASE_URL');
  const anonKey = getEnv('VITE_SUPABASE_ANON_KEY');
  if (!/^https:\/\/.+\.supabase\.co$/.test(supabaseUrl) || !anonKey) {
    return {
      enabled: false,
      reason: 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for live AI exposure proof.',
      checks: [],
    };
  }

  const ownerAuth = await signInOwnerIfConfigured();
  const principals = [
    { id: 'anon', bearer: anonKey },
    ...(ownerAuth.enabled ? [{ id: 'authenticated_owner', bearer: ownerAuth.token }] : []),
  ];

  const checks = [];
  for (const principal of principals) {
    for (const item of sensitiveColumnChecks) {
      const blockedSelect = item.blockedColumns.join(',');
      const blockedResult = await restSelect(item.table, blockedSelect, principal.bearer);
      checks.push({
        ok: blockedResult.classification === 'blocked',
        principal: principal.id,
        table: item.table,
        selectKind: 'sensitive',
        columns: item.blockedColumns,
        httpStatus: blockedResult.httpStatus,
        classification: blockedResult.classification,
      });

      if (principal.id === 'authenticated_owner' && item.safeColumns.length > 0) {
        const safeResult = await restSelect(item.table, item.safeColumns.join(','), principal.bearer);
        checks.push({
          ok: safeResult.classification === 'readable' || safeResult.classification === 'blocked',
          principal: principal.id,
          table: item.table,
          selectKind: 'safe-product',
          columns: item.safeColumns,
          httpStatus: safeResult.httpStatus,
          classification: safeResult.classification,
          note: safeResult.classification === 'blocked' ? 'Safe product columns can still be blocked by RLS if the proof account has no site rows.' : undefined,
        });
      }
    }
  }

  return {
    enabled: true,
    ownerAuth: { enabled: ownerAuth.enabled, reason: ownerAuth.reason },
    checks,
  };
}

const staticChecks = [...migrationStaticChecks(), ...laterMigrationStaticChecks(), ...sourceStaticChecks()];
const liveEnabled = getEnv('V1_AI_EXPOSURE_LIVE') === '1';
const liveStrict = getEnv('V1_AI_EXPOSURE_LIVE_STRICT') === '1';
const live = liveEnabled ? await liveExposureChecks() : { enabled: false, reason: 'Set V1_AI_EXPOSURE_LIVE=1 for live Supabase column readback.', checks: [] };

const failedStaticChecks = staticChecks.filter((check) => !check.ok);
const failedLiveChecks = live.checks.filter((check) => !check.ok);
const strictLiveBlocked = liveStrict && (!live.enabled || failedLiveChecks.length > 0 || live.ownerAuth?.enabled !== true);

const output = {
  ok: failedStaticChecks.length === 0 && failedLiveChecks.length === 0 && !strictLiveBlocked,
  generatedAt: new Date().toISOString(),
  mode: liveEnabled ? 'static_and_live' : 'static_only',
  contractSummary: liveEnabled
    ? 'AI exposure proof is green in static+live mode: this privacy lane closes source/readback evidence that sensitive AI/photo fields are no longer browser-readable on the hardened surface.'
    : 'AI exposure proof is green in static-only mode, but it still needs the live readback rerun before AI/privacy launch truth is fully closed.',
  static: {
    ok: failedStaticChecks.length === 0,
    checked: staticChecks.length,
    failures: failedStaticChecks,
  },
  live: {
    enabled: live.enabled,
    strict: liveStrict,
    reason: live.reason,
    ownerAuth: live.ownerAuth,
    checked: live.checks.length,
    failures: failedLiveChecks,
    checks: live.checks,
  },
  nextSteps: [
    ...(liveEnabled ? [] : ['Run with V1_AI_EXPOSURE_LIVE=1 after applying the migration to prove live Supabase column behavior.']),
    ...(liveStrict && live.ownerAuth?.enabled !== true ? ['Set V1_OWNER_EMAIL and V1_OWNER_PASSWORD for strict authenticated readback.'] : []),
    ...(failedLiveChecks.length > 0 ? ['Apply or repair the AI/photo column-privilege migration before launch-clear.'] : []),
  ],
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
