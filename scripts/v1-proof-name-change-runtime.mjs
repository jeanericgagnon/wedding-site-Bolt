#!/usr/bin/env node

import { execSync } from 'node:child_process';

const requireLive = process.argv.includes('--require-live');
const liveEnabled = process.env.V1_NAME_CHANGE_RUNTIME_LIVE === '1';

const steps = [
  {
    id: 'name-change-service-tests',
    label: 'Name change service normalization and merge tests',
    command: 'DAYOF_FOCUSED_VITEST_TIMEOUT_MS=180000 npm run test:focused -- src/pages/dashboard/planning/nameChangeService.test.ts',
    required: true,
  },
  {
    id: 'name-change-dependency-tests',
    label: 'Name change TSA, DMV, passport, and dependency matrix tests',
    command: 'DAYOF_FOCUSED_VITEST_TIMEOUT_MS=180000 npm run test:focused -- src/lib/nameChange/requirements.test.ts src/lib/nameChange/tsaFlow.test.ts src/lib/nameChange/dmvFlow.test.ts src/lib/nameChange/passportFlow.test.ts src/lib/nameChange/targetExecution.test.ts',
    required: true,
  },
  {
    id: 'name-change-reminder-tests',
    label: 'Name change reminder, blocker, and template proof tests',
    command: 'DAYOF_FOCUSED_VITEST_TIMEOUT_MS=180000 npm run test:focused -- src/lib/nameChange/reminders.test.ts',
    required: true,
  },
  {
    id: 'name-change-overview-tests',
    label: 'Name change overview and lifecycle tests',
    command: 'DAYOF_FOCUSED_VITEST_TIMEOUT_MS=180000 npm run test:focused -- src/pages/dashboard/nameChangeLifecycleLabels.test.ts src/pages/dashboard/nameChangeLifecycleStatus.test.ts src/pages/dashboard/nameChangeOverviewCard.test.ts src/pages/dashboard/nameChangeOverviewInsights.test.ts src/pages/dashboard/planning/nameChangePlannerUi.test.ts src/pages/dashboard/planning/nameChangeExecutionTime.test.ts',
    required: true,
  },
  {
    id: 'name-change-full-suite-tests',
    label: 'Name change full-suite planner depth tests',
    command: 'DAYOF_FOCUSED_VITEST_TIMEOUT_MS=180000 npm run test:focused -- src/lib/nameChange/plannerDeepWork.test.ts src/lib/nameChange/engine.test.ts src/pages/dashboard/planning/NameChangePlannerTab.test.tsx',
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
  console.error(`[name-change-runtime-proof] starting ${step.id}: ${step.command}`);
  try {
    const stdout = execSync(step.command, {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      shell: '/bin/zsh',
      env: process.env,
      maxBuffer: 20 * 1024 * 1024,
    });
    console.error(`[name-change-runtime-proof] passed ${step.id}`);

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
    console.error(`[name-change-runtime-proof] failed ${step.id}`);
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
  contractSummary: failedRequired.length === 0
    ? (
      liveEnabled
        ? 'Name-change runtime live proof is green: this shipped planner lane closes authenticated saved-surface runtime truth while still rolling up into the broader proof-board launch call.'
        : 'Name-change runtime local proof is green: this planner lane validates saved planner logic and UI locally and leaves authenticated live route truth to the dedicated rerun.'
    )
    : (
      liveEnabled
        ? 'Name-change runtime live proof is red: fix failing required lanes before using this as deploy evidence.'
        : 'Name-change runtime local proof is red: fix failing required lanes before using this as deploy evidence.'
    ),
  automatedCoverage: [
    'Case normalization and document merge safety',
    'Passport alias mapping plus TSA, DMV, travel, and execution dependency truth',
    'Reminder, blocker, and proof-aware template behavior',
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
