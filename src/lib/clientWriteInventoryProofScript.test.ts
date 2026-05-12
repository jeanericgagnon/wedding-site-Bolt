import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('client write inventory proof script', () => {
  it('guards active runtime pages against direct client writes', () => {
    const source = readFileSync('scripts/v1-proof-client-write-inventory.mjs', 'utf8');

    expect(source).toContain("slice: 'client-write-inventory'");
    expect(source).toContain("const targetPaths = ['src/pages/dashboard', 'src/pages']");
    expect(source).toContain(String.raw`\.from\('.*'\)\.(insert|update|upsert|delete)`);
    expect(source).toContain('!**/*.test.*');
    expect(source).toContain('No direct client .insert/.update/.upsert/.delete calls remain');
    expect(source).toContain('Apply and deploy the pending local RPC batches');
  });
});
