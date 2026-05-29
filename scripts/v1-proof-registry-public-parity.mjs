#!/usr/bin/env node

import { execSync } from 'node:child_process';

const commands = [
  'npm test -- --run src/pages/dashboard/registry/registryPublicParity.test.ts src/pages/dashboard/registry/registryService.test.ts src/sections/components/RegistrySection.test.tsx src/pages/dashboard/registry/RegistryDashboardRouteContent.test.tsx',
];

for (const command of commands) {
  execSync(command, { stdio: 'inherit', shell: '/bin/zsh' });
}
