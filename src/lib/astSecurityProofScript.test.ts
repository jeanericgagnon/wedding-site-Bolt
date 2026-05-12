import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('AST security proof script', () => {
  it('uses AST-backed runtime checks for launch-critical security boundaries', () => {
    const source = readFileSync('scripts/v1-proof-ast-security.mjs', 'utf8');

    expect(source).toContain("slice: 'ast-security'");
    expect(source).toContain('ts.createSourceFile');
    expect(source).toContain("'direct-client-write'");
    expect(source).toContain("'service-role-reference'");
    expect(source).toContain("'dangerously-set-inner-html'");
    expect(source).toContain("'storage-auth-bypass'");
    expect(source).toContain("'internal-tooling-route'");
    expect(source).toContain('criticalPublicBoundaryFiles');
    expect(source).toContain('internalToolingRoutesEnabled');
    expect(source).not.toContain('const directWritePattern =');
  });
});
