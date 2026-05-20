#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { resolvePreviewRuntime, stopPreviewRuntime } from './proofPreviewRuntime.mjs';

const PREVIEW_PORT = 4178;
const DEFAULT_PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}`;
let baseUrl = process.env.PLAYWRIGHT_BASE_URL || DEFAULT_PREVIEW_URL;
let isLiveBaseUrl = baseUrl !== DEFAULT_PREVIEW_URL;

function getBrowserCommand(targetBaseUrl, liveBaseUrl) {
  return liveBaseUrl
    ? `PLAYWRIGHT_BASE_URL=${targetBaseUrl} npx playwright test --workers=1 --reporter=line tests/e2e/dayof-web-mode-live.spec.ts`
    : `PLAYWRIGHT_BASE_URL=${targetBaseUrl} npx playwright test --workers=1 tests/e2e/dayof-web-mode-offline.spec.ts`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const localOnlySteps = [
  {
    id: 'dayof-web-mode-tests',
    label: 'Day-of web-mode unit and render truth',
    command: 'npm test -- --run src/lib/guestHubOfflineSnapshot.test.ts src/lib/dayOfWebModeReadiness.test.ts src/lib/publicAccessArtifacts.test.ts src/lib/serviceWorkerSafety.test.ts src/pages/eventHubPageHelpers.test.ts src/pages/eventHubLiveContentHelpers.test.ts',
    required: true,
  },
  {
    id: 'build',
    label: 'Build integrity check',
    command: 'npm run build',
    required: true,
  },
];

const steps = isLiveBaseUrl ? [] : localOnlySteps;

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

let previewProcess = null;
let previewOutput = { stdout: '', stderr: '' };
try {
  const previewRuntime = await resolvePreviewRuntime({
    preferredPort: PREVIEW_PORT,
    requestedBaseUrl: process.env.PLAYWRIGHT_BASE_URL,
    cwd: process.cwd(),
  });
  baseUrl = previewRuntime.baseUrl;
  isLiveBaseUrl = baseUrl !== DEFAULT_PREVIEW_URL;
  previewProcess = previewRuntime.previewProcess;
  previewOutput = previewRuntime.previewOutput ?? { stdout: '', stderr: '' };

  results.push(runStep({
    id: 'dayof-web-mode-browser-proof',
    label: isLiveBaseUrl
      ? 'Live guest-hub day-of browser proof'
      : 'Day-of web-mode offline browser proof',
    command: getBrowserCommand(baseUrl, isLiveBaseUrl),
    required: true,
  }));

  if (previewOutput.stdout.trim()) {
    results.push({
      id: 'preview-server-log',
      label: 'Preview server log',
      command: 'npm run preview -- --host 127.0.0.1 --port 4178',
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
    id: 'dayof-web-mode-browser-proof',
    label: isLiveBaseUrl
      ? 'Live guest-hub day-of browser proof'
      : 'Day-of web-mode offline browser proof',
    command: getBrowserCommand(baseUrl, isLiveBaseUrl),
    required: true,
    ok: false,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    stderr: [previewOutput.stderr.trim(), error instanceof Error ? error.message : 'Day-of web-mode preview server failed to start.'].filter(Boolean).join('\n'),
  });
} finally {
  await stopPreviewRuntime(previewProcess);
}

const failedRequired = results.filter((result) => result.required && !result.ok);

const output = {
  ok: failedRequired.length === 0,
  slice: 'dayof-web-mode',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  contractSummary: isLiveBaseUrl
    ? 'Day-of web-mode live proof is green: this read-only guest-hub lane validates invite-scoped day-of visibility without claiming the separate guest-hub write/read mutation lane.'
    : 'Day-of web-mode local proof is green: this lane validates offline guest-hub continuity locally and still leaves shipped-runtime invite-state truth to the dedicated live rerun.',
  automatedCoverage: [
    ...(isLiveBaseUrl
      ? []
      : [
          'Guest-hub offline snapshot sanitization and readiness truth',
          'Service-worker guest-hub shell safety and EventHub render wiring',
        ]),
    isLiveBaseUrl
      ? 'Authenticated live browser proof for invite-scoped guest-state visibility, latest update, coordinator handoff, and map deep links'
      : 'Real browser offline proof for saved in-app guest-hub readback after reload',
    isLiveBaseUrl
      ? 'Read-only live proof stays separate from the standalone guest-hub write/read-with-cleanup production lane'
      : 'Real browser offline proof for cached event-hub offline shell navigation',
    ...(isLiveBaseUrl ? [] : ['Build integrity after day-of web-mode proof assertions']),
  ],
  stillManualProofNeeded: [
    isLiveBaseUrl
      ? 'Keep the standalone guest-hub write/read-with-cleanup lane green on future deploys because that production mutation proof remains intentionally separate from this read-only day-of browser proof.'
      : 'Rerun the same offline guest-hub paths against the shipped production runtime after the next approved guest-hub deploy.',
    isLiveBaseUrl
      ? 'None for the current read-only day-of web-mode lane beyond keeping this live proof green on future deploys.'
      : 'Confirm live owner day-of updates and guest-specific state rehydrate credibly for a real invite-linked guest on the shipped runtime.',
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
