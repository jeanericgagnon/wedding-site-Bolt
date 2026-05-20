#!/usr/bin/env node

import { execSync } from 'node:child_process';

const steps = [
  {
    id: 'qr-parser-tests',
    label: 'QR parsing, security, and third-party generation tests',
    command: 'node_modules/.bin/vitest run src/lib/qr/qrPayload.test.ts src/lib/guestHubQrAssets.test.ts --config scripts/qr-scanner-vitest.config.mjs --environment jsdom --pool=threads --maxWorkers=1 --no-file-parallelism --reporter=verbose',
    required: true,
    timeoutMs: 180_000,
  },
  {
    id: 'qr-scanner-component-tests',
    label: 'QR scanner camera/manual fallback tests',
    command: 'node_modules/.bin/vitest run src/components/qr/QrScanner.test.tsx --config scripts/qr-scanner-vitest.config.mjs --environment jsdom --pool=threads --maxWorkers=1 --no-file-parallelism --reporter=verbose',
    required: true,
    timeoutMs: 180_000,
  },
  {
    id: 'coordinator-qr-integration-tests',
    label: 'Coordinator QR scanner integration tests',
    command: 'node_modules/.bin/vitest run src/pages/dashboard/coordinator/CoordinatorQrScannerIntegration.test.tsx --config scripts/qr-scanner-vitest.config.mjs --environment jsdom --pool=threads --maxWorkers=1 --no-file-parallelism --reporter=verbose',
    required: true,
    timeoutMs: 240_000,
  },
  {
    id: 'build',
    label: 'Build integrity check',
    command: 'npm run build',
    required: true,
    timeoutMs: 900_000,
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
      timeout: step.timeoutMs ?? 180_000,
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
  slice: 'qr-scanner',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  contractSummary: failedRequired.length === 0
    ? 'QR scanner proof is green: this supporting ops-security lane validates payload safety, parsing, and fallback behavior without acting like a broader launch-truth artifact source.'
    : 'QR scanner proof is not green yet: required parser, scanner, coordinator integration, or build evidence is still failing.',
  automatedCoverage: [
    'Approved host and private-network QR payload blocking',
    'Guest invite / RSVP token parsing and wrong-site rejection',
    'Third-party public QR generation privacy guardrails',
    'Camera duplicate-scan debounce and manual fallback behavior',
    'Build integrity after QR scanner assertions',
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
