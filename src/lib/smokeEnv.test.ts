import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// @ts-expect-error Test imports a Node script module with named exports.
import { loadSmokeEnv, normalizeEnvValue } from '../../scripts/smokeEnv.mjs';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe('smoke env loader', () => {
  it('normalizes quoted env values', () => {
    expect(normalizeEnvValue(' "https://example.supabase.co" \n')).toBe('https://example.supabase.co');
    expect(normalizeEnvValue("' anon-key \\n'")).toBe('anon-key');
  });

  it('merges .env and .env.local with local overrides', () => {
    const cwd = process.cwd();
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'dayof-smoke-env-'));
    tempDirs.push(tempDir);

    writeFileSync(path.join(tempDir, '.env'), [
      'VITE_SUPABASE_URL="https://base.supabase.co"',
      'VITE_SUPABASE_ANON_KEY=base-key',
      'SHARED_VALUE=from-base',
    ].join('\n'));
    writeFileSync(path.join(tempDir, '.env.local'), [
      'VITE_SUPABASE_ANON_KEY="local-key"',
      'LOCAL_ONLY=present',
    ].join('\n'));

    process.chdir(tempDir);
    try {
      expect(loadSmokeEnv()).toEqual({
        VITE_SUPABASE_URL: 'https://base.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'local-key',
        SHARED_VALUE: 'from-base',
        LOCAL_ONLY: 'present',
      });
    } finally {
      process.chdir(cwd);
    }
  });
});
