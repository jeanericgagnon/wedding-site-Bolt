#!/usr/bin/env node

import { execSync } from 'node:child_process';

const baseUrl = process.argv[2] || process.env.PLAYWRIGHT_BASE_URL || 'https://dayof.love';
const isLocal = /127\.0\.0\.1|localhost/i.test(baseUrl);
const specs = [
  'tests/e2e/live-smoke.spec.ts',
  ...(isLocal ? ['tests/e2e/builder-cutover-local-auth.spec.ts'] : []),
].join(' ');
const grep = isLocal
  ? '"builder route|builder guide|default builder alias|builder guide alias|builder cutover signed local smoke"'
  : '"builder route|builder guide|default builder alias|builder guide alias"';
const cmd = `PLAYWRIGHT_BASE_URL=${JSON.stringify(baseUrl)} npx playwright test ${specs} --grep ${grep}`;

execSync(cmd, { stdio: 'inherit', shell: '/bin/zsh' });
