#!/usr/bin/env node

import { execSync } from 'node:child_process';

const requireLive = process.argv.includes('--require-live');
const liveEnabled = process.env.V1_FULL_SUITE_EXIT_GATE_LIVE === '1';

const localSteps = [
  {
    id: 'typecheck',
    label: 'TypeScript integrity',
    command: 'npm run typecheck -- --pretty false',
    required: true,
  },
  {
    id: 'lint',
    label: 'Lint integrity',
    command: 'npm run lint -- --quiet',
    required: true,
  },
  {
    id: 'coordinator-proof',
    label: 'Coordinator full-suite proof',
    command: 'npm run proof:v1:coordinator-dayof',
    required: true,
  },
  {
    id: 'name-change-proof',
    label: 'Name-change full-suite proof',
    command: 'npm run proof:v1:name-change-runtime',
    required: true,
  },
  {
    id: 'registry-proof',
    label: 'Registry full-suite proof',
    command: 'npm run proof:v1:registry',
    required: true,
  },
];

const liveSteps = liveEnabled ? [
  {
    id: 'responsive-surface-proof',
    label: 'Cross-feature responsive surface proof',
    command: 'npx playwright test --workers=1 tests/e2e/full-suite-three-lanes-responsive.spec.ts',
    required: true,
  },
  {
    id: 'coordinator-live-proof',
    label: 'Coordinator live proof',
    command: 'V1_COORDINATOR_DAYOF_LIVE=1 npx playwright test --workers=1 tests/e2e/coordinator-dayof-live.spec.ts',
    required: true,
  },
  {
    id: 'name-change-live-proof',
    label: 'Name-change live proof',
    command: 'V1_NAME_CHANGE_RUNTIME_LIVE=1 npx playwright test --workers=1 tests/e2e/name-change-runtime.spec.ts',
    required: true,
  },
  {
    id: 'registry-live-proof',
    label: 'Registry live proof',
    command: 'LIVE_REGISTRY_WRITE_READ=1 npx playwright test --workers=1 tests/e2e/registry-write-read.spec.ts',
    required: true,
  },
  {
    id: 'collaborator-permission-proof',
    label: 'Collaborator permission live proof',
    command: 'LIVE_COLLABORATOR_PERMISSION_RLS=1 npx playwright test --workers=1 tests/e2e/collaborator-permission-rls.spec.ts',
    required: true,
  },
] : [];

const steps = [...localSteps, ...liveSteps];

function runStep(step) {
  const startedAt = new Date().toISOString();
  try {
    const stdout = execSync(step.command, {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      shell: '/bin/zsh',
      env: process.env,
      maxBuffer: 20 * 1024 * 1024,
    });
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

const results = steps.map(runStep);

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
  automatedCoverage: [
    'Desktop, tablet, and mobile route usability across the three full-suite lanes',
    'Empty, error, retry, and manual-fallback truth inherited from the feature proof lanes',
    'Saved-data continuity across planner save/reload, coordinator continuity shaping, and registry live write/read',
    'Role and permission boundaries through coordinator role access plus live collaborator RLS proof',
    'Operational handoff, packet, review, and repair surfaces across coordinator, name-change, and registry',
    'Dedicated local and live proof coverage for the final shipped surfaces',
  ],
  stillManualProofNeeded: liveEnabled ? [] : [
    'Run V1_FULL_SUITE_EXIT_GATE_LIVE=1 npm run proof:v1:full-suite-exit-gate for the live responsive and collaborator-permission proof bundle.',
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
