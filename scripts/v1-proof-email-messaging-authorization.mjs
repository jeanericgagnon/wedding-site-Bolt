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
const internalErrorPattern = /\b(service\s*role|supabase|postgres|postgrest|database|schema|relation|table|column|policy|rls|jwt|bearer|token|secret|storage|bucket|provider|stripe|telnyx|twilio|sql|function|functions?\/v1)\b/i;
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

async function secureQueueProcessingProof() {
  if (!serviceRoleKey) {
    return {
      id: 'secure-queue-processing-proof',
      label: 'Secure service-role queue-processing proof',
      ok: false,
      blocked: true,
      blockerType: 'missing_service_role_key',
      message: 'Set SUPABASE_SERVICE_ROLE_KEY to run secure queue-processing proof.',
    };
  }

  const restHeaders = {
    apikey: anonKey || serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  };

  const pendingResponse = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/email_queue?select=id,status&type,payload_json&status=eq.pending&limit=5`, {
    headers: restHeaders,
    signal: AbortSignal.timeout(15_000),
  });
  const pendingText = await pendingResponse.text();
  if (!pendingResponse.ok) {
    return {
      id: 'secure-queue-processing-proof',
      label: 'Secure service-role queue-processing proof',
      ok: false,
      blocked: false,
      blockerType: 'queue_read_failed',
      status: pendingResponse.status,
      message: pendingText.slice(0, 240) || 'Could not inspect pending email queue rows.',
    };
  }

  const pendingRows = JSON.parse(pendingText);
  if (pendingRows.length > 0) {
    return {
      id: 'secure-queue-processing-proof',
      label: 'Secure service-role queue-processing proof',
      ok: false,
      blocked: true,
      blockerType: 'pending_live_queue_not_empty',
      message: `Pending live email queue has ${pendingRows.length} row(s); proof will not process them.`,
      sampleIds: pendingRows.map((row) => row.id).slice(0, 5),
    };
  }

  const proofPayload = {
    type: 'guest_recap_available',
    payload_json: {
      to: 'not-an-email',
      guestName: 'Queue Proof',
      coupleName1: 'Proof',
      coupleName2: 'Couple',
      coupleLabel: 'Proof & Couple',
      recapUrl: 'https://dayof.love/proof-recap',
    },
    status: 'pending',
    attempts: 0,
  };

  let insertedId = '';

  try {
    const insertResponse = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/email_queue`, {
      method: 'POST',
      headers: {
        ...restHeaders,
        Prefer: 'return=representation',
      },
      body: JSON.stringify(proofPayload),
      signal: AbortSignal.timeout(15_000),
    });
    const insertText = await insertResponse.text();
    if (!insertResponse.ok) {
      return {
        id: 'secure-queue-processing-proof',
        label: 'Secure service-role queue-processing proof',
        ok: false,
        blocked: false,
        blockerType: 'queue_insert_failed',
        status: insertResponse.status,
        message: insertText.slice(0, 240) || 'Could not insert proof queue row.',
      };
    }

    const [insertedRow] = JSON.parse(insertText);
    insertedId = insertedRow?.id ?? '';
    if (!insertedId) {
      return {
        id: 'secure-queue-processing-proof',
        label: 'Secure service-role queue-processing proof',
        ok: false,
        blocked: false,
        blockerType: 'queue_insert_missing_id',
        message: 'Proof queue row insert did not return an id.',
      };
    }

    const processResponse = await fetch(`${functionsBaseUrl}/process-email-queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey || serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(15_000),
    });
    const processText = await processResponse.text();
    if (!processResponse.ok) {
      return {
        id: 'secure-queue-processing-proof',
        label: 'Secure service-role queue-processing proof',
        ok: false,
        blocked: false,
        blockerType: 'queue_process_failed',
        status: processResponse.status,
        message: processText.slice(0, 240) || 'Could not run queue processing proof.',
      };
    }

    const processBody = processText ? JSON.parse(processText) : {};

    const verifyResponse = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/email_queue?select=id,status,attempts,error&id=eq.${insertedId}&limit=1`, {
      headers: restHeaders,
      signal: AbortSignal.timeout(15_000),
    });
    const verifyText = await verifyResponse.text();
    if (!verifyResponse.ok) {
      return {
        id: 'secure-queue-processing-proof',
        label: 'Secure service-role queue-processing proof',
        ok: false,
        blocked: false,
        blockerType: 'queue_verify_failed',
        status: verifyResponse.status,
        message: verifyText.slice(0, 240) || 'Could not verify processed queue row.',
      };
    }

    const [verifiedRow] = JSON.parse(verifyText);
    const ok = processBody.processed === 1
      && processBody.delivered === 0
      && processBody.failed === 1
      && verifiedRow?.status === 'failed'
      && verifiedRow?.attempts === 1
      && verifiedRow?.error === 'Invalid recipient email';

    return {
      id: 'secure-queue-processing-proof',
      label: 'Secure service-role queue-processing proof',
      ok,
      blocked: false,
      processBody,
      verifiedRow,
    };
  } finally {
    if (insertedId) {
      await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/email_queue?id=eq.${insertedId}`, {
        method: 'DELETE',
        headers: {
          ...restHeaders,
          Prefer: 'return=minimal',
        },
        signal: AbortSignal.timeout(15_000),
      }).catch(() => {});
    }
  }
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

const secureQueueResult = await secureQueueProcessingProof();
results.push(secureQueueResult);

const ok = results.every((result) => result.ok || result.blocked);
const unsafeDenialCopy = results.filter((result) => !isPublicSafeDenialCopy(result.safeError));
const blockers = results.filter((result) => result.blocked);

console.log(JSON.stringify({
  ok: ok && unsafeDenialCopy.length === 0,
  generatedAt: new Date().toISOString(),
  mode: 'unauthenticated_live_denial',
  supabaseProjectHost: new URL(supabaseUrl).host,
  results,
  blockers,
  unsafeDenialCopy,
  stillRequired: [
    'Owner/planner/coordinator/viewer live messaging mutation proof with disposable proof accounts.',
    ...(secureQueueResult.ok ? [] : ['Secure service-role queue-processing proof in an environment that can hold SUPABASE_SERVICE_ROLE_KEY.']),
    'Secure service-role storage and cross-table integrity proof.',
  ],
}, null, 2));

process.exit(ok && unsafeDenialCopy.length === 0 ? 0 : 1);
