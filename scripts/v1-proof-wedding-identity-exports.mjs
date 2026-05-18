#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { resolvePreviewRuntime, stopPreviewRuntime } from './proofPreviewRuntime.mjs';

const PREVIEW_PORT = 4175;
const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}`;
let baseUrl = process.env.PLAYWRIGHT_BASE_URL || PREVIEW_URL;

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
    id: 'wedding-identity-export-tests',
    label: 'Wedding identity export unit and component tests',
    command: 'npm test -- --run src/lib/weddingIdentityExports.test.ts src/pages/dashboard/settings/SettingsIdentityExportsPanel.test.tsx src/pages/dashboard/settings/settingsSiteData.test.ts src/lib/settingsErrorSafety.test.ts',
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
try {
  if (baseUrl === PREVIEW_URL) {
    const previewRuntime = await resolvePreviewRuntime({
      preferredPort: PREVIEW_PORT,
      requestedBaseUrl: baseUrl,
      cwd: process.cwd(),
    });
    baseUrl = previewRuntime.baseUrl;
    previewProcess = previewRuntime.previewProcess;
    previewStdout = previewRuntime.previewStdout;
    previewStderr = previewRuntime.previewStderr;
  }

  results.push(runStep({
    id: 'wedding-identity-browser-proof',
    label: 'Wedding identity manifest, style-kit, print-pack, and story export browser proof',
    command: `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --workers=1 tests/e2e/wedding-identity-exports.spec.ts`,
  }));

  if (previewStdout.trim()) {
    results.push({
      id: 'preview-server-log',
      label: 'Preview server log',
      command: 'npm run preview -- --host 127.0.0.1 --port 4175',
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
    id: 'wedding-identity-browser-proof',
    label: 'Wedding identity manifest, style-kit, print-pack, and story export browser proof',
    command: `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --workers=1 tests/e2e/wedding-identity-exports.spec.ts`,
    required: true,
    ok: false,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    stderr: [previewStderr.trim(), error instanceof Error ? error.message : 'Wedding identity preview server failed to start.'].filter(Boolean).join('\n'),
  });
} finally {
  await stopPreviewRuntime(previewProcess);
}

const failedRequired = results.filter((result) => result.required && !result.ok);
const output = {
  ok: failedRequired.length === 0,
  slice: 'wedding-identity-exports',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  automatedCoverage: [
    'Wedding identity readiness truth, planner-safe manifest output, and safe story/style export generation',
    'Settings identity export controls for manifest copy, style-kit copy, print-pack download, and story-graphic download',
    'Browser-triggered identity export capture with nonblank HTML/SVG/PNG/PDF output and no private token leakage',
  ],
  stillManualProofNeeded: [
    'Rerun the same copy/download flow against the shipped production runtime after the next approved identity-export deploy.',
  ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
