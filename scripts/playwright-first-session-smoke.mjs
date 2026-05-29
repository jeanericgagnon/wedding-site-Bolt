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

execSync(cmd, { stdio: 'inherit', shell: '/bin/zsh' });
