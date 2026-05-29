#!/usr/bin/env node

import { execSync } from 'node:child_process';

const baseUrl = process.argv[2] || process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const isLocalBaseUrl = /127\.0\.0\.1|localhost/i.test(baseUrl);
const command = [
  `PLAYWRIGHT_BASE_URL=${JSON.stringify(baseUrl)}`,
  'npx playwright test --workers=1',
  'tests/e2e/public-site-quality.spec.ts',
  'tests/e2e/guest-happy-path-mobile.spec.ts',
  'tests/e2e/mobile-core-smoke.spec.ts',
  'tests/e2e/builder-cutover-local-auth.spec.ts',
  'tests/e2e/accessibility-core-forms.spec.ts',
].join(' ');

async function assertLocalBaseUrlReady(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1_500) });
    if (response.ok) return;
    throw new Error(`received HTTP ${response.status}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Whole-product polish proof requires a running preview/dev server at ${url}. Start the local runtime first, then rerun this proof. (${detail})`,
    );
  }
}

if (isLocalBaseUrl) {
  await assertLocalBaseUrlReady(baseUrl);
}

execSync(command, { stdio: 'inherit', shell: '/bin/zsh' });
