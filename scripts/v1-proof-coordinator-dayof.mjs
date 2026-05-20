#!/usr/bin/env node

import { execSync } from 'node:child_process';

const requireLive = process.argv.includes('--require-live');

const steps = [
  {
    id: 'coordinator-role-access-tests',
    label: 'Coordinator role-access tests',
    command: 'node_modules/.bin/vitest run src/lib/coordinatorRoleAccess.test.ts --config scripts/coordinator-dayof-vitest.config.mjs --environment jsdom --pool=threads --maxWorkers=1 --no-file-parallelism --reporter=verbose',
    required: true,
    timeoutMs: 180_000,
  },
  {
    id: 'coordinator-checkin-queue-tests',
    label: 'Coordinator check-in queue tests',
    command: 'node_modules/.bin/vitest run src/lib/coordinatorCheckInQueue.test.ts --config scripts/coordinator-dayof-vitest.config.mjs --environment jsdom --pool=threads --maxWorkers=1 --no-file-parallelism --reporter=verbose',
    required: true,
    timeoutMs: 180_000,
  },
  {
    id: 'coordinator-qr-tests',
    label: 'Coordinator QR parser and scanner tests',
    command: 'node_modules/.bin/vitest run src/lib/qr/qrPayload.test.ts src/components/qr/QrScanner.test.tsx --config scripts/coordinator-dayof-vitest.config.mjs --environment jsdom --pool=threads --maxWorkers=1 --no-file-parallelism --reporter=verbose',
    required: true,
    timeoutMs: 180_000,
  },
  {
    id: 'coordinator-event-awareness-tests',
    label: 'Coordinator event-awareness and seating-scope tests',
    command: 'node_modules/.bin/vitest run src/lib/operationalEvent.test.ts src/pages/dashboard/coordinator/buildCoordinatorDashboardDerivedState.test.ts src/pages/dashboard/seating/seatingService.test.ts src/lib/coordinatorEventAwarenessProof.test.ts --config scripts/coordinator-dayof-vitest.config.mjs --environment jsdom --pool=threads --maxWorkers=1 --no-file-parallelism --reporter=verbose',
    required: true,
    timeoutMs: 180_000,
  },
  {
    id: 'coordinator-timeline-state-tests',
    label: 'Coordinator timeline state tests',
    command: 'node_modules/.bin/vitest run src/lib/coordinatorTimelineState.test.ts --config scripts/coordinator-dayof-vitest.config.mjs --environment jsdom --pool=threads --maxWorkers=1 --no-file-parallelism --reporter=verbose',
    required: true,
    timeoutMs: 180_000,
  },
  {
    id: 'coordinator-service-tests',
    label: 'Coordinator service and persistence tests',
    command: 'node_modules/.bin/vitest run src/pages/dashboard/coordinator/coordinatorService.test.ts --config scripts/coordinator-dayof-vitest.config.mjs --environment jsdom --pool=threads --maxWorkers=1 --no-file-parallelism --reporter=verbose',
    required: true,
    timeoutMs: 180_000,
  },
  {
    id: 'coordinator-full-suite-tests',
    label: 'Coordinator full-suite continuity and export tests',
    command: 'node_modules/.bin/vitest run src/pages/dashboard/coordinator/coordinatorFullSuiteUtils.test.ts --config scripts/coordinator-dayof-vitest.config.mjs --environment jsdom --pool=threads --maxWorkers=1 --no-file-parallelism --reporter=verbose',
    required: true,
    timeoutMs: 180_000,
  },
  {
    id: 'checkin-guard',
    label: 'Check-in guard',
    command: 'npm run smoke:checkin',
    required: true,
    timeoutMs: 60_000,
  },
  {
    id: 'build',
    label: 'Build integrity check',
    command: 'npm run build',
    required: true,
    timeoutMs: 900_000,
  },
];

const liveEnabled = process.env.V1_COORDINATOR_DAYOF_LIVE === '1';

if (requireLive && !liveEnabled) {
  console.log(JSON.stringify({
    ok: false,
    blocked: true,
    slice: 'coordinator-dayof',
    generatedAt: new Date().toISOString(),
    missingEnv: ['V1_COORDINATOR_DAYOF_LIVE=1'],
    message: 'Run V1_COORDINATOR_DAYOF_LIVE=1 npm run proof:v1:coordinator-dayof to verify the live coordinator/day-of route.',
  }, null, 2));
  process.exit(1);
}

function runStep(step) {
  const startedAt = new Date().toISOString();
  console.error(`[coordinator-dayof-proof] starting ${step.id}: ${step.command}`);
  try {
    const stdout = execSync(step.command, {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      shell: '/bin/zsh',
      env: process.env,
      timeout: step.timeoutMs ?? 180_000,
      maxBuffer: 20 * 1024 * 1024,
    });

    console.error(`[coordinator-dayof-proof] passed ${step.id}`);
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
    console.error(`[coordinator-dayof-proof] failed ${step.id}`);
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
    id: 'coordinator-live-runtime-smoke',
    label: 'Coordinator live runtime smoke',
    command: 'npx playwright test --workers=1 tests/e2e/coordinator-dayof-live.spec.ts',
    required: true,
    timeoutMs: 420_000,
  }));
}
const failedRequired = results.filter((result) => result.required && !result.ok);

const output = {
  ok: failedRequired.length === 0,
  slice: 'coordinator-dayof',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  contractSummary: failedRequired.length === 0
    ? liveEnabled
      ? 'Coordinator day-of live proof is green: this lane closes coordinator runtime truth for the shipped ops surface while still rolling up into the broader proof-board launch call.'
      : 'Coordinator day-of local proof is green: this lane validates coordinator ops behavior locally and leaves real event-floor runtime truth to the dedicated live rerun plus the broader proof-board flow.'
    : 'Coordinator day-of proof is not green yet: required role, check-in, QR, event-awareness, service, full-suite, guard, build, or live runtime evidence is still failing.',
  automatedCoverage: [
    'Role-aware coordinator live-ops boundaries',
    'Check-in queue filtering behavior',
    'QR payload safety, duplicate-scan debounce, and guest resolution behavior',
    'Operational event selection shared across coordinator, seating lookup, and scanner entry points',
    'Single-live-event timeline state truth',
    'Persisted staffing handoff save and issue-log service boundaries',
    'Incident ownership, runner-task lifecycle completion, guest continuity, and shift-snapshot export behavior',
    'Check-in mode guardrail',
    'Build integrity after coordinator proof assertions',
  ],
  stillManualProofNeeded: [
    ...(liveEnabled ? [] : [
      'Run coordinator mode with realistic guest/event data',
      'Verify queue/check-in/timeline/Q&A feel calm under actual usage',
      'Confirm a coordinator can answer who is here / what is next / what needs action in runtime',
    ]),
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
