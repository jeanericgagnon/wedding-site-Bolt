import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('focused Vitest runner wiring', () => {
  it('keeps a fail-fast script for constrained focused proof runs', () => {
    const pkg = readFileSync(join(process.cwd(), 'package.json'), 'utf8');
    const runner = readFileSync(join(process.cwd(), 'scripts/run-focused-vitest.mjs'), 'utf8');

    expect(pkg).toContain('"test:focused": "node scripts/run-focused-vitest.mjs"');
    expect(runner).toContain("const DEFAULT_TIMEOUT_MS = 75_000;");
    expect(runner).toContain("'--reporter=hanging-process'");
    expect(runner).toContain("'--maxWorkers=1'");
    expect(runner).toContain("'--no-file-parallelism'");
    expect(runner).toContain('process.exit(124);');
    expect(runner).toContain('Vitest did not finish before the focused-run timeout.');
    expect(runner).toContain('worker pool failed to start');
  });
});
