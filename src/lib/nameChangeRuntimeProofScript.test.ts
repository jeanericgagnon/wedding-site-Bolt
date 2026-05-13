import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('name change runtime proof script', () => {
  it('supports a dedicated live runtime smoke for the name-change planner route', () => {
    const source = readFileSync(join(process.cwd(), 'scripts/v1-proof-name-change-runtime.mjs'), 'utf8');

    expect(source).toContain('V1_NAME_CHANGE_RUNTIME_LIVE');
    expect(source).toContain('tests/e2e/name-change-runtime.spec.ts');
    expect(source).toContain('Run V1_NAME_CHANGE_RUNTIME_LIVE=1 npm run proof:v1:name-change-runtime');
  });
});
