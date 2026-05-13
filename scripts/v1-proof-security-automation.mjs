#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';

const files = {
  dependabot: '.github/dependabot.yml',
  semgrepConfig: '.semgrep/dayof-security.yml',
  semgrepWorkflow: '.github/workflows/semgrep.yml',
  codeqlWorkflow: '.github/workflows/codeql.yml',
  gitleaksWorkflow: '.github/workflows/gitleaks.yml',
  ciHardpass: '.github/workflows/ci-hardpass.yml',
  releaseGate: '.github/workflows/release-launch-gate.yml',
  packageJson: 'package.json',
};

const failures = [];

for (const [name, path] of Object.entries(files)) {
  if (!existsSync(path)) failures.push(`Missing ${name} file: ${path}`);
}

const dependabot = existsSync(files.dependabot) ? readFileSync(files.dependabot, 'utf8') : '';
const semgrepConfig = existsSync(files.semgrepConfig) ? readFileSync(files.semgrepConfig, 'utf8') : '';
const semgrepWorkflow = existsSync(files.semgrepWorkflow) ? readFileSync(files.semgrepWorkflow, 'utf8') : '';
const codeqlWorkflow = existsSync(files.codeqlWorkflow) ? readFileSync(files.codeqlWorkflow, 'utf8') : '';
const gitleaksWorkflow = existsSync(files.gitleaksWorkflow) ? readFileSync(files.gitleaksWorkflow, 'utf8') : '';
const ciHardpass = existsSync(files.ciHardpass) ? readFileSync(files.ciHardpass, 'utf8') : '';
const releaseGate = existsSync(files.releaseGate) ? readFileSync(files.releaseGate, 'utf8') : '';
const packageJson = existsSync(files.packageJson) ? JSON.parse(readFileSync(files.packageJson, 'utf8')) : { scripts: {} };

for (const snippet of ['package-ecosystem: "npm"', 'package-ecosystem: "github-actions"']) {
  if (!dependabot.includes(snippet)) failures.push(`dependabot.yml missing ${snippet}`);
}

for (const snippet of [
  'id: dayof-client-direct-supabase-write',
  'id: dayof-client-no-service-role',
  'id: dayof-no-dangerously-set-inner-html',
  'id: dayof-protected-route-no-storage-auth-bypass',
  'id: dayof-internal-tooling-route-must-stay-centralized',
]) {
  if (!semgrepConfig.includes(snippet)) failures.push(`dayof-security.yml missing ${snippet}`);
}

for (const [source, workflow] of [
  ['semgrep/semgrep-action@v1', semgrepWorkflow],
  ['github/codeql-action/init@v4', codeqlWorkflow],
  ['github/codeql-action/analyze@v4', codeqlWorkflow],
  ['gitleaks/gitleaks-action@v2', gitleaksWorkflow],
]) {
  if (!workflow.includes(source)) failures.push(`Security automation workflow missing ${source}`);
}

if (packageJson.scripts?.['proof:v1:security-automation'] !== 'node scripts/v1-proof-security-automation.mjs') {
  failures.push('package.json must expose proof:v1:security-automation.');
}

for (const workflow of [ciHardpass, releaseGate]) {
  if (!workflow.includes('npm run proof:v1:security-automation')) {
    failures.push('Launch workflows must run npm run proof:v1:security-automation.');
  }
}

if (!String(packageJson.scripts?.['test:launch'] ?? '').includes('npm run proof:v1:security-automation')) {
  failures.push('test:launch must include npm run proof:v1:security-automation.');
}

const result = {
  ok: failures.length === 0,
  blocked: false,
  slice: 'security-automation',
  generatedAt: new Date().toISOString(),
  summary: failures.length === 0
    ? 'Dependabot, Semgrep, CodeQL, secret scanning, and launch-proof wiring are present.'
    : 'Security automation wiring is incomplete.',
  failures,
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
