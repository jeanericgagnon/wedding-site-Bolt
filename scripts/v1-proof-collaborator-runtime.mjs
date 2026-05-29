#!/usr/bin/env node

import { execSync } from 'node:child_process';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const isLocalBaseUrl = /127\.0\.0\.1|localhost/i.test(baseUrl);
const ownerEmail = process.env.V1_OWNER_EMAIL || '';
const ownerPassword = process.env.V1_OWNER_PASSWORD || '';
const collaboratorEmail = process.env.V1_COLLABORATOR_EMAIL || '';
const collaboratorPassword = process.env.V1_COLLABORATOR_PASSWORD || '';

function classifyBlocker() {
  if (!ownerEmail || !ownerPassword || !collaboratorEmail || !collaboratorPassword) {
    return {
      blocked: true,
      blockerType: 'missing_runtime_credentials',
      message: 'Runtime collaborator proof needs V1_OWNER_EMAIL, V1_OWNER_PASSWORD, V1_COLLABORATOR_EMAIL, and V1_COLLABORATOR_PASSWORD.',
      recommendation: 'Provide disposable proof accounts for owner + collaborator and rerun the runtime collaborator proof bundle.',
    };
  }

  return { blocked: false, blockerType: null, message: null, recommendation: null };
}

async function assertLocalBaseUrlReady(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1_500) });
    if (response.ok) return;
    throw new Error(`received HTTP ${response.status}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Runtime collaborator proof requires a running preview/dev server at ${url}. Start the local runtime first, then rerun this proof. (${detail})`,
    );
  }
}

function runRuntimeInviteFlow() {
  const command = [
    'node scripts/playwright-owner-create-invite-and-claim.mjs',
    JSON.stringify(baseUrl),
    JSON.stringify(ownerEmail),
    JSON.stringify(ownerPassword),
    JSON.stringify(collaboratorEmail),
    JSON.stringify(collaboratorPassword),
  ].join(' ');

  try {
    const stdout = execSync(command, {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      shell: '/bin/zsh',
      env: process.env,
      maxBuffer: 20 * 1024 * 1024,
    });

    let parsed = null;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      parsed = null;
    }

    const failedSteps = Array.isArray(parsed?.steps) ? parsed.steps.filter((step) => !step.ok) : [];

    return {
      id: 'invite-accept-runtime',
      label: 'Owner invite -> collaborator accept runtime flow',
      command,
      required: true,
      ok: failedSteps.length === 0,
      blocked: false,
      blockerType: null,
      parsed,
      stdout: parsed ? undefined : stdout.trim(),
      failures: failedSteps.map((step) => ({ name: step.name, error: step.error ?? 'unknown runtime flow error' })),
    };
  } catch (error) {
    const stdout = typeof error?.stdout === 'string' ? error.stdout : Buffer.isBuffer(error?.stdout) ? error.stdout.toString('utf8') : '';
    const stderr = typeof error?.stderr === 'string' ? error.stderr : Buffer.isBuffer(error?.stderr) ? error.stderr.toString('utf8') : '';

    let parsed = null;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      parsed = null;
    }

    return {
      id: 'invite-accept-runtime',
      label: 'Owner invite -> collaborator accept runtime flow',
      command,
      required: true,
      ok: false,
      blocked: false,
      blockerType: null,
      exitCode: typeof error?.status === 'number' ? error.status : 1,
      parsed,
      stdout: parsed ? undefined : stdout.trim(),
      stderr: stderr.trim() || undefined,
      failures: Array.isArray(parsed?.steps)
        ? parsed.steps.filter((step) => !step.ok).map((step) => ({ name: step.name, error: step.error ?? 'unknown runtime flow error' }))
        : [],
    };
  }
}

const blocker = classifyBlocker();

const output = blocker.blocked
  ? {
      ok: false,
      blocked: true,
      slice: 'collaborator-runtime-proof',
      generatedAt: new Date().toISOString(),
      summary: { total: 1, passed: 0, failed: 0, blocked: 1 },
      automatedCoverage: [
        'Owner invite creation in settings',
        'Collaborator accept flow',
        'Role-aware post-accept landing evidence',
      ],
      stillManualProofNeeded: [
        'Attempt at least one forbidden action for the claimed collaborator role',
      ],
      blockers: [blocker],
      results: [],
    }
  : (() => {
      return { deferred: true };
    })();

if (!blocker.blocked && isLocalBaseUrl) {
  await assertLocalBaseUrlReady(baseUrl);
}

const finalOutput = blocker.blocked
  ? output
  : (() => {
      const result = runRuntimeInviteFlow();
      return {
        ok: result.ok,
        blocked: false,
        slice: 'collaborator-runtime-proof',
        generatedAt: new Date().toISOString(),
        summary: { total: 1, passed: result.ok ? 1 : 0, failed: result.ok ? 0 : 1, blocked: 0 },
        automatedCoverage: [
          'Owner invite creation in settings',
          'Collaborator accept flow',
          'Role-aware post-accept landing evidence',
        ],
        stillManualProofNeeded: [
          'Attempt at least one forbidden action for the claimed collaborator role',
        ],
        blockers: [],
        results: [result],
      };
    })();

console.log(JSON.stringify(finalOutput, null, 2));
if (!finalOutput.ok && !finalOutput.blocked) process.exit(1);
