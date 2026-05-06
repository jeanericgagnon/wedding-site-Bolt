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

function blocked(reason) {
  console.log(JSON.stringify({
    ok: false,
    blocked: true,
    generatedAt: new Date().toISOString(),
    mode: 'blocked_missing_supabase_env',
    reason,
    stillRequired: [
      'Owner/planner/coordinator/viewer live messaging mutation proof with disposable proof accounts.',
      'Secure service-role queue-processing proof in an environment that can hold SUPABASE_SERVICE_ROLE_KEY.',
    ],
  }, null, 2));
}

if (!/^https:\/\/.+\.supabase\.co$/.test(supabaseUrl)) {
  blocked('Set VITE_SUPABASE_URL to a Supabase project URL.');
  process.exit(0);
}

const functionsBaseUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1`;

const proofCases = [
  {
    functionName: 'process-email-queue',
    description: 'queue processing rejects missing service-role bearer before privileged queue reads',
    payload: {},
    expectedStatuses: [401],
  },
  {
    functionName: 'queue-guest-followups',
    description: 'guest follow-up queueing rejects missing authenticated user bearer before site writes',
    payload: {
      siteId: '00000000-0000-0000-0000-000000000000',
      kind: 'recap',
      limit: 1,
    },
    expectedStatuses: [401],
  },
  {
    functionName: 'send-bulk-message',
    description: 'bulk/scheduled message sending rejects missing authenticated user bearer before message delivery',
    payload: {
      messageId: '00000000-0000-0000-0000-000000000000',
    },
    expectedStatuses: [401],
  },
  {
    functionName: 'send-wedding-email',
    description: 'direct RSVP email relay rejects non-service-role callers at the platform or function authorization layer',
    payload: {
      type: 'rsvp_notification',
      to: 'proof@example.invalid',
      data: {
        guestName: 'Proof Guest',
        attending: true,
        coupleName1: 'Proof',
        coupleName2: 'Couple',
      },
    },
    expectedStatuses: [401, 403],
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
    safeError: body && typeof body === 'object' ? body.error ?? null : null,
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

const ok = results.every((result) => result.ok);

console.log(JSON.stringify({
  ok,
  generatedAt: new Date().toISOString(),
  mode: 'unauthenticated_live_denial',
  supabaseProjectHost: new URL(supabaseUrl).host,
  results,
  stillRequired: [
    'Owner/planner/coordinator/viewer live messaging mutation proof with disposable proof accounts.',
    'Secure service-role queue-processing proof in an environment that can hold SUPABASE_SERVICE_ROLE_KEY.',
    'Secure service-role storage and cross-table integrity proof.',
  ],
}, null, 2));

process.exit(ok ? 0 : 1);
