#!/usr/bin/env node

import { execSync } from 'node:child_process';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'https://dayof.love';
const siteSlug = process.env.V1_PROOF_SITE_SLUG || 'maya-and-leo';
const defaultStepTimeoutMs = Number.parseInt(process.env.V1_POSTDEPLOY_STEP_TIMEOUT_MS ?? '240000', 10);

const steps = [
  {
    id: 'canonical-smoke',
    command: 'npm run proof:v1:canonical-smoke',
    env: { PLAYWRIGHT_BASE_URL: baseUrl },
    timeoutMs: defaultStepTimeoutMs,
  },
  {
    id: 'prereqs',
    command: 'npm run proof:v1:prereqs',
    env: {},
    timeoutMs: defaultStepTimeoutMs,
  },
  {
    id: 'ai-rollout',
    command: 'npm run proof:v1:ai-rollout',
    env: { V1_AI_ROLLOUT_LIVE: '1', V1_AI_ROLLOUT_BASE_URL: baseUrl },
    timeoutMs: 60_000,
  },
  {
    id: 'ai-exposure-static',
    command: 'npm run proof:v1:ai-exposure',
    env: {},
    timeoutMs: 60_000,
  },
  {
    id: 'runtime-wording-truth',
    command: 'node scripts/capture-runtime-wording-truth.mjs',
    env: { PLAYWRIGHT_BASE_URL: baseUrl, V1_PROOF_SITE_SLUG: siteSlug },
    timeoutMs: defaultStepTimeoutMs,
  },
  {
    id: 'public-quality',
    command: 'npm run test:e2e:public-quality',
    env: { PLAYWRIGHT_BASE_URL: baseUrl, V1_PROOF_SITE_SLUG: siteSlug },
    timeoutMs: defaultStepTimeoutMs,
  },
  {
    id: 'guests-rsvp-ops',
    command: 'npm run proof:v1:guests-rsvp-ops',
    env: {},
    timeoutMs: defaultStepTimeoutMs,
  },
  {
    id: 'data-integrity',
    command: 'npm run proof:v1:data-integrity',
    env: {},
    timeoutMs: defaultStepTimeoutMs,
  },
];

function runStep(step) {
  const startedAt = new Date().toISOString();
  console.error(`[postdeploy] starting ${step.id}: ${step.command}`);
  try {
    const stdout = execSync(step.command, {
      cwd: process.cwd(),
      env: { ...process.env, ...step.env },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 30 * 1024 * 1024,
      timeout: step.timeoutMs,
      killSignal: 'SIGTERM',
    });
    console.error(`[postdeploy] passed ${step.id}`);
    return {
      id: step.id,
      ok: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      timeoutMs: step.timeoutMs,
      stdout: stdout.slice(-6000),
    };
  } catch (error) {
    const stdout = typeof error?.stdout === 'string' ? error.stdout : Buffer.isBuffer(error?.stdout) ? error.stdout.toString('utf8') : '';
    const stderr = typeof error?.stderr === 'string' ? error.stderr : Buffer.isBuffer(error?.stderr) ? error.stderr.toString('utf8') : '';
    const timedOut = error?.signal === 'SIGTERM' && typeof step.timeoutMs === 'number';
    console.error(`[postdeploy] failed ${step.id}${timedOut ? ' (timeout)' : ''}`);
    return {
      id: step.id,
      ok: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode: typeof error?.status === 'number' ? error.status : 1,
      timeoutMs: step.timeoutMs,
      timedOut,
      stdout: stdout.slice(-6000),
      stderr: stderr.slice(-6000),
    };
  }
}

const results = steps.map(runStep);
const failed = results.filter((result) => !result.ok);

console.log(JSON.stringify({
  ok: failed.length === 0,
  generatedAt: new Date().toISOString(),
  baseUrl,
  siteSlug,
  summary: {
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
  },
  results,
}, null, 2));

if (failed.length > 0) {
  process.exit(1);
}
