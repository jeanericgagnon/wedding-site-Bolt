#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { resolvePreviewRuntime, stopPreviewRuntime } from './proofPreviewRuntime.mjs';

const PREVIEW_URL = 'http://127.0.0.1:4173';
const requestedBaseUrl = process.env.PLAYWRIGHT_BASE_URL || PREVIEW_URL;
let browserBaseUrl = requestedBaseUrl;
const isLiveBaseUrl = requestedBaseUrl !== PREVIEW_URL;
const desktopSpec = isLiveBaseUrl
  ? 'tests/e2e/guest-preview-live.spec.ts'
  : 'tests/e2e/guest-preview-flow.spec.ts';
const mobileSpec = isLiveBaseUrl
  ? 'tests/e2e/guest-preview-mobile-live.spec.ts'
  : 'tests/e2e/guest-preview-mobile.spec.ts';

function runStep(step) {
  const startedAt = new Date().toISOString();
  console.error(`[guest-preview-proof] starting ${step.id}: ${step.command}`);
  try {
    const stdout = execSync(step.command, {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      shell: '/bin/zsh',
      env: process.env,
      maxBuffer: 20 * 1024 * 1024,
      timeout: step.timeoutMs ?? 180_000,
    });

    console.error(`[guest-preview-proof] passed ${step.id}`);
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
    console.error(`[guest-preview-proof] failed ${step.id}`);
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
      timedOut: error?.signal === 'SIGTERM' || error?.code === 'ETIMEDOUT' || error?.killed === true,
      stdout: stdout.trim() || undefined,
      stderr: stderr.trim() || undefined,
    };
  }
}

function manualStep({ id, label, command, stderr }) {
  const timestamp = new Date().toISOString();
  return {
    id,
    label,
    command,
    required: false,
    ok: false,
    startedAt: timestamp,
    finishedAt: timestamp,
    stderr,
  };
}

const results = [
  runStep({
    id: 'guest-preview-unit-tests',
    label: 'Guest preview confidence unit tests',
    command: 'npm test -- --run src/lib/guestPreviewRoutes.test.ts src/lib/guestVisibilityPreview.test.ts src/pages/dashboard/guests/GuestItineraryDrawer.test.tsx src/pages/dashboard/guests/demoGuestItinerary.test.ts src/pages/dashboard/guests/GuestListPanel.test.tsx src/pages/dashboard/guests/GuestHouseholdPanel.test.tsx',
    timeoutMs: 120_000,
  }),
  runStep({
    id: 'build',
    label: 'Build integrity check',
    command: 'npm run build',
    timeoutMs: 300_000,
  }),
];

let previewProcess = null;
let previewOutput = { stdout: '', stderr: '' };
try {
  if (requestedBaseUrl === PREVIEW_URL) {
    const previewRuntime = await resolvePreviewRuntime({
      preferredPort: 4173,
      requestedBaseUrl,
      cwd: process.cwd(),
    });
    browserBaseUrl = previewRuntime.baseUrl;
    previewProcess = previewRuntime.previewProcess;
    previewOutput = previewRuntime.previewOutput;
  }

  results.push(runStep({
    id: 'guest-preview-browser-proof',
    label: 'Guest drawer desktop preview browser proof',
    command: `PLAYWRIGHT_BASE_URL=${browserBaseUrl} npx playwright test --workers=1 ${desktopSpec}`,
    timeoutMs: 180_000,
  }));

  results.push(runStep({
    id: 'guest-preview-mobile-browser-proof',
    label: isLiveBaseUrl
      ? 'Guest drawer mobile live preview browser proof'
      : 'Guest drawer mobile preview browser proof',
    command: `PLAYWRIGHT_BASE_URL=${browserBaseUrl} npx playwright test --workers=1 ${mobileSpec}`,
    timeoutMs: 180_000,
  }));

  if (previewOutput.stdout.trim()) {
    results.push({
      id: 'preview-server-log',
      label: 'Preview server log',
      command: `npm run preview -- --host 127.0.0.1 --port ${new URL(browserBaseUrl).port || '4173'}`,
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
    id: 'guest-preview-browser-proof',
    label: 'Guest drawer browser proof',
    command: `PLAYWRIGHT_BASE_URL=${browserBaseUrl} npx playwright test --workers=1 ${desktopSpec}${isLiveBaseUrl ? '' : ` ${mobileSpec}`}`,
    required: true,
    ok: false,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    stderr: [previewOutput.stderr.trim(), error instanceof Error ? error.message : 'Guest preview proof failed to start.'].filter(Boolean).join('\n'),
  });
} finally {
  await stopPreviewRuntime(previewProcess);
}

const failedRequired = results.filter((result) => result.required && !result.ok);
const output = {
  ok: failedRequired.length === 0,
  slice: 'guest-preview-confidence',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  contractSummary: isLiveBaseUrl
    ? 'Guest preview live proof is green: this guest-preview lane validates shipped preview-route visibility and navigation on live runtime without replacing the broader launch-truth flow.'
    : 'Guest preview local proof is green: this lane validates preview-route confidence locally and leaves shipped-runtime guest-preview truth to the dedicated production rerun.',
  automatedCoverage: [
    'Guest preview route generation and token-safe visibility summary truth',
    'Guest drawer private QR surfaces without raw-token display leakage',
    isLiveBaseUrl
      ? 'Authenticated desktop live browser proof for real guest-facing site and RSVP preview routes through the shipped guest drawer'
      : 'Desktop browser proof for visible-versus-hidden event access plus RSVP/public site guest-preview routes',
    isLiveBaseUrl
      ? 'Authenticated mobile live browser proof for photo upload, travel, registry, and public-site guest-preview routes from the shipped guest drawer'
      : 'Mobile browser proof for photo upload, travel, registry, and public site guest-preview routes from the drawer',
  ],
  stillManualProofNeeded: [
    'Rerun guest drawer preview links against the shipped production runtime after the next approved guest-preview deploy.',
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
