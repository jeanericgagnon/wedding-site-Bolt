#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const envFiles = ['.env', '.env.local', '.env.production', '.env.production.local', '.vercel/.env.production.local'];
const liveEnabled = process.env.V1_AI_ROLLOUT_LIVE === '1';
const liveBaseUrl = process.env.V1_AI_ROLLOUT_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'https://dayof.love';

const sensitiveTables = [
  {
    table: 'photo_upload_ai_analysis',
    blockedColumns: ['provider', 'model', 'raw_result'],
    expectedSafeColumns: ['upload_id', 'status', 'detected_moment', 'suggested_bucket_name', 'bucket_confidence', 'quality_score', 'caption', 'tags'],
  },
  {
    table: 'photo_upload_metadata',
    blockedColumns: ['raw_exif', 'gps_lat', 'gps_lng', 'gps_altitude'],
    expectedSafeColumns: ['upload_id', 'has_exif', 'has_gps', 'file_sha256', 'perceptual_hash', 'location_label'],
  },
  {
    table: 'photo_ai_bucket_corrections',
    blockedColumns: ['metadata'],
    expectedSafeColumns: ['id', 'upload_id', 'action', 'previous_bucket_id', 'suggested_bucket_id', 'chosen_bucket_id', 'confidence', 'reason', 'created_at'],
  },
  {
    table: 'internal_ai_usage_events',
    blockedColumns: ['provider', 'model', 'input_tokens', 'cached_input_tokens', 'output_tokens', 'total_tokens', 'estimated_cost_usd', 'raw_usage'],
    expectedSafeColumns: [],
    mustNotBeReadByBrowser: true,
  },
];

const browserSourceFiles = [
  { filePath: 'src/pages/dashboard/GuestPhotoSharing.tsx', requireProductReads: true },
  { filePath: 'src/pages/dashboard/guestPhotoSharingService.ts' },
  { filePath: 'tests/e2e/photo-upload-write-read.spec.ts' },
  { filePath: 'supabase/functions/guest-recap-config/index.ts' },
];

function readSource(filePath) {
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
}

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

function builtGuestPhotoSharingFiles() {
  const assetsDir = path.join('dist', 'assets');
  if (!existsSync(assetsDir)) return [];
  return readdirSync(assetsDir)
    .filter((fileName) => /^GuestPhotoSharing-.*\.js$/.test(fileName))
    .map((fileName) => path.join(assetsDir, fileName));
}

function extractSelectListsForTable(source, tableName) {
  const tablePattern = String.raw`\.from\((['"])${tableName}\1\)[\s\S]{0,900}?\.select\(([^)]*)\)`;
  return Array.from(source.matchAll(new RegExp(tablePattern, 'g')), (match) => resolveSelectArgument(source, match[2]));
}

function resolveSelectArgument(source, rawArgument) {
  const argument = rawArgument.trim();
  const quoted = argument.match(/^(['"`])([\s\S]*?)\1/);
  if (quoted) return quoted[2];

  const identifier = argument.match(/^([A-Za-z_$][\w$]*)/);
  if (!identifier) return argument;

  const constPattern = String.raw`const\s+${identifier[1]}\s*=\s*(['"\`])([\s\S]*?)\1`;
  const match = source.match(new RegExp(constPattern));
  return match?.[2] ?? argument;
}

function normalizeSelectList(selectList) {
  return selectList
    .replace(/\\n/g, '\n')
    .split(',')
    .map((column) => column.trim().replace(/^['"`]+|['"`]+$/g, ''))
    .map((column) => column.split(':').pop()?.trim() ?? column)
    .filter(Boolean);
}

function hasColumn(selectList, columnName) {
  return normalizeSelectList(selectList).some((column) => column === columnName || column.startsWith(`${columnName}.`));
}

function checkSelectLists(filePath, source, options = {}) {
  const checks = [];
  for (const item of sensitiveTables) {
    const selectLists = extractSelectListsForTable(source, item.table);
    const shouldRequireProductRead = options.requireProductReads && !item.mustNotBeReadByBrowser;
    checks.push({
      ok: item.mustNotBeReadByBrowser ? selectLists.length === 0 : !shouldRequireProductRead || selectLists.length > 0,
      id: `${filePath}:${item.table}:select-presence`,
      detail: item.mustNotBeReadByBrowser
        ? `${filePath} must not read ${item.table} from a browser/client proof path.`
        : `${filePath} should read only safe product columns from ${item.table} so the migration can be applied after deploy.`,
      selectLists,
    });

    for (const selectList of selectLists) {
      for (const column of item.blockedColumns) {
        checks.push({
          ok: !hasColumn(selectList, column),
          id: `${filePath}:${item.table}:${column}:not-selected`,
          detail: `${filePath} still selects ${item.table}.${column}; deploy the safe frontend before applying the AI/photo column migration.`,
          selectList,
        });
      }

      for (const column of shouldRequireProductRead ? item.expectedSafeColumns : []) {
        checks.push({
          ok: hasColumn(selectList, column),
          id: `${filePath}:${item.table}:${column}:safe-column-present`,
          detail: `${filePath} should keep ${item.table}.${column} readable for the owner product flow after the migration.`,
          selectList,
        });
      }
    }
  }
  return checks;
}

function sourceChecks() {
  const checks = [];
  for (const sourceFile of browserSourceFiles) {
    const filePath = sourceFile.filePath;
    const source = readSource(filePath);
    checks.push({
      ok: Boolean(source),
      id: `${filePath}:present`,
      detail: `${filePath} is required for AI/photo rollout proof.`,
    });
    if (source) checks.push(...checkSelectLists(filePath, source, sourceFile));
  }
  return checks;
}

function builtBundleChecks() {
  const files = builtGuestPhotoSharingFiles();
  if (files.length === 0) {
    return [
      {
        ok: true,
        id: 'dist:guest-photo-sharing-build-optional',
        detail: 'Run npm run build before deploy to include built bundle checks; deploy_prod_guarded runs this proof before verify and npm run verify builds after.',
        note: 'No dist GuestPhotoSharing chunk was present for optional built-bundle inspection.',
      },
    ];
  }

  return files.flatMap((filePath) => checkSelectLists(filePath, readSource(filePath)));
}

function extractAssetUrls(source, baseUrl) {
  const urls = new Set();
  for (const match of source.matchAll(/(?:src=|href=)?["']([^"']*\/assets\/[^"']+\.js)["']/g)) {
    urls.add(new URL(match[1], baseUrl).toString());
  }
  for (const match of source.matchAll(/(?:^|[^A-Za-z0-9_/-])(assets\/[A-Za-z0-9._/-]+\.js)/g)) {
    urls.add(new URL(`/${match[1]}`, baseUrl).toString());
  }
  return [...urls];
}

async function fetchText(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    const text = await response.text().catch(() => '');
    return { ok: response.ok, status: response.status, text };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      text: '',
      error: error instanceof Error ? error.message : 'fetch failed',
    };
  }
}

async function remoteBundleChecks() {
  const checks = [];
  if (!liveEnabled) {
    return {
      enabled: false,
      baseUrl: liveBaseUrl,
      assetsChecked: 0,
      sourcesWithAiPhotoTables: [],
      checks: [
        {
          ok: true,
          id: 'remote:optional',
          detail: 'Set V1_AI_ROLLOUT_LIVE=1 to inspect deployed production assets for AI/photo migration compatibility.',
        },
      ],
    };
  }

  let normalizedBaseUrl;
  try {
    normalizedBaseUrl = new URL(liveBaseUrl).toString();
  } catch {
    return {
      enabled: true,
      baseUrl: liveBaseUrl,
      assetsChecked: 0,
      sourcesWithAiPhotoTables: [],
      checks: [{ ok: false, id: 'remote:base-url-valid', detail: `Invalid V1_AI_ROLLOUT_BASE_URL/PLAYWRIGHT_BASE_URL: ${liveBaseUrl}` }],
    };
  }

  const root = await fetchText(normalizedBaseUrl);
  checks.push({
    ok: root.ok,
    id: 'remote:index-fetch',
    detail: `Expected deployed app HTML to be reachable at ${normalizedBaseUrl}.`,
    httpStatus: root.status,
    error: root.error,
  });
  if (!root.ok) {
    return { enabled: true, baseUrl: normalizedBaseUrl, assetsChecked: 0, sourcesWithAiPhotoTables: [], checks };
  }

  const queue = extractAssetUrls(root.text, normalizedBaseUrl);
  const seen = new Set();
  const sourcesWithAiPhotoTables = [];

  while (queue.length > 0 && seen.size < 250) {
    const assetUrl = queue.shift();
    if (!assetUrl || seen.has(assetUrl)) continue;
    seen.add(assetUrl);

    const asset = await fetchText(assetUrl);
    checks.push({
      ok: asset.ok,
      id: `remote:${assetUrl}:fetch`,
      detail: `Expected deployed JS asset to be reachable.`,
      httpStatus: asset.status,
      error: asset.error,
    });
    if (!asset.ok) continue;

    for (const nextAssetUrl of extractAssetUrls(asset.text, normalizedBaseUrl)) {
      if (!seen.has(nextAssetUrl)) queue.push(nextAssetUrl);
    }

    if (sensitiveTables.some((item) => asset.text.includes(item.table))) {
      sourcesWithAiPhotoTables.push(assetUrl);
      checks.push(...checkSelectLists(`remote:${assetUrl}`, asset.text));
    }
  }

  checks.push({
    ok: seen.size > 0,
    id: 'remote:js-assets-found',
    detail: 'Expected to discover deployed JavaScript assets from the app shell.',
    assetsChecked: seen.size,
  });
  checks.push({
    ok: sourcesWithAiPhotoTables.length > 0,
    id: 'remote:ai-photo-bundle-found',
    detail: 'Expected at least one deployed JavaScript asset to contain AI/photo table references for rollout inspection.',
    sourcesWithAiPhotoTables,
  });

  return {
    enabled: true,
    baseUrl: normalizedBaseUrl,
    assetsChecked: seen.size,
    sourcesWithAiPhotoTables,
    checks,
  };
}

const remote = await remoteBundleChecks();
const checks = [...sourceChecks(), ...builtBundleChecks(), ...remote.checks];
const failures = checks.filter((check) => !check.ok);

const output = {
  ok: failures.length === 0,
  generatedAt: new Date().toISOString(),
  purpose: 'Proves the local frontend/proof paths are ready for the AI/photo column-privilege migration rollout.',
  migrationOrder: [
    'Deploy frontend code that no longer selects AI/photo sensitive columns from browser/client paths.',
    'Apply supabase/migrations/20260503100000_harden_ai_photo_column_privileges.sql in the target Supabase environment.',
    'Run V1_AI_EXPOSURE_LIVE=1 npm run proof:v1:ai-exposure and the photo upload analysis proof before launch-clear.',
  ],
  checked: checks.length,
  remote: {
    enabled: remote.enabled,
    baseUrl: remote.baseUrl,
    assetsChecked: remote.assetsChecked,
    sourcesWithAiPhotoTables: remote.sourcesWithAiPhotoTables,
  },
  failures,
  nextSteps: failures.length > 0
    ? ['Fix the browser/client select list before deploying or applying the AI/photo column-privilege migration.']
    : [
        liveEnabled
          ? 'Deployed frontend rollout proof is green. The DB migration still needs explicit approval plus live exposure readback after it is applied.'
          : 'Frontend rollout proof is green. Run with V1_AI_ROLLOUT_LIVE=1 against production before applying the live DB migration.',
      ],
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
