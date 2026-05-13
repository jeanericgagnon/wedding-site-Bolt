import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('coordinator day-of proof script', () => {
  it('supports a dedicated live runtime smoke for the coordinator route', () => {
    const source = readFileSync(join(process.cwd(), 'scripts/v1-proof-coordinator-dayof.mjs'), 'utf8');

    expect(source).toContain('V1_COORDINATOR_DAYOF_LIVE');
    expect(source).toContain('tests/e2e/coordinator-dayof-live.spec.ts');
    expect(source).toContain('src/pages/dashboard/coordinator/coordinatorFullSuiteUtils.test.ts');
    expect(source).toContain('Run V1_COORDINATOR_DAYOF_LIVE=1 npm run proof:v1:coordinator-dayof');
  });
});
