#!/usr/bin/env node

import { execFileSync } from 'node:child_process';

const requireLive = process.argv.includes('--require-live');

if (process.env.V1_SUBDOMAIN_ROUTE_LIVE !== '1') {
  const output = {
    ok: false,
    blocked: true,
    proof: 'subdomain-route-live',
    generatedAt: new Date().toISOString(),
    missingEnv: ['V1_SUBDOMAIN_ROUTE_LIVE=1'],
    message: 'Run V1_SUBDOMAIN_ROUTE_LIVE=1 npm run proof:v1:subdomain-route to verify the live .dayof.love host-routing lane.',
  };
  console.log(JSON.stringify(output, null, 2));
  if (requireLive) process.exit(1);
  process.exit(0);
}

try {
  execFileSync('npx', ['playwright', 'test', '--workers=1', 'tests/e2e/subdomain-route-live.spec.ts'], {
    stdio: 'inherit',
    env: process.env,
    maxBuffer: 20 * 1024 * 1024,
  });
  console.log(JSON.stringify({
    ok: true,
    blocked: false,
    proof: 'subdomain-route-live',
    generatedAt: new Date().toISOString(),
    host: process.env.V1_SUBDOMAIN_ROUTE_HOST || 'testandkaras.dayof.love',
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    blocked: false,
    proof: 'subdomain-route-live',
    generatedAt: new Date().toISOString(),
    host: process.env.V1_SUBDOMAIN_ROUTE_HOST || 'testandkaras.dayof.love',
    exitCode: typeof error?.status === 'number' ? error.status : 1,
    message: error instanceof Error ? error.message : 'subdomain live proof failed',
  }, null, 2));
  process.exit(1);
}
