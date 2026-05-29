#!/usr/bin/env node

import { execSync } from 'node:child_process';

const baseUrl = process.argv[2] || process.env.PLAYWRIGHT_BASE_URL || 'https://dayof.love';

const commands = [
  'npm test -- --run src/lib/publicBuilderV2Runtime.test.ts src/lib/publicBuilderV2WeddingData.test.ts src/lib/publicSiteProject.test.ts src/pages/SiteView.test.ts',
  `PLAYWRIGHT_BASE_URL=${JSON.stringify(baseUrl)} npm run test:e2e:public-quality`,
];

for (const command of commands) {
  execSync(command, { stdio: 'inherit', shell: '/bin/zsh' });
}
