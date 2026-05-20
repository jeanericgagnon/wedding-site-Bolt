#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { resolvePreviewRuntime, stopPreviewRuntime } from './proofPreviewRuntime.mjs';

const PREVIEW_PORT = 4180;
const requestedBaseUrl = process.argv[2] || process.env.PLAYWRIGHT_BASE_URL || null;

let previewProcess = null;
let previewOutput = { stdout: '', stderr: '' };

try {
  const previewRuntime = await resolvePreviewRuntime({
    preferredPort: PREVIEW_PORT,
    requestedBaseUrl,
    cwd: process.cwd(),
  });

  previewProcess = previewRuntime.previewProcess;
  previewOutput = previewRuntime.previewOutput;

  const baseUrl = previewRuntime.baseUrl;
  console.error(`[playwright-live-smoke] using base URL: ${baseUrl}`);

  execSync(`PLAYWRIGHT_BASE_URL=${JSON.stringify(baseUrl)} npx playwright test --workers=1 tests/e2e/live-smoke.spec.ts`, {
    stdio: 'inherit',
    shell: '/bin/zsh',
    env: process.env,
  });
} catch (error) {
  const previewLogs = [previewOutput.stdout.trim(), previewOutput.stderr.trim()].filter(Boolean).join('\n');
  if (previewLogs) {
    console.error('[playwright-live-smoke] preview output follows:\n' + previewLogs);
  }
  throw error;
} finally {
  await stopPreviewRuntime(previewProcess);
}
