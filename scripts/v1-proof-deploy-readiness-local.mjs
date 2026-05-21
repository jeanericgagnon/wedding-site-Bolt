#!/usr/bin/env node

import { execSync } from 'node:child_process';

const steps = [
  {
    id: 'typecheck',
    label: 'TypeScript typecheck',
    command: 'npm run typecheck -- --pretty false',
    required: true,
  },
  {
    id: 'build',
    label: 'Production build',
    command: 'npm run build',
    required: true,
  },
  {
    id: 'focused-smoke',
    label: 'Focused smoke lane (check-in guard)',
    command: 'npm run smoke:checkin',
    required: true,
  },
];

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
const failedRequired = results.filter((result) => result.required && !result.ok);

const output = {
  ok: failedRequired.length === 0,
  proof: 'deploy-readiness-local',
  generatedAt: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: failedRequired.length,
  },
  contractSummary:
    failedRequired.length === 0
      ? 'Local deploy-readiness gate is green: typecheck, build, and focused smoke all pass in a deterministic order.'
      : 'Local deploy-readiness gate is red: at least one required compile/smoke lane failed.',
  results,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
