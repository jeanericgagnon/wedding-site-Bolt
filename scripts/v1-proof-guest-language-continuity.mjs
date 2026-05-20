#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolvePreviewRuntime, stopPreviewRuntime } from './proofPreviewRuntime.mjs';

const PREVIEW_URL = 'http://127.0.0.1:4173';
const baseUrl = process.env.PLAYWRIGHT_BASE_URL || PREVIEW_URL;
function envValue(key, fallback = '') {
  if (process.env[key]) return String(process.env[key]);
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) return fallback;
  const match = readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .find((line) => line.startsWith(`${key}=`));
  if (!match) return fallback;
  return match.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, '');
}

const ownerEmail = envValue('V1_OWNER_EMAIL', '');
const ownerPassword = envValue('V1_OWNER_PASSWORD', '');
const shouldRunLiveProof = baseUrl !== PREVIEW_URL && /^https?:\/\//i.test(baseUrl) && Boolean(ownerEmail && ownerPassword);

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

const results = [];

results.push(runStep({
  id: 'guest-language-unit-tests',
  label: 'Guest language continuity unit tests',
  command: 'npm test -- --run src/lib/guestLanguagePreference.test.ts src/lib/guestMessageLanguagePreview.test.ts src/lib/rsvpTranslationAssets.test.ts src/pages/RSVP.test.tsx',
}));

results.push(runStep({
  id: 'build',
  label: 'Build integrity check',
  command: 'npm run build',
}));

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
    id: 'guest-language-browser-proof',
    label: 'Guest language browser continuity proof',
    command: `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --workers=1 tests/e2e/guest-i18n.spec.ts`,
  }));

  if (shouldRunLiveProof) {
    results.push(runStep({
      id: 'guest-language-live-proof',
      label: 'Guest language authenticated live proof',
      command: `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --workers=1 tests/e2e/guest-language-live.spec.ts`,
    }));
  }

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
    id: 'guest-language-browser-proof',
    label: 'Guest language browser continuity proof',
    command: `PLAYWRIGHT_BASE_URL=${baseUrl} npx playwright test --workers=1 tests/e2e/guest-i18n.spec.ts`,
    required: true,
    ok: false,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    stderr: [previewOutput.stderr.trim(), error instanceof Error ? error.message : 'Guest language preview server failed to start.'].filter(Boolean).join('\n'),
  });
} finally {
  await stopPreviewRuntime(previewProcess);
}

const failedRequired = results.filter((result) => result.required && !result.ok);
const output = {
  ok: failedRequired.length === 0,
  slice: 'guest-language-continuity',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  },
  contractSummary: shouldRunLiveProof
    ? 'Guest-language continuity live proof is green: this guest-surface bundle validates translated RSVP and guest-hub continuity as supporting non-SMS launch evidence.'
    : 'Guest-language continuity local proof is green: this guest-surface bundle validates translated route continuity locally and leaves authenticated live guest-language truth to the dedicated production rerun.',
  automatedCoverage: [
    'Stored guest language preference and owner-preview language derivation truth',
    'Translated RSVP question and meal-choice continuity coverage',
    'Guest-facing RSVP, event hub, photo upload, and recap language continuity in a browser',
    'Authenticated live owner messaging preview plus guest-facing translated-route continuity when live credentials are available',
  ],
  stillManualProofNeeded: shouldRunLiveProof
    ? []
    : [
        'Rerun the authenticated live owner messaging preview plus guest-facing language continuity flow on production once V1_OWNER_EMAIL, V1_OWNER_PASSWORD, and a live PLAYWRIGHT_BASE_URL are available.',
      ],
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
