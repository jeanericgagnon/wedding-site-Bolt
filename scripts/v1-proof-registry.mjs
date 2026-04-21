#!/usr/bin/env node

import { execSync } from 'node:child_process';

const steps = [
  {
    id: 'registry-service-tests',
    label: 'Registry service trust tests',
    command: 'npm test -- src/pages/dashboard/registry/registryService.test.ts',
    required: true,
  },
  {
    id: 'registry-types-tests',
    label: 'Registry metadata + attention-state tests',
    command: 'npm test -- src/pages/dashboard/registry/registryTypes.test.ts',
    required: true,
  },
  {
    id: 'registry-guard',
    label: 'Registry dashboard guard smoke',
    command: 'node scripts/smoke_registry_guard.js',
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
const failedRequired = results.filter((result) => result.required && !result.ok);

const output = {
  ok: failedRequired.length === 0,
  slice: 'registry',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  automatedCoverage: [
    'Purchased-state normalization and duplicate detection',
    'Metadata confidence / blocked retailer / repair-state attention truth',
    'Registry dashboard guard coverage',
    'Build integrity after registry proof assertions',
  ],
  stillManualProofNeeded: [
    'Add or import a real registry item',
    'Run a repair or cleanup path on a weak import',
    'Verify internal/public purchased-state behavior after runtime edits',
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
