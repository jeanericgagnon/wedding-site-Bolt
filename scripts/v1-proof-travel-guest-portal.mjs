#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { resolvePreviewRuntime, stopPreviewRuntime } from './proofPreviewRuntime.mjs';

const PREVIEW_PORT = 4173;
const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}`;
const requestedBaseUrl = process.env.PLAYWRIGHT_BASE_URL || PREVIEW_URL;
const isLiveBaseUrl = requestedBaseUrl !== PREVIEW_URL;
const browserSpec = 'tests/e2e/mobile-core-smoke.spec.ts';
const browserGrep = 'guest-facing mobile routes stay reachable and token-free where intended';

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

function browserProofCommand(baseUrl, browserSpec, isLiveBaseUrl) {
  const reporterArg = isLiveBaseUrl ? ' --reporter=line' : '';
  return `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --workers=1${reporterArg} ${browserSpec} -g "${browserGrep}"`;
}

const results = [
  runStep({
    id: 'travel-portal-ui-tests',
    label: 'Travel section and public-site travel continuity tests',
    command: 'NODE_OPTIONS=--max-old-space-size=4096 npm test -- --run src/sections/components/TravelSection.test.tsx src/pages/SiteView.test.ts',
  }),
  runStep({
    id: 'travel-portal-public-contract-tests',
    label: 'Travel public-site lookup helper tests',
    command: 'NODE_OPTIONS=--max-old-space-size=4096 npm test -- --run src/lib/publicSiteProject.test.ts src/lib/publicSiteSlug.test.ts',
  }),
  runStep({
    id: 'build',
    label: 'Build integrity check',
    command: 'npm run build',
  }),
];

let previewProcess = null;
let previewOutput = { stdout: '', stderr: '' };
let activeBaseUrl = requestedBaseUrl;
try {
  if (requestedBaseUrl === PREVIEW_URL) {
    const previewRuntime = await resolvePreviewRuntime({
      preferredPort: PREVIEW_PORT,
      requestedBaseUrl,
      cwd: process.cwd(),
    });
    previewProcess = previewRuntime.previewProcess;
    previewOutput = previewRuntime.previewOutput;
    activeBaseUrl = previewRuntime.baseUrl;
  }

  results.push(runStep({
    id: 'travel-portal-mobile-browser-proof',
    label: isLiveBaseUrl
      ? 'Live invite-scoped guest travel hub continuity browser proof'
      : 'Mobile guest travel hub continuity browser proof',
    command: browserProofCommand(activeBaseUrl, browserSpec, isLiveBaseUrl),
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
    id: 'travel-portal-mobile-browser-proof',
    label: isLiveBaseUrl
      ? 'Live invite-scoped guest travel hub continuity browser proof'
      : 'Mobile guest travel hub continuity browser proof',
    command: browserProofCommand(activeBaseUrl, browserSpec, isLiveBaseUrl),
    required: true,
    ok: false,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    stderr: [previewOutput.stderr.trim(), error instanceof Error ? error.message : 'Travel guest portal preview server failed to start.'].filter(Boolean).join('\n'),
  });
} finally {
  await stopPreviewRuntime(previewProcess);
}

const failedRequired = results.filter((result) => result.required && !result.ok);
const output = {
  ok: failedRequired.length === 0,
  slice: 'travel-guest-portal',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  contractSummary: failedRequired.length === 0
    ? (isLiveBaseUrl
      ? 'Travel guest portal live proof is green: this lane validates the guest-facing travel path on the shipped runtime without relying on stale route-specific specs.'
      : 'Travel guest portal local proof is green: this lane validates the guest-facing travel path against the current app surface and public-site helpers.')
    : 'Travel guest portal proof is not green yet: required travel helper, build, or guest-facing browser evidence is still failing.',
  automatedCoverage: [
    'Travel-section component rendering for the shipped guest-facing travel surface',
    'Public-site demo hydration and invalid-date fallback continuity through SiteView',
    'Public site slug/project helper continuity for guest-facing route resolution',
    isLiveBaseUrl
      ? 'Live mobile guest-hub route continuity into travel, RSVP, and photo upload without raw-token leakage'
      : 'Local mobile guest-hub route continuity into travel, RSVP, and photo upload without raw-token leakage',
  ],
  stillManualProofNeeded: [
    isLiveBaseUrl
      ? 'Keep the shipped travel hub path fresh after future guest-hub or travel-surface deploys.'
      : 'Rerun the same guest-hub travel path against the shipped production runtime after the next approved travel-surface deploy.',
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
