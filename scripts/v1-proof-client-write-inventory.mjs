#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

const targetPaths = ['src/pages/dashboard', 'src/pages'];
const ignoreGlob = '!**/*.test.*';
const forbiddenOperations = ['insert', 'update', 'upsert', 'delete'];
const pattern = String.raw`\.from\('.*'\)\.(insert|update|upsert|delete)`;

const commandArgs = [
  '-n',
  pattern,
  ...targetPaths,
  '-g',
  ignoreGlob,
];

function runInventory() {
  try {
    const stdout = execFileSync('rg', commandArgs, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024,
    }).trim();

    const matches = stdout ? stdout.split(/\r?\n/).filter(Boolean) : [];
    return { ok: matches.length === 0, matches };
  } catch (error) {
    const status = typeof error?.status === 'number' ? error.status : 1;

    if (status === 1) {
      return { ok: true, matches: [] };
    }

    const stderr = typeof error?.stderr === 'string'
      ? error.stderr
      : Buffer.isBuffer(error?.stderr)
        ? error.stderr.toString('utf8')
        : '';

    return {
      ok: false,
      error: stderr.trim() || `ripgrep failed with exit code ${status}`,
      matches: [],
    };
  }
}

const result = runInventory();

const output = {
  ok: result.ok,
  blocked: false,
  slice: 'client-write-inventory',
  generatedAt: new Date().toISOString(),
  targetPaths,
  forbiddenOperations,
  command: ['rg', ...commandArgs].join(' '),
  summary: result.ok
    ? 'No direct client .insert/.update/.upsert/.delete calls remain in active src/pages/dashboard or src/pages runtime files.'
    : 'Direct client write calls still exist in active runtime pages and must be removed or moved behind RPC/Edge paths.',
  automatedCoverage: [
    'Scans active dashboard and page runtime files for direct Supabase .insert/.update/.upsert/.delete calls',
    'Excludes test files so the guard stays focused on shipped runtime code paths',
    'Provides a canonical local rerun command before and after RPC migration deploy sweeps',
  ],
  stillManualProofNeeded: [
    'Apply and deploy the pending local RPC batches, then rerun this inventory guard against the post-apply working tree',
    'Expand live collaborator/client-RLS proof after the remote apply sweep where new RPC paths become runtime truth',
  ],
  matches: result.matches,
  error: result.error ?? null,
};

console.log(JSON.stringify(output, null, 2));
if (!result.ok) process.exit(1);
