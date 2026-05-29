#!/usr/bin/env node

import { execSync } from 'node:child_process';

const baseUrl = process.argv[2] || process.env.PLAYWRIGHT_BASE_URL || 'https://dayof.love';
const isLocal = /127\.0\.0\.1|localhost/i.test(baseUrl);
const specs = [
  'tests/e2e/live-smoke.spec.ts',
  ...(isLocal ? ['tests/e2e/first-session-local-auth.spec.ts'] : []),
].join(' ');
const grep = isLocal
  ? '"homepage carries|product page exposes|signup page loads|quick-start preview stays reachable|first-session local smoke"'
  : '"homepage carries|product page exposes|signup page loads|quick-start preview stays reachable"';
const cmd = `PLAYWRIGHT_BASE_URL=${JSON.stringify(baseUrl)} npx playwright test ${specs} --grep ${grep}`;

async function assertLocalBaseUrlReady(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1_500) });
    if (response.ok) return;
    throw new Error(`received HTTP ${response.status}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Local first-session smoke requires a running preview/dev server at ${url}. Start the local runtime first, then rerun this proof. (${detail})`,
    );
  }
}

if (isLocal) {
  await assertLocalBaseUrlReady(baseUrl);
}

execSync(cmd, { stdio: 'inherit', shell: '/bin/zsh' });
