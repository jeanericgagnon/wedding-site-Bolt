#!/usr/bin/env node

import { execSync } from 'node:child_process';

const baseUrl = process.argv[2] || process.env.PLAYWRIGHT_BASE_URL || 'https://dayof.love';
const cmd = `PLAYWRIGHT_BASE_URL=${JSON.stringify(baseUrl)} npx playwright test --workers=1 tests/e2e/guest-happy-path-mobile.spec.ts`;

execSync(cmd, { stdio: 'inherit', shell: '/bin/zsh' });
