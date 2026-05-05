import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const scripts = packageJson.scripts ?? {};

const required = {
  'test:unit': 'vitest run src',
  'test:smoke': 'npm run smoke:registry && npm run smoke:rsvp && npm run smoke:csvmapper && npm run smoke:checkin && npm run smoke:messages && npm run smoke:site',
  'test:integration': 'npm run proof:v1:canonical-smoke && npm run proof:v1:guests-rsvp-ops && npm run proof:v1:registry && npm run proof:v1:seating-continuity && npm run proof:v1:comms-center',
  'test:e2e': 'npx playwright test --workers=1 tests/e2e',
  'test:launch': 'npm run typecheck -- --pretty false && npm run lint -- --quiet && npm run build && npm run proof:v1:board:md',
  'proof:v1:test-lanes': 'node scripts/v1-proof-test-lanes.mjs',
  'guard:file-size': 'node scripts/check-file-size-guard.mjs',
};

const failures = [];
const checks = [];

for (const [name, expected] of Object.entries(required)) {
  const actual = scripts[name];
  const ok = actual === expected;
  checks.push({ name, ok });
  if (!ok) {
    failures.push(`${name} expected ${JSON.stringify(expected)} but found ${JSON.stringify(actual)}`);
  }
}

if (!scripts.test?.startsWith('vitest run')) {
  failures.push('test must remain the full Vitest run.');
}

if (!scripts['proof:v1:board:md']?.includes('--markdown')) {
  failures.push('proof:v1:board:md must keep markdown proof-board generation.');
}

const result = {
  ok: failures.length === 0,
  checked: checks.length,
  checks,
  failures,
};

console.log(JSON.stringify(result, null, 2));

if (failures.length > 0) {
  process.exit(1);
}
