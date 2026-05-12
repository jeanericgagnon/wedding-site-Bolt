#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const projectRoot = path.resolve(cwd);
const guardDir = path.join(projectRoot, '.tmp');
const lockDir = path.join(guardDir, 'deploy-prod.lock');
const stateFile = path.join(guardDir, 'deploy-prod-state.json');

const FORCE_DEPLOY = process.env.FORCE_DEPLOY === '1' || process.env.FORCE_DEPLOY === 'true';
const COOLDOWN_MS = Number.parseInt(process.env.DEPLOY_COOLDOWN_MS ?? '300000', 10); // 5 min default
const POSTDEPLOY_PROOF_BYPASS_REQUESTED =
  process.env.SKIP_POSTDEPLOY_PROOF === '1' || process.env.SKIP_POSTDEPLOY_PROOF === 'true';
const POSTDEPLOY_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://dayof.love';

function run(cmd, opts = {}) {
  return execSync(cmd, {
    cwd: projectRoot,
    stdio: 'inherit',
    ...opts,
  });
}

function ensureDirExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadState() {
  if (!fs.existsSync(stateFile)) return null;
  try {
    const raw = fs.readFileSync(stateFile, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeState(state) {
  ensureDirExists(guardDir);
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

function lockAcquired() {
  ensureDirExists(guardDir);
  try {
    fs.mkdirSync(lockDir, { recursive: false });
  } catch (err) {
    if (err.code === 'EEXIST') {
      return false;
    }
    throw err;
  }
  return true;
}

function releaseLock() {
  if (fs.existsSync(lockDir)) {
    fs.rmSync(lockDir, { recursive: true, force: true });
  }
}

function getGitHead() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: projectRoot, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function runPostdeployProof() {
  if (POSTDEPLOY_PROOF_BYPASS_REQUESTED) {
    throw new Error('SKIP_POSTDEPLOY_PROOF is no longer supported. Postdeploy proof is mandatory.');
  }

  console.log(`deploy-prod:postdeploy proof starting baseUrl=${POSTDEPLOY_BASE_URL}`);
  run('npm run proof:v1:postdeploy', {
    env: {
      ...process.env,
      PLAYWRIGHT_BASE_URL: POSTDEPLOY_BASE_URL,
    },
  });
  console.log('deploy-prod:postdeploy proof passed.');
}

(async () => {
  ensureDirExists(guardDir);
  const now = Date.now();

  const lockFile = path.join(lockDir, 'meta.json');
  if (!FORCE_DEPLOY) {
    const existingState = loadState();
    if (existingState?.lastRunAt && existingState?.lastExitCode === 0) {
      if (now - existingState.lastRunAt < COOLDOWN_MS) {
        const remaining = Math.ceil((COOLDOWN_MS - (now - existingState.lastRunAt)) / 1000);
        console.log(`Duplicate deploy suppression: cool-down active (${remaining}s remaining).`);
        console.log(`Set FORCE_DEPLOY=1 to bypass.`);
        process.exit(0);
      }
    }
  }

  if (!lockAcquired()) {
    if (FORCE_DEPLOY) {
      const lockInfo = fs.existsSync(lockFile)
        ? fs.readFileSync(lockFile, 'utf8')
        : 'No lock metadata available';
      console.log('FORCE_DEPLOY=1: clearing existing deploy lock.');
      console.log(`Existing lock info: ${lockInfo}`);
      releaseLock();
      if (lockAcquired()) {
        // Continue with the fresh lock acquired below.
      } else {
        console.log('Deployment suppressed: could not acquire lock after force clearing.');
        process.exit(0);
      }
    } else {
      const pid = process.env.DEPLOY_LOCK_CLAIMANT_PID || 'unknown';
      const lockInfo = fs.existsSync(lockFile)
        ? fs.readFileSync(lockFile, 'utf8')
        : 'No lock metadata available';
      console.log('Deployment suppressed: another deploy process is active.');
      console.log(`Existing lock info: ${lockInfo}`);
      console.log(`Lock claimant pid hint: ${pid}`);
      console.log('Set FORCE_DEPLOY=1 to bypass (not recommended without manual confirmation).');
      process.exit(0);
    }
  }

  let exitCode = 1;
  try {
    const commit = getGitHead();
    const lockPayload = {
      pid: process.pid,
      startedAt: now,
      startedAtIso: new Date(now).toISOString(),
      commit,
      branch: process.env.GITHUB_REF_NAME || 'unknown',
    };

    fs.writeFileSync(path.join(lockDir, 'meta.json'), JSON.stringify(lockPayload, null, 2));

    console.log(`deploy-prod:starting commit=${commit}`);
    run('npm run proof:v1:ai-rollout');
    run('npm run verify');

    let deployOutput = '';
    try {
      // Keep stdout visible while capturing output for optional future guarding.
      deployOutput = execSync('npx vercel --prod --yes --scope eric-gagnons-projects', {
        cwd: projectRoot,
        encoding: 'utf8',
      });
      console.log(deployOutput);
      runPostdeployProof();
      exitCode = 0;
    } finally {
      writeState({
        lastRunAt: Date.now(),
        lastCommit: commit,
        lastExitCode: exitCode,
        lastOutput: typeof deployOutput === 'string' ? deployOutput.slice(-5000) : '',
      });
    }

    process.exit(0);
  } catch (err) {
    writeState({
      lastRunAt: Date.now(),
      lastCommit: getGitHead(),
      lastExitCode: 1,
      lastError: String(err && err.message ? err.message : err),
    });
    console.error(`deploy-prod: failed -> ${err && err.message ? err.message : err}`);
    process.exit(1);
  } finally {
    releaseLock();
  }
})();
