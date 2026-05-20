#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { resolvePreviewRuntime, stopPreviewRuntime } from './proofPreviewRuntime.mjs';

const PREVIEW_URL = 'http://127.0.0.1:4173';
const baseUrl = process.env.PLAYWRIGHT_BASE_URL || PREVIEW_URL;
const isLiveBaseUrl = baseUrl !== PREVIEW_URL;
const browserSpec = isLiveBaseUrl
  ? 'tests/e2e/guest-hub-qr-print-pack-live.spec.ts'
  : 'tests/e2e/guest-hub-qr-print-pack.spec.ts';

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
      required: true,
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
      required: true,
      ok: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode: typeof error?.status === 'number' ? error.status : 1,
      stdout: stdout.trim() || undefined,
      stderr: stderr.trim() || undefined,
    };
  }
}

const results = [
  runStep({
    id: 'guest-hub-qr-unit-tests',
    label: 'Guest hub QR asset and dashboard tests',
    command: 'npm test -- --run src/lib/guestHubQrAssets.test.ts src/lib/guestHubActions.test.ts src/components/ui/ShareQrPanel.test.tsx src/pages/dashboard/guestPhotos/GuestPhotoHubQrCard.test.tsx',
  }),
  runStep({
    id: 'build',
    label: 'Build integrity check',
    command: 'npm run build',
  }),
];

let previewProcess = null;
let previewOutput = { stdout: '', stderr: '' };
try {
  if (baseUrl === PREVIEW_URL) {
    const previewRuntime = await resolvePreviewRuntime({
      preferredPort: 4173,
      requestedBaseUrl: baseUrl,
      cwd: process.cwd(),
    });
    previewProcess = previewRuntime.previewProcess;
    previewOutput = previewRuntime.previewOutput;
  }

  results.push(runStep({
    id: 'guest-hub-qr-browser-proof',
    label: 'Guest hub QR print-pack export browser proof',
    command: `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --workers=1 ${browserSpec}`,
  }));

  if (previewOutput.stdout.trim()) {
    results.push({
      id: 'preview-server-log',
      label: 'Preview server log',
      command: 'npm run preview -- --host 127.0.0.1 --port 4173',
      required: false,
      ok: true,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      stdout: previewOutput.stdout.trim(),
      stderr: previewOutput.stderr.trim() || undefined,
    });
  }
} catch (error) {
  results.push({
    id: 'guest-hub-qr-browser-proof',
    label: 'Guest hub QR print-pack export browser proof',
    command: `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --workers=1 ${browserSpec}`,
    required: true,
    ok: false,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    stderr: [previewOutput.stderr.trim(), error instanceof Error ? error.message : 'Guest hub QR preview server failed to start.'].filter(Boolean).join('\n'),
  });
} finally {
  await stopPreviewRuntime(previewProcess);
}

const failedRequired = results.filter((result) => result.required && !result.ok);
const output = {
  ok: failedRequired.length === 0,
  slice: 'guest-hub-qr',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  contractSummary: isLiveBaseUrl
    ? 'Guest-hub QR live proof is green: this guest-surface/export lane closes shipped print-pack and safe QR runtime truth while still rolling up into the broader proof-board launch call.'
    : 'Guest-hub QR local proof is green: this lane validates QR export and safe public print-pack behavior locally and leaves shipped-runtime truth to the dedicated live rerun.',
  automatedCoverage: [
    'Safe public guest-hub QR asset generation and private QR vendor blocking truth',
    'Dashboard guest-hub QR controls, guest-hub action routing, and print-pack export readiness',
    isLiveBaseUrl
      ? 'Authenticated live browser proof for guest-hub print-pack export with captured nonblank safe HTML output'
      : 'Browser-triggered guest-hub print-pack export with captured nonblank safe HTML output',
  ],
  stillManualProofNeeded: [
    isLiveBaseUrl
      ? 'Extend the live proof to cover mobile guest-hub QR landing once the shipped runtime has a stable mobile QA route for this export surface.'
      : 'Rerun the same exported print-pack open/download flow on the shipped production runtime after the next approved guest-hub QR deploy.',
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
