#!/usr/bin/env node

import { execSync } from 'node:child_process';

const baseUrl = process.argv[2] || process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const command = [
  `PLAYWRIGHT_BASE_URL=${JSON.stringify(baseUrl)}`,
  'npx playwright test --workers=1',
  'tests/e2e/public-site-quality.spec.ts',
  'tests/e2e/guest-happy-path-mobile.spec.ts',
  'tests/e2e/mobile-core-smoke.spec.ts',
  'tests/e2e/builder-cutover-local-auth.spec.ts',
  'tests/e2e/accessibility-core-forms.spec.ts',
].join(' ');

execSync(command, { stdio: 'inherit', shell: '/bin/zsh' });
