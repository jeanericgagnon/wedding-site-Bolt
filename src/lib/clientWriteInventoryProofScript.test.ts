import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('client write inventory proof script', () => {
  it('guards active runtime pages against direct client writes', () => {
    const source = readFileSync('scripts/v1-proof-client-write-inventory.mjs', 'utf8');

    expect(source).toContain("slice: 'client-write-inventory'");
    expect(source).toContain("const targetRoot = 'src'");
    expect(source).toContain("git', ['ls-files', targetRoot]");
    expect(source).toContain(".filter((file) => !/\\.d\\.ts$/.test(file))");
    expect(source).toContain("const directWritePattern = /\\.from\\(\\s*(['\"`]).*?\\1\\s*\\)[\\s\\S]{0,400}?\\.(insert|update|upsert|delete)\\s*\\(/g;");
    expect(source).toContain('operation: match[2]');
    expect(source).toContain(".filter((file) => !/\\.test\\./.test(file))");
    expect(source).toContain('single/double/backtick table names');
    expect(source).toContain('No direct client .insert/.update/.upsert/.delete calls remain in tracked src runtime files.');
    expect(source).toContain('Rerun this inventory guard after future runtime write-surface changes or RPC migration sweeps');
  });
});
