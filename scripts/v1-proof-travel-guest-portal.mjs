#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { resolvePreviewRuntime, stopPreviewRuntime } from './proofPreviewRuntime.mjs';

const PREVIEW_PORT = 4173;
const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}`;
const requestedBaseUrl = process.env.PLAYWRIGHT_BASE_URL || PREVIEW_URL;
const isLiveBaseUrl = requestedBaseUrl !== PREVIEW_URL;
const browserSpec = isLiveBaseUrl
  ? 'tests/e2e/travel-guest-hub-live.spec.ts'
  : 'tests/e2e/travel-guest-hub-mobile.spec.ts';

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
  return `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --workers=1${reporterArg} ${browserSpec}`;
}

const results = [
  ...(isLiveBaseUrl ? [runStep({
    id: 'travel-portal-live-data-proof',
    label: 'Live public travel data proof',
    command: 'node scripts/proof-travel-live-data.mjs',
  })] : []),
  runStep({
    id: 'travel-portal-ui-tests',
    label: 'Travel portal UI and event-hub render tests',
    command: 'NODE_OPTIONS=--max-old-space-size=8192 npm test -- --run src/lib/travelGuestPortal.test.ts src/pages/EventHubLiveContent.test.tsx src/pages/EventHub.test.tsx',
  }),
  runStep({
    id: 'travel-portal-public-contract-tests',
    label: 'Travel portal public-contract tests',
    command: 'NODE_OPTIONS=--max-old-space-size=8192 npm test -- --run src/lib/publicSiteAccess.test.ts src/lib/publicSiteRenderModel.test.ts',
  }),
  runStep({
    id: 'travel-portal-siteview-tests',
    label: 'Travel portal SiteView continuity tests',
    command: 'NODE_OPTIONS=--max-old-space-size=4096 npm test -- --run src/pages/SiteView.travelHandoff.test.ts src/pages/SiteView.previewFallback.test.ts',
  }),
  runStep({
    id: 'build',
    label: 'Build integrity check',
    command: 'npm run build',
  }),
];

let previewProcess = null;
let previewStdout = '';
let previewStderr = '';
let activeBaseUrl = requestedBaseUrl;
try {
  if (requestedBaseUrl === PREVIEW_URL) {
    const previewRuntime = await resolvePreviewRuntime({
      preferredPort: PREVIEW_PORT,
      requestedBaseUrl,
      cwd: process.cwd(),
    });
    previewProcess = previewRuntime.previewProcess;
    previewStdout = previewRuntime.previewStdout;
    previewStderr = previewRuntime.previewStderr;
    activeBaseUrl = previewRuntime.baseUrl;
  }

  results.push(runStep({
    id: 'travel-portal-mobile-browser-proof',
    label: isLiveBaseUrl
      ? 'Live invite-scoped guest travel hub continuity browser proof'
      : 'Mobile guest travel hub continuity browser proof',
    command: browserProofCommand(activeBaseUrl, browserSpec, isLiveBaseUrl),
  }));

  if (previewStdout.trim()) {
    results.push({
      id: 'preview-server-log',
      label: 'Preview server log',
      command: 'npm run preview -- --host 127.0.0.1 --port 4173',
      required: false,
      ok: true,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      stdout: previewStdout.trim(),
      stderr: previewStderr.trim() || undefined,
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
    stderr: [previewStderr.trim(), error instanceof Error ? error.message : 'Travel guest portal preview server failed to start.'].filter(Boolean).join('\n'),
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
  automatedCoverage: [
    'Live public-site-access travel data continuity for the proof guest',
    'Travel portal readiness and guest-hub spotlight helper truth',
    'SiteView invite-token handoff continuity from guest-hub links into public travel routes',
    'Public render-model and public-access sanitization for structured travel records',
    'Guest-hub live content render path for travel quick plan surfaces',
    isLiveBaseUrl
      ? 'Authenticated live mobile browser proof from invite-scoped guest hub to travel, RSVP, and photo routes without raw-token body leakage'
      : 'Mobile browser proof from invite-scoped guest hub to travel, RSVP, and photo routes without raw-token body leakage',
  ],
  stillManualProofNeeded: [
    isLiveBaseUrl
      ? 'Deploy the guest-hub invite handoff fix, then confirm the shipped runtime in a fresh browser-capable session once browser startup is usable again.'
      : 'Confirm the same invite-scoped travel hub flow against the shipped production runtime after the next approved travel-portal deploy.',
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
