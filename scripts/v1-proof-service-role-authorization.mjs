#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const envFiles = ['.env', '.env.local', '.env.production', '.env.production.local', '.vercel/.env.production.local'];

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const parsed = {};
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
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
  if (runtimeValue && runtimeValue.trim()) return runtimeValue;
  return fileEnv[key] ?? '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL').trim();
const anonKey = getEnv('VITE_SUPABASE_ANON_KEY').trim();
const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY').trim() || getEnv('V1_SUPABASE_SERVICE_ROLE_KEY').trim();

function blocked(reason) {
  console.log(JSON.stringify({
    ok: false,
    blocked: true,
    generatedAt: new Date().toISOString(),
    mode: 'blocked_missing_supabase_env',
    reason,
    stillRequired: [
      'Authenticated owner/planner/coordinator/viewer live mutation proof with disposable proof accounts.',
      'Secure service-role storage and cross-table integrity proof in an environment that can hold SUPABASE_SERVICE_ROLE_KEY.',
    ],
  }, null, 2));
}

if (!/^https:\/\/.+\.supabase\.co$/.test(supabaseUrl)) {
  blocked('Set VITE_SUPABASE_URL to a Supabase project URL.');
  process.exit(0);
}

const functionsBaseUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1`;
const internalErrorPattern = /\b(service\s*role|supabase|postgres|postgrest|database|schema|relation|table|column|policy|rls|jwt|bearer|token|secret|storage|bucket|provider|openai|gemini|sql|function|functions?\/v1)\b/i;
const allowedDenialCopy = /^(Missing authorization|Unauthorized|Forbidden|Authentication required|Sign in required)$/i;

function isPublicSafeDenialCopy(value) {
  if (value == null || value === '') return true;
  const message = String(value).replace(/\s+/g, ' ').trim();
  if (!message) return true;
  if (allowedDenialCopy.test(message)) return true;
  return !internalErrorPattern.test(message);
}

const proofCases = [
  {
    functionName: 'photo-album-create',
    description: 'photo album creation rejects missing authenticated user bearer before service-role writes',
    payload: {
      siteId: '00000000-0000-0000-0000-000000000000',
      name: 'Proof Album',
    },
    expectedStatuses: [401],
  },
  {
    functionName: 'photo-album-manage',
    description: 'photo album mutation rejects missing authenticated user bearer before service-role updates',
    payload: {
      albumId: '00000000-0000-0000-0000-000000000000',
      action: 'set_active',
      isActive: false,
    },
    expectedStatuses: [401],
  },
  {
    functionName: 'photo-upload-moderate',
    description: 'photo moderation rejects missing authenticated user bearer before service-role media updates',
    payload: {
      uploadIds: ['00000000-0000-0000-0000-000000000000'],
      patch: { status: 'hidden' },
    },
    expectedStatuses: [401],
  },
  {
    functionName: 'photo-export-manifest',
    description: 'photo export manifest rejects missing authenticated user bearer before storage read/signing work',
    payload: {
      siteId: '00000000-0000-0000-0000-000000000000',
      includeHidden: false,
    },
    expectedStatuses: [401],
  },
  {
    functionName: 'photo-analyze-batch',
    description: 'photo AI analysis rejects missing authenticated user bearer before service-role analysis writes',
    payload: {
      siteId: '00000000-0000-0000-0000-000000000000',
      limit: 1,
      mode: 'auto',
    },
    expectedStatuses: [401],
  },
];

async function postWithoutAuthorization(proofCase) {
  const headers = { 'Content-Type': 'application/json' };
  if (anonKey) headers.apikey = anonKey;

  const response = await fetch(`${functionsBaseUrl}/${proofCase.functionName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(proofCase.payload),
    signal: AbortSignal.timeout(15_000),
  });
  const bodyText = await response.text();
  let body = null;
  try {
    body = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    body = { bodyPreview: bodyText.slice(0, 160) };
  }

  return {
    functionName: proofCase.functionName,
    description: proofCase.description,
    status: response.status,
    expectedStatuses: proofCase.expectedStatuses,
    ok: proofCase.expectedStatuses.includes(response.status),
    safeError: body && typeof body === 'object' ? body.error ?? body.message ?? null : null,
  };
}

const results = [];
for (const proofCase of proofCases) {
  try {
    results.push(await postWithoutAuthorization(proofCase));
  } catch (error) {
    results.push({
      functionName: proofCase.functionName,
      description: proofCase.description,
      expectedStatuses: proofCase.expectedStatuses,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

const secureServiceRoleResult = serviceRoleKey
  ? {
      id: 'secure-service-role-storage-proof',
      label: 'Secure service-role queue/storage proof',
      ok: false,
      blocked: true,
      blockerType: 'follow_up_required',
      message: 'Run npm run proof:v1:launch-closeout to complete secure service-role and queue-processing proof plus the launch-board freshness check and raw/markdown board refresh.',
    }
  : {
      id: 'secure-service-role-storage-proof',
      label: 'Secure service-role queue/storage proof',
      ok: false,
      blocked: true,
      blockerType: 'missing_service_role_key',
      message: 'Set SUPABASE_SERVICE_ROLE_KEY to run secure service-role queue/storage proof.',
    };

results.push(secureServiceRoleResult);

const ok = results.every((result) => result.ok || result.blocked);
const unsafeDenialCopy = results.filter((result) => !isPublicSafeDenialCopy(result.safeError));
const blockers = results.filter((result) => result.blocked);

console.log(JSON.stringify({
  ok: ok && unsafeDenialCopy.length === 0,
  generatedAt: new Date().toISOString(),
  mode: 'service_role_media_unauthenticated_live_denial',
  supabaseProjectHost: new URL(supabaseUrl).host,
  results,
  blockers,
  unsafeDenialCopy,
  stillRequired: [
    'Authenticated owner/planner/coordinator/viewer live mutation proof with disposable proof accounts.',
    ...(serviceRoleKey ? [] : ['Secure service-role storage and cross-table integrity proof in an environment that can hold SUPABASE_SERVICE_ROLE_KEY.']),
    ...(serviceRoleKey ? [] : ['Secure service-role queue-processing proof in an environment that can hold SUPABASE_SERVICE_ROLE_KEY.']),
  ],
}, null, 2));

process.exit(ok && unsafeDenialCopy.length === 0 ? 0 : 1);
