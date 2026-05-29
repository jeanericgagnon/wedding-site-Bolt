#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { resolvePreviewRuntime, stopPreviewRuntime } from './proofPreviewRuntime.mjs';

const PREVIEW_URL = 'http://127.0.0.1:4176';
const requestedBaseUrl = process.argv[2] || process.env.PLAYWRIGHT_BASE_URL || PREVIEW_URL;

const unitCommand = [
  'npm test -- --run',
  'src/pages/PhotoUpload.test.tsx',
  'src/pages/VaultContribute.test.ts',
  'src/lib/photoUploadSafety.test.ts',
  'src/lib/memoryCurator.test.ts',
  'src/pages/dashboard/guestPhotoModerationTargets.test.ts',
  'src/pages/vaultContributionPaths.test.ts',
].join(' ');

const previewRuntime = await resolvePreviewRuntime({
  preferredPort: 4176,
  requestedBaseUrl,
  cwd: process.cwd(),
  startupTimeoutMs: 120_000,
});

const baseUrl = previewRuntime.baseUrl;

try {
  execSync(unitCommand, { stdio: 'inherit', shell: '/bin/zsh' });
  execSync('npm run build', { stdio: 'inherit', shell: '/bin/zsh' });
  execSync(
    `PLAYWRIGHT_BASE_URL=${JSON.stringify(baseUrl)} npx playwright test --workers=1 tests/e2e/photo-memory-flow.spec.ts`,
    { stdio: 'inherit', shell: '/bin/zsh' },
  );
} finally {
  await stopPreviewRuntime(previewRuntime.previewProcess);
}
