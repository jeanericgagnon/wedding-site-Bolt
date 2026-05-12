#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const targetRoot = 'src';
const forbiddenOperations = ['insert', 'update', 'upsert', 'delete'];
const trackedFiles = execFileSync('git', ['ls-files', targetRoot], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
})
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((file) => !/\.test\./.test(file))
  .filter((file) => !/\.d\.ts$/.test(file))
  .filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file));

const directWritePattern = /\.from\(\s*(['"`]).*?\1\s*\)[\s\S]{0,400}?\.(insert|update|upsert|delete)\s*\(/g;

function getLineNumber(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function buildMatchPreview(source, index) {
  const start = Math.max(0, index - 60);
  const end = Math.min(source.length, index + 220);
  return source.slice(start, end).replace(/\s+/g, ' ').trim();
}

function runInventory() {
  try {
    const matches = [];

    for (const file of trackedFiles) {
      const source = readFileSync(file, 'utf8');
      directWritePattern.lastIndex = 0;

      let match = directWritePattern.exec(source);
      while (match) {
        matches.push({
          file,
          line: getLineNumber(source, match.index),
          operation: match[1],
          preview: buildMatchPreview(source, match.index),
        });
        match = directWritePattern.exec(source);
      }
    }

    return { ok: matches.length === 0, matches };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'inventory scan failed',
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
  targetRoot,
  trackedFilesScanned: trackedFiles.length,
  forbiddenOperations,
  command: "git ls-files src | scan tracked runtime files for .from(...).insert/update/upsert/delete chains",
  summary: result.ok
    ? 'No direct client .insert/.update/.upsert/.delete calls remain in tracked src runtime files.'
    : 'Direct client write calls still exist in tracked src runtime files and must be removed or moved behind RPC/Edge paths.',
  automatedCoverage: [
    'Scans tracked src runtime files for direct Supabase .insert/.update/.upsert/.delete calls, including multiline chains and single/double/backtick table names',
    'Excludes test files and untracked local duplicates so the guard stays focused on shipped runtime code paths',
    'Provides a canonical local rerun command before and after RPC migration deploy sweeps',
  ],
  stillManualProofNeeded: [
    'Rerun this inventory guard after future runtime write-surface changes or RPC migration sweeps so the no-direct-client-write claim stays current.',
    'Expand live collaborator/client-RLS proof whenever new runtime write paths are introduced.',
  ],
  matches: result.matches,
  error: result.error ?? null,
};

console.log(JSON.stringify(output, null, 2));
if (!result.ok) process.exit(1);
