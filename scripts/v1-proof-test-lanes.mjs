import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const scripts = packageJson.scripts ?? {};
const ciHardpass = readFileSync('.github/workflows/ci-hardpass.yml', 'utf8');

const required = {
  'test:unit': 'vitest run src',
  'test:security': 'vitest run src/lib/launchEdgeFunctions.test.ts src/lib/publicSiteAccess.test.ts src/lib/publicSiteProject.test.ts src/lib/serviceWorkerSafety.test.ts src/lib/aiProviderKeySecurity.test.ts src/lib/aiExposureProofScript.test.ts src/lib/settingsErrorSafety.test.ts src/lib/serviceRoleAuthorizationDisposition.test.ts src/lib/registryPreviewUrlNormalizer.test.ts src/lib/emailSafety.test.ts src/pages/RSVP.test.tsx src/pages/EventRSVP.test.tsx',
  'test:smoke': 'npm run smoke:registry && npm run smoke:rsvp && npm run smoke:csvmapper && npm run smoke:checkin && npm run smoke:messages && npm run smoke:site',
  'test:integration': 'npm run proof:v1:canonical-smoke && npm run proof:v1:guests-rsvp-ops && npm run proof:v1:registry && npm run proof:v1:seating-continuity && npm run proof:v1:comms-center',
  'test:e2e': 'npx playwright test --workers=1 tests/e2e',
  'test:launch': 'npm run typecheck -- --pretty false && npm run proof:v1:strict-pocket && npm run lint -- --quiet && npm run test:security && npm run proof:v1:public-access-coverage && npm run proof:v1:client-write-inventory && npm run proof:v1:ast-security && npm run proof:v1:security-automation && LIVE_GUEST_DASHBOARD_SETTINGS_RPCS=1 npm run proof:v1:client-rls-matrix -- --require-live && npm run proof:v1:registry-preview-ssrf -- --require-live && npm run guard:file-size && npm run guard:assets && npm run build && npm run proof:v1:performance-budget && npm run proof:v1:board:md',
  'proof:v1:strict-pocket': 'eslint --max-warnings 0 src/components/auth/ProtectedRoute.tsx src/lib/activeSite.ts src/lib/customerSafeError.ts src/lib/mediaUrl.ts src/lib/paymentGate.ts src/lib/publicRenderContract.ts src/lib/publicSiteAccess.ts src/lib/publicSiteRenderModel.ts src/lib/publicSiteSlug.ts src/render/publicSectionDataSanitizer.ts src/lib/siteConfigValidate.ts src/lib/stripeService.ts src/lib/vendorProfiles.ts src/pages/RSVP.tsx src/pages/SiteView.tsx src/pages/siteViewHelpers.ts src/pages/onboarding/QuickStart.tsx src/routes/dashboardRoutes.tsx src/routes/publicRoutes.tsx src/routes/guestRoutes.tsx src/routes/onboardingRoutes.tsx src/routes/accountRoutes.tsx src/routes/internalToolingRoutes.tsx src/pages/dashboard/planning/nameChangeService.ts',
  'proof:v1:test-lanes': 'node scripts/v1-proof-test-lanes.mjs',
  'proof:v1:public-access-coverage': 'node scripts/v1-proof-public-access-coverage.mjs',
  'proof:v1:client-write-inventory': 'node scripts/v1-proof-client-write-inventory.mjs',
  'proof:v1:ast-security': 'node scripts/v1-proof-ast-security.mjs',
  'proof:v1:security-automation': 'node scripts/v1-proof-security-automation.mjs',
  'guard:file-size': 'node scripts/check-file-size-guard.mjs',
  'guard:assets': 'node scripts/check-asset-budget.mjs',
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

const requiredCiSnippets = [
  'Require launch proof secrets',
  'run: npm run lint -- --quiet',
  'run: npm run proof:v1:strict-pocket',
  'run: npm run guard:file-size',
  'run: npm run guard:assets',
  'run: npm run test:security',
  'run: npm run proof:v1:public-access-coverage',
  'run: npm run proof:v1:client-write-inventory',
  'run: npm run proof:v1:ast-security',
  'run: npm run proof:v1:security-automation',
  'run: npm run proof:v1:client-rls-matrix -- --require-live',
  'run: npm test',
  'run: npm run build',
  'run: npm run proof:v1:performance-budget',
  'run: npm run smoke:registry',
  'run: npm run smoke:csvmapper',
  'run: npm run smoke:checkin',
  'run: npm run smoke:messages',
  'run: npm run smoke:rsvp:strict',
];

for (const snippet of requiredCiSnippets) {
  if (!ciHardpass.includes(snippet)) {
    failures.push(`ci-hardpass.yml must include ${snippet}`);
  }
}

if (ciHardpass.includes('npm test &&')) {
  failures.push('ci-hardpass.yml should keep hardpass checks as named steps instead of chaining npm test with later checks.');
}

if (ciHardpass.includes('Skipping smoke:rsvp:strict')) {
  failures.push('ci-hardpass.yml must not soft-skip strict Supabase RSVP smoke.');
}

if (ciHardpass.includes("if: ${{ env.VITE_SUPABASE_URL != '' && env.VITE_SUPABASE_ANON_KEY != '' }}")) {
  failures.push('ci-hardpass.yml must require Supabase RSVP secrets instead of conditionally skipping strict smoke.');
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
