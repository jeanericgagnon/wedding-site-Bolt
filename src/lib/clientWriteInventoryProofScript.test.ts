import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('client write inventory proof script', () => {
  it('guards active runtime pages against direct client writes', () => {
    const source = readFileSync('scripts/v1-proof-client-write-inventory.mjs', 'utf8');

    expect(source).toContain("slice: 'client-write-inventory'");
    expect(source).toContain("const targetRoot = 'src'");
    expect(source).toContain("git', ['ls-files', targetRoot]");
    expect(source).toContain(String.raw`/\.from\('.*?'\)[\s\S]{0,240}?\.(insert|update|upsert|delete)\s*\(/g`);
    expect(source).toContain(".filter((file) => !/\\.test\\./.test(file))");
    expect(source).toContain('No direct client .insert/.update/.upsert/.delete calls remain in tracked src runtime files.');
    expect(source).toContain('Apply and deploy the pending local RPC batches');
  });
});
