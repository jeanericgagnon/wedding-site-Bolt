#!/usr/bin/env node

import { execSync } from 'node:child_process';

const requireLive = process.argv.includes('--require-live');
const liveEnabled = process.env.V1_NAME_CHANGE_RUNTIME_LIVE === '1';

const steps = [
  {
    id: 'name-change-service-tests',
    label: 'Name change service normalization and merge tests',
    command: 'npm test -- --run src/pages/dashboard/planning/nameChangeService.test.ts',
    required: true,
  },
  {
    id: 'name-change-overview-tests',
    label: 'Name change overview and lifecycle tests',
    command: 'npm test -- --run src/pages/dashboard/nameChangeLifecycleLabels.test.ts src/pages/dashboard/nameChangeLifecycleStatus.test.ts src/pages/dashboard/nameChangeOverviewCard.test.ts src/pages/dashboard/nameChangeOverviewInsights.test.ts src/pages/dashboard/planning/nameChangePlannerUi.test.ts src/pages/dashboard/planning/nameChangeExecutionTime.test.ts',
    required: true,
  },
  {
    id: 'name-change-full-suite-tests',
    label: 'Name change full-suite planner depth tests',
    command: 'npm test -- --run src/lib/nameChange/plannerDeepWork.test.ts src/lib/nameChange/engine.test.ts src/pages/dashboard/planning/NameChangePlannerTab.test.tsx',
    required: true,
  },
  {
    id: 'build',
    label: 'Build integrity check',
    command: 'npm run build',
    required: true,
  },
];

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

if (liveEnabled) {
  results.push(runStep({
    id: 'name-change-live-runtime-smoke',
    label: 'Name change live runtime smoke',
    command: 'npx playwright test --workers=1 tests/e2e/name-change-runtime.spec.ts',
    required: true,
  }));
}

if (requireLive && !liveEnabled) {
  console.log(JSON.stringify({
    ok: false,
    blocked: true,
    proof: 'name-change-runtime-live',
    generatedAt: new Date().toISOString(),
    missingEnv: ['V1_NAME_CHANGE_RUNTIME_LIVE=1'],
    message: 'Run V1_NAME_CHANGE_RUNTIME_LIVE=1 npm run proof:v1:name-change-runtime to verify the live name-change planner route.',
    localResults: results,
  }, null, 2));
  process.exit(1);
}

const failedRequired = results.filter((result) => result.required && !result.ok);
const output = {
  ok: failedRequired.length === 0,
  blocked: !liveEnabled,
  proof: liveEnabled ? 'name-change-runtime-live' : 'name-change-runtime-local',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: failedRequired.length,
  },
  automatedCoverage: [
    'Case normalization and document merge safety',
    'Lifecycle, overview, and planner UI truth',
    '50-state playbooks, institution handoff packets, edge-case branching, and export surfaces',
    'Build integrity after planner assertions',
    ...(liveEnabled ? ['Authenticated runtime route loads saved planner surfaces'] : []),
  ],
  stillManualProofNeeded: liveEnabled ? [] : [
    'Run V1_NAME_CHANGE_RUNTIME_LIVE=1 npm run proof:v1:name-change-runtime for the authenticated live route.',
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
