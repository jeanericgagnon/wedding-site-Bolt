import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_TIMEOUT_MS = 75_000;
const timeoutMs = Number.parseInt(process.env.DAYOF_FOCUSED_VITEST_TIMEOUT_MS || '', 10) || DEFAULT_TIMEOUT_MS;
const filters = process.argv.slice(2);

if (filters.length === 0) {
  console.error('[dayof-vitest] Provide at least one test file or Vitest filter.');
  process.exit(1);
}

const onboardingContentFilters = new Set([
  'src/pages/onboarding/quickStartContent.test.ts',
  'src/pages/onboarding/onboardingSurfaceContent.test.ts',
]);
const isOnboardingContentProof = filters.length === onboardingContentFilters.size
  && filters.every((filter) => onboardingContentFilters.has(filter));

const isDatalessFile = (filePath) => {
  try {
    const stats = spawn('stat', ['-f', '%z\t%b', filePath], { shell: false });
    let output = '';
    stats.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    return new Promise((resolveDataless) => {
      stats.on('exit', (code) => {
        if (code !== 0) {
          resolveDataless(false);
          return;
        }
        const [sizeText, blocksText] = output.trim().split('\t');
        resolveDataless(Number(sizeText) > 0 && Number(blocksText) === 0);
      });
    });
  } catch {
    return Promise.resolve(false);
  }
};

if (isOnboardingContentProof) {
  const localVitestEntry = resolve(process.cwd(), 'node_modules/vitest/dist/node.js');
  const shouldUseTempOnboardingProof = !existsSync(localVitestEntry) || await isDatalessFile(localVitestEntry);

  if (shouldUseTempOnboardingProof) {
    const fallback = spawn('node', ['scripts/proof-onboarding-content-temp.mjs'], {
      stdio: 'inherit',
      shell: false,
      env: process.env,
    });

    fallback.on('exit', (code, signal) => {
      if (signal) {
        console.error(`[dayof-vitest] Onboarding temp proof exited via signal ${signal}.`);
        process.exit(1);
      }
      process.exit(code ?? 1);
    });
  } else {
    runLocalVitest();
  }
} else {
  runLocalVitest();
}

function runLocalVitest() {
  const args = [
    'vitest',
    'run',
    ...filters,
    '--pool=forks',
    '--maxWorkers=1',
    '--no-file-parallelism',
    '--reporter=verbose',
    '--reporter=hanging-process',
  ];

  console.log(`[dayof-vitest] npx ${args.join(' ')}`);
  console.log(`[dayof-vitest] timeout ${timeoutMs}ms`);

  const child = spawn('npx', args, {
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });

  let timedOut = false;

  const timeout = setTimeout(() => {
    timedOut = true;
    console.error('\n[dayof-vitest] Vitest did not finish before the focused-run timeout.');
    console.error('[dayof-vitest] In this Codex desktop session, that usually means the Vitest worker pool failed to start.');
    console.error('[dayof-vitest] Retry after clearing stale Node/Vitest processes, or run the same filters outside the constrained desktop process pool.');
    child.kill('SIGTERM');

    setTimeout(() => {
      if (!child.killed) child.kill('SIGKILL');
    }, 5_000).unref();
  }, timeoutMs);

  child.on('exit', (code, signal) => {
    clearTimeout(timeout);
    if (timedOut) {
      process.exit(124);
    }
    if (signal) {
      console.error(`[dayof-vitest] Vitest exited via signal ${signal}.`);
      process.exit(1);
    }
    process.exit(code ?? 1);
  });
}
