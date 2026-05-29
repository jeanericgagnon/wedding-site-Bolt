#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const testArgs = [
  'test',
  '--',
  '--run',
  'src/lib/smsLaunchReadiness.test.ts',
  'src/lib/sendBulkMessageSafety.test.ts',
  'src/lib/stripeCreateSmsCreditsSafety.test.ts',
  'src/pages/Home.test.tsx',
  'src/pages/Product.test.tsx',
  'src/pages/Trust.test.tsx',
  'src/pages/features/Messaging.test.tsx',
  'src/pages/dashboard/messagesSmsLock.test.ts',
];

const result = spawnSync('npm', testArgs, {
  stdio: 'inherit',
  cwd: process.cwd(),
  env: process.env,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log('proof:v1:sms-disabled-state PASS');
