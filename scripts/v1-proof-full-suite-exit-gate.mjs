#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { resolvePreviewRuntime, stopPreviewRuntime } from './proofPreviewRuntime.mjs';

const requireLive = process.argv.includes('--require-live');
const liveEnabled = process.env.V1_FULL_SUITE_EXIT_GATE_LIVE === '1';
const PREVIEW_PORT = 4179;
const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}`;
const LIVE_DEFAULT_URL = 'https://dayof.love';
const liveBaseUrl = process.env.PLAYWRIGHT_BASE_URL || LIVE_DEFAULT_URL;

const localSteps = [
  {
    id: 'board-freshness',
    label: 'Canonical launch-truth freshness',
    command: 'npm run proof:v1:board:freshness',
    required: true,
    timeoutMs: 180_000,
  },
  {
    id: 'board-raw',
    label: 'Canonical machine-readable launch board',
    command: 'npm run proof:v1:board',
    required: true,
    timeoutMs: 180_000,
  },
  {
    id: 'board-markdown',
    label: 'Canonical markdown launch board',
    command: 'npm run proof:v1:board:md',
    required: true,
    timeoutMs: 180_000,
  },
  {
    id: 'typecheck',
    label: 'TypeScript integrity',
    command: 'npm run typecheck -- --pretty false',
    required: true,
    timeoutMs: 300_000,
  },
  {
    id: 'lint',
    label: 'Lint integrity',
    command: 'npm run lint -- --quiet',
    required: true,
    timeoutMs: 300_000,
  },
  {
    id: 'coordinator-proof',
    label: 'Coordinator full-suite proof',
    command: 'npm run proof:v1:coordinator-dayof',
    required: true,
    timeoutMs: 900_000,
  },
  {
    id: 'name-change-proof',
    label: 'Name-change full-suite proof',
    command: 'npm run proof:v1:name-change-runtime',
    required: true,
    timeoutMs: 900_000,
  },
  {
    id: 'registry-proof',
    label: 'Registry full-suite proof',
    command: 'npm run proof:v1:registry',
    required: true,
    timeoutMs: 900_000,
  },
];

const liveSteps = liveEnabled ? [
  {
    id: 'responsive-surface-proof',
    label: 'Cross-feature responsive surface proof',
    command: `PLAYWRIGHT_BASE_URL=${liveBaseUrl} npx playwright test --workers=1 tests/e2e/full-suite-three-lanes-responsive.spec.ts`,
    required: true,
    timeoutMs: 300_000,
  },
  {
    id: 'coordinator-live-proof',
    label: 'Coordinator live proof',
    command: `PLAYWRIGHT_BASE_URL=${liveBaseUrl} V1_COORDINATOR_DAYOF_LIVE=1 npx playwright test --workers=1 tests/e2e/coordinator-dayof-live.spec.ts`,
    required: true,
    timeoutMs: 420_000,
  },
  {
    id: 'name-change-live-proof',
    label: 'Name-change live proof',
    command: `PLAYWRIGHT_BASE_URL=${liveBaseUrl} V1_NAME_CHANGE_RUNTIME_LIVE=1 npx playwright test --workers=1 tests/e2e/name-change-runtime.spec.ts`,
    required: true,
    timeoutMs: 420_000,
  },
  {
    id: 'registry-live-proof',
    label: 'Registry live proof',
    command: `PLAYWRIGHT_BASE_URL=${liveBaseUrl} LIVE_REGISTRY_WRITE_READ=1 npx playwright test --workers=1 tests/e2e/registry-write-read.spec.ts`,
    required: true,
    timeoutMs: 420_000,
  },
  {
    id: 'collaborator-permission-proof',
    label: 'Collaborator permission live proof',
    command: `PLAYWRIGHT_BASE_URL=${liveBaseUrl} LIVE_COLLABORATOR_PERMISSION_RLS=1 npx playwright test --workers=1 tests/e2e/collaborator-permission-rls.spec.ts`,
    required: true,
    timeoutMs: 420_000,
  },
] : [];

const steps = [...localSteps, ...liveSteps];
let resolvedLiveBaseUrl = liveBaseUrl;

function runStep(step) {
  const startedAt = new Date().toISOString();
  console.error(`[full-suite-exit-gate] starting ${step.id}: ${step.command}`);
  try {
    const stdout = execSync(step.command, {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      shell: '/bin/zsh',
      env: process.env,
      timeout: step.timeoutMs ?? 300_000,
      maxBuffer: 20 * 1024 * 1024,
    });
    console.error(`[full-suite-exit-gate] passed ${step.id}`);
    return {
      id: step.id,
      label: step.label,
      command: step.command,
      required: step.required,
      ok: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      stdout: stdout.trim(),
    };
  } catch (error) {
    const stdout = typeof error?.stdout === 'string' ? error.stdout : Buffer.isBuffer(error?.stdout) ? error.stdout.toString('utf8') : '';
    const stderr = typeof error?.stderr === 'string' ? error.stderr : Buffer.isBuffer(error?.stderr) ? error.stderr.toString('utf8') : '';
    console.error(`[full-suite-exit-gate] failed ${step.id}`);
    return {
      id: step.id,
      label: step.label,
      command: step.command,
      required: step.required,
      ok: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode: typeof error?.status === 'number' ? error.status : 1,
      stdout: stdout.trim() || undefined,
      stderr: stderr.trim() || undefined,
    };
  }
}

const results = localSteps.map(runStep);
let previewProcess = null;
let previewOutput = { stdout: '', stderr: '' };

try {
  if (liveEnabled && liveBaseUrl === PREVIEW_URL) {
    const previewRuntime = await resolvePreviewRuntime({
      preferredPort: PREVIEW_PORT,
      requestedBaseUrl: liveBaseUrl,
      cwd: process.cwd(),
    });
    previewProcess = previewRuntime.previewProcess;
    previewOutput = previewRuntime.previewOutput;
    resolvedLiveBaseUrl = previewRuntime.baseUrl;
  }

  results.push(...liveSteps.map((step) => runStep({
    ...step,
    command: step.command.replaceAll(liveBaseUrl, resolvedLiveBaseUrl),
  })));
} catch (error) {
  if (liveEnabled) {
    results.push({
      id: 'live-preview-runtime',
      label: 'Full-suite live preview runtime',
      command: `npm run preview -- --host 127.0.0.1 --port ${PREVIEW_PORT}`,
      required: true,
      ok: false,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      stderr: [previewOutput.stdout.trim(), previewOutput.stderr.trim(), error instanceof Error ? error.message : 'Preview server failed to start.'].filter(Boolean).join('\n'),
    });
  }
} finally {
  await stopPreviewRuntime(previewProcess);
}

if (requireLive && !liveEnabled) {
  console.log(JSON.stringify({
    ok: false,
    blocked: true,
    proof: 'full-suite-exit-gate-live',
    generatedAt: new Date().toISOString(),
    missingEnv: ['V1_FULL_SUITE_EXIT_GATE_LIVE=1'],
    message: 'Run V1_FULL_SUITE_EXIT_GATE_LIVE=1 npm run proof:v1:full-suite-exit-gate to verify the responsive, live, and permission-sensitive full-suite exit gate.',
    localResults: results,
  }, null, 2));
  process.exit(1);
}

const failedRequired = results.filter((result) => result.required && !result.ok);
const output = {
  ok: failedRequired.length === 0,
  blocked: requireLive && !liveEnabled,
  proof: liveEnabled ? 'full-suite-exit-gate-live' : 'full-suite-exit-gate-local',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: failedRequired.length,
  },
  contractSummary: failedRequired.length === 0
    ? liveEnabled
      ? 'Live full-suite exit-gate is green: workflow-style evidence stays freshness-aware while this helper proof bundle aggregates responsive, permission, and shipped-surface checks without replacing the proof-board launch call.'
      : 'Local full-suite exit-gate is green: this helper proof bundle starts with the board trio, then aggregates shipped-surface checks while still deferring the final launch call to the proof-board flow.'
    : 'Full-suite exit-gate is not green yet: one or more required board, typecheck, lint, feature-proof, responsive, live, or permission checks are still failing.',
  automatedCoverage: [
    'Desktop, tablet, and mobile route usability across the three full-suite lanes',
    'Dedicated coordinator, name-change, and registry proof lanes aggregated into one exit-gate result',
    'Saved-data continuity inherited from planner save/reload, coordinator handoff/issue lifecycle, and registry live write/read proof lanes',
    'Role and permission boundaries aggregated from coordinator role-access coverage plus live collaborator RLS proof',
    'Operational handoff, packet, review, repair, and export surfaces aggregated from the dedicated feature proof lanes',
    'Dedicated local and live proof coverage for the final shipped surfaces, with the responsive gate acting as the cross-feature device check',
  ],
  stillManualProofNeeded: liveEnabled ? [] : [
    'Run V1_FULL_SUITE_EXIT_GATE_LIVE=1 npm run proof:v1:full-suite-exit-gate for the live responsive and collaborator-permission proof bundle.',
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
