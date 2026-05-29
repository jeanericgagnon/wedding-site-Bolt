#!/usr/bin/env node

import { execSync } from 'node:child_process';
import fs from 'node:fs';

export function runCommandStep(step) {
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
      required: step.required ?? true,
      ok: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      stdout: stdout.trim(),
    };
  } catch (error) {
    const stdout = typeof error?.stdout === 'string'
      ? error.stdout
      : Buffer.isBuffer(error?.stdout)
        ? error.stdout.toString('utf8')
        : '';
    const stderr = typeof error?.stderr === 'string'
      ? error.stderr
      : Buffer.isBuffer(error?.stderr)
        ? error.stderr.toString('utf8')
        : '';

    return {
      id: step.id,
      label: step.label,
      command: step.command,
      required: step.required ?? true,
      ok: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode: typeof error?.status === 'number' ? error.status : 1,
      stdout: stdout.trim() || undefined,
      stderr: stderr.trim() || undefined,
    };
  }
}

export function checkSourceStep(step) {
  const startedAt = new Date().toISOString();

  try {
    const source = fs.readFileSync(step.file, 'utf8');
    const failures = [];

    for (const snippet of step.mustContain ?? []) {
      if (!source.includes(snippet)) failures.push(`Missing required text: ${snippet}`);
    }

    for (const snippet of step.mustNotContain ?? []) {
      if (source.includes(snippet)) failures.push(`Unexpected text present: ${snippet}`);
    }

    return {
      id: step.id,
      label: step.label,
      file: step.file,
      required: step.required ?? true,
      ok: failures.length === 0,
      startedAt,
      finishedAt: new Date().toISOString(),
      details: failures.length === 0 ? ['All source assertions passed.'] : failures,
    };
  } catch (error) {
    return {
      id: step.id,
      label: step.label,
      file: step.file,
      required: step.required ?? true,
      ok: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      details: [error instanceof Error ? error.message : String(error)],
    };
  }
}

export function checkFilePresenceStep(step) {
  const startedAt = new Date().toISOString();
  const missing = (step.files ?? []).filter((file) => !fs.existsSync(file));

  return {
    id: step.id,
    label: step.label,
    required: step.required ?? true,
    ok: missing.length === 0,
    startedAt,
    finishedAt: new Date().toISOString(),
    details: missing.length === 0
      ? ['All required files are present.']
      : missing.map((file) => `Missing file: ${file}`),
  };
}

export function buildBlockedResult({
  id,
  label,
  blocker,
  detail,
  required = true,
}) {
  const startedAt = new Date().toISOString();

  return {
    id,
    label,
    required,
    ok: false,
    blocked: true,
    blocker,
    startedAt,
    finishedAt: new Date().toISOString(),
    details: [detail],
  };
}

export function printProofAndExit(output) {
  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) process.exit(1);
}
