#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { resolvePreviewRuntime, stopPreviewRuntime } from './proofPreviewRuntime.mjs';

const PREVIEW_PORT = 4181;
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
    id: 'analytics-aggregate-tests',
    label: 'Website and invite analytics aggregate tests',
    command: 'NODE_OPTIONS=--max-old-space-size=4096 npm test -- --run src/pages/dashboard/analyticsAggregate.test.ts',
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
    id: 'analytics-public-browser-proof',
    label: 'Public mobile route analytics surface proof',
    command: `PLAYWRIGHT_BASE_URL=${activeBaseUrl} npx playwright test --workers=1 ${browserSpec} -g "${guestFacingGrep}"`,
  }));
  results.push(runStep({
    id: 'analytics-owner-browser-proof',
    label: 'Owner analytics dashboard mobile proof',
    command: `PLAYWRIGHT_BASE_URL=${activeBaseUrl} npx playwright test --workers=1 ${browserSpec} -g "${dashboardGrep}"`,
  }));
} catch (error) {
  results.push({
    id: 'analytics-browser-proof',
    label: 'Website and invite analytics browser proof',
    command: `PLAYWRIGHT_BASE_URL=${activeBaseUrl} npx playwright test --workers=1 ${browserSpec}`,
    required: true,
    ok: false,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    stderr: [previewOutput.stderr.trim(), error instanceof Error ? error.message : 'Website/invite analytics preview server failed to start.'].filter(Boolean).join('\n'),
  });
} finally {
  await stopPreviewRuntime(previewProcess);
}

const failedRequired = results.filter((result) => result.required && !result.ok);
const output = {
  ok: failedRequired.length === 0,
  slice: 'website-invite-analytics',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  contractSummary: failedRequired.length === 0
    ? 'Website and invite analytics proof is green: the current aggregate math plus owner/public surfaces are still wired and readable.'
    : 'Website and invite analytics proof is not green yet: required aggregate math, build, or dashboard/public browser evidence is still failing.',
  automatedCoverage: [
    'Analytics funnel aggregation math',
    'Public guest-facing route continuity for the measured entry surfaces',
    'Owner overview visibility for website and invite analytics plus funnel readback',
    'Build integrity after analytics assertions',
  ],
  stillManualProofNeeded: [
    'Keep live event aggregation and owner overview readback fresh after future analytics or guest-entry deploys.',
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
