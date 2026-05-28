#!/usr/bin/env node

import { execSync } from 'node:child_process';

const steps = [
  {
    id: 'builder-route-contract-tests',
    label: 'Builder workspace route contract tests',
    command: 'npm test -- src/lib/builderWorkspaceRoutes.test.ts',
    required: true,
  },
  {
    id: 'auth-entry-intent-tests',
    label: 'Auth entry intent builder-route tests',
    command: 'npm test -- src/lib/authEntryIntent.test.ts',
    required: true,
  },
  {
    id: 'first-session-route-tests',
    label: 'First-session builder handoff tests',
    command: 'npm test -- src/lib/firstSessionWorkspaceRoutes.test.ts',
    required: true,
  },
  {
    id: 'builder-document-io-tests',
    label: 'Builder import/export contract tests',
    command: 'npm test -- src/pages/builderV2DocumentIo.test.ts',
    required: true,
  },
  {
    id: 'builder-sample-document-roundtrip-tests',
    label: 'Builder import/export stability across sample documents',
    command: 'npm test -- src/pages/builderV2SampleDocuments.test.ts',
    required: true,
  },
  {
    id: 'builder-entry-rollback-tests',
    label: 'Builder entry rollback and tooling fallback tests',
    command: 'npm test -- src/App.builderEntry.test.tsx src/lib/internalToolingRouteAccess.test.ts',
    required: true,
  },
  {
    id: 'builder-cutover-route-tests',
    label: 'Builder cutover route tests',
    command: 'npm test -- src/pages/BuilderCutover.test.tsx',
    required: true,
  },
  {
    id: 'overview-builder-route-tests',
    label: 'Dashboard overview builder-route tests',
    command: 'npm test -- src/pages/dashboard/overviewUtils.test.ts',
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
    const stdout = typeof error?.stdout === 'string'
      ? error.stdout
      : Buffer.isBuffer(error?.stdout)
        ? error.stdout.toString('utf8')
        : '';
    const stderr = typeof error?.stderr === 'string'
      ? error.stderr
      : Buffer.isBuffer(error?.stderr)
        ? error.stderr.toString('utf8')
        : '';

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
const failedRequired = results.filter((result) => result.required && !result.ok);

const output = {
  ok: failedRequired.length === 0,
  slice: 'builder-v2-cutover',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  automatedCoverage: [
    'Builder workspace route contract truth',
    'Auth entry intent recognition for builder editor and guide routes',
    'First-session builder handoff route continuity',
    'Builder import/export contract validity and non-destructive preview failure behavior',
    'Builder import/export stability across native v2, legacy layout-config, and legacy builder-project sample documents',
    'Builder hard-switch rollback and internal tooling fallback route behavior',
    'Builder cutover guide route helpers and legacy fallbacks',
    'Dashboard overview builder-route decisions',
    'Build integrity after builder-primary-path promotion',
  ],
  stillManualProofNeeded: [
    'Signed-in browser smoke for /dashboard/builder as the promoted Builder V2 owner path',
    'Signed-in browser smoke for /dashboard/builder-guide as the explicit guide fallback',
    'Runtime proof that legacy publish and polish escapes still feel understandable while they remain on /dashboard/builder-v1',
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
