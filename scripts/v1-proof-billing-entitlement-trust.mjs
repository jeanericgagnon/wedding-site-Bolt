#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { resolvePreviewRuntime, stopPreviewRuntime } from './proofPreviewRuntime.mjs';

const PREVIEW_URL = 'http://127.0.0.1:4177';
const requestedBaseUrl = process.argv[2] || process.env.PLAYWRIGHT_BASE_URL || PREVIEW_URL;

const unitCommand = [
  'npm test -- --run',
  'src/pages/PaymentRequired.test.tsx',
  'src/pages/PaymentSuccess.test.tsx',
  'src/lib/paymentBypassCleanupParity.test.ts',
  'src/lib/paymentRequiredActiveCleanup.test.ts',
  'src/lib/paymentSuccessCleanup.test.ts',
  'src/lib/stripeServiceCopy.test.ts',
  'src/lib/stripeCreateCheckoutSafety.test.ts',
  'src/lib/stripeCreateSubscriptionSafety.test.ts',
  'src/lib/stripeCreateSmsCreditsSafety.test.ts',
  'src/lib/stripeVerifyCheckoutSessionSafety.test.ts',
].join(' ');

const previewRuntime = await resolvePreviewRuntime({
  preferredPort: 4177,
  requestedBaseUrl,
  cwd: process.cwd(),
  startupTimeoutMs: 120_000,
});

const baseUrl = previewRuntime.baseUrl;

try {
  execSync(unitCommand, { stdio: 'inherit', shell: '/bin/zsh' });
  execSync(
    `PLAYWRIGHT_BASE_URL=${JSON.stringify(baseUrl)} npx playwright test tests/e2e/live-smoke.spec.ts --grep "payment-required route falls back to login when auth is missing|quick-start preview stays reachable without auth when bypass preview is explicit"`,
    { stdio: 'inherit', shell: '/bin/zsh' },
  );
} finally {
  await stopPreviewRuntime(previewRuntime.previewProcess);
}
