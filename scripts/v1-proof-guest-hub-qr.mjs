#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { resolvePreviewRuntime, stopPreviewRuntime } from './proofPreviewRuntime.mjs';

const PREVIEW_PORT = 4179;
const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}`;
const requestedBaseUrl = process.env.PLAYWRIGHT_BASE_URL || PREVIEW_URL;
const browserSpec = 'tests/e2e/mobile-core-smoke.spec.ts';
const guestFacingGrep = 'guest-facing mobile routes stay reachable and token-free where intended';
const dashboardGrep = 'authenticated dashboard core routes render on mobile without native dialog regressions';

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
    id: 'guest-hub-route-tests',
    label: 'Guest hub route helper tests',
    command: 'NODE_OPTIONS=--max-old-space-size=4096 npm test -- --run src/pages/SiteView.test.ts src/lib/publicSiteProject.test.ts src/lib/publicSiteSlug.test.ts',
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
    id: 'guest-hub-public-browser-proof',
    label: 'Guest-facing QR hub mobile browser proof',
    command: `PLAYWRIGHT_BASE_URL=${activeBaseUrl} npx playwright test --workers=1 ${browserSpec} -g "${guestFacingGrep}"`,
  }));
  results.push(runStep({
    id: 'guest-hub-owner-browser-proof',
    label: 'Owner QR hub controls mobile browser proof',
    command: `PLAYWRIGHT_BASE_URL=${activeBaseUrl} npx playwright test --workers=1 ${browserSpec} -g "${dashboardGrep}"`,
  }));
} catch (error) {
  results.push({
    id: 'guest-hub-browser-proof',
    label: 'Guest hub QR browser proof',
    command: `PLAYWRIGHT_BASE_URL=${activeBaseUrl} npx playwright test --workers=1 ${browserSpec}`,
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
  contractSummary: failedRequired.length === 0
    ? 'Guest-hub QR proof is green: the guest-facing hub path and owner QR/print-card controls are reachable on the current app surface.'
    : 'Guest-hub QR proof is not green yet: required route, build, or QR hub browser evidence is still failing.',
  automatedCoverage: [
    'Guest-hub route continuity for public and guest-scoped paths',
    'Guest-facing mobile route continuity from the hub into RSVP, travel, photo upload, recap, guestbook, and vault surfaces',
    'Owner mobile dashboard visibility for the QR guest-hub and print-card controls',
    'Build integrity after guest-hub QR assertions',
  ],
  stillManualProofNeeded: [
    'Keep real QR export/download behavior fresh on the shipped runtime after future guest-hub or photos-surface deploys.',
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
