import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('full-suite exit gate proof script wiring', () => {
  it('registers the package script', () => {
    const pkg = readFileSync(join(process.cwd(), 'package.json'), 'utf8');
    expect(pkg).toContain('"proof:v1:full-suite-exit-gate": "node scripts/v1-proof-full-suite-exit-gate.mjs"');
  });

  it('keeps the responsive and permission-sensitive live proofs in the gate', () => {
    const source = readFileSync(join(process.cwd(), 'scripts/v1-proof-full-suite-exit-gate.mjs'), 'utf8');
    expect(source).toContain('tests/e2e/full-suite-three-lanes-responsive.spec.ts');
    expect(source).toContain('tests/e2e/collaborator-permission-rls.spec.ts');
    expect(source).toContain('Desktop, tablet, and mobile route usability across the three full-suite lanes');
  });
});
