#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptDir = dirname(fileURLToPath(import.meta.url));

function usage() {
  return [
    'Usage:',
    '  node scripts/v1-build-name-change-pdf-adapter-catalog-from-selections.mjs --template /tmp/name-change-pdf-adapter-template.json --selections /tmp/name-change-pdf-adapter-template.selections.json --outdir /tmp/name-change-pdf-adapter-promotion --last-mapped-at 2026-05-20',
    '',
    'Applies compact reviewer selections, validates the reviewed template, and promotes a safe template to a reusable adapter catalog.',
  ].join('\n');
}

function parseArgs(argv) {
  const parsed = {
    templatePath: null,
    selectionsPath: null,
    outputDir: null,
    lastMappedAt: new Date().toISOString().slice(0, 10),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--template') {
      parsed.templatePath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--selections') {
      parsed.selectionsPath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--outdir') {
      parsed.outputDir = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--last-mapped-at') {
      parsed.lastMappedAt = argv[index + 1] ?? parsed.lastMappedAt;
      index += 1;
    }
  }

  return parsed;
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readJsonIfExists(path) {
  if (!(await fileExists(path))) return null;
  return JSON.parse(await readFile(path, 'utf8'));
}

async function runNodeScript(scriptName, args) {
  const scriptPath = join(scriptDir, scriptName);

  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath, ...args], {
      maxBuffer: 1024 * 1024 * 10,
    });

    return {
      ok: true,
      code: 0,
      stdout: stdout.trim(),
      stderr: stderr.trim() || null,
    };
  } catch (error) {
    return {
      ok: false,
      code: typeof error?.code === 'number' ? error.code : 1,
      stdout: typeof error?.stdout === 'string' ? error.stdout.trim() : '',
      stderr: typeof error?.stderr === 'string' && error.stderr.trim() ? error.stderr.trim() : String(error?.message ?? error),
    };
  }
}

function getStepStatus(result) {
  if (!result) return 'skipped';
  return result.ok ? 'passed' : 'failed';
}

function getManifestStatus(steps) {
  return steps.every((step) => step.status === 'passed' || step.status === 'skipped') ? 'passed' : 'failed';
}

async function writeManifest({
  manifestPath,
  status,
  inputs,
  files,
  steps,
}) {
  const selectionReport = await readJsonIfExists(files.selectionReportPath);
  const validationReport = await readJsonIfExists(files.validationReportPath);
  const catalog = await readJsonIfExists(files.catalogPath);
  const manifest = {
    reviewOnly: true,
    generatedAt: new Date().toISOString(),
    source: 'DayOf name-change PDF adapter catalog promotion',
    status,
    inputs,
    files,
    steps,
    summary: {
      selection: selectionReport?.summary ?? null,
      validation: validationReport?.summary ?? null,
      catalog: catalog?.summary ?? null,
    },
  };

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  return manifest;
}

async function main() {
  const { templatePath, selectionsPath, outputDir, lastMappedAt } = parseArgs(process.argv.slice(2));
  if (!templatePath || !selectionsPath || !outputDir) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  const absoluteTemplatePath = resolve(templatePath);
  const absoluteSelectionsPath = resolve(selectionsPath);
  const absoluteOutputDir = resolve(outputDir);
  const reviewedTemplatePath = join(absoluteOutputDir, 'name-change-pdf-adapter-template.reviewed.json');
  const selectionReportPath = join(absoluteOutputDir, 'name-change-pdf-adapter-selection-report.json');
  const selectionReportIndexPath = join(absoluteOutputDir, 'name-change-pdf-adapter-selection-report.html');
  const validationReportPath = join(absoluteOutputDir, 'name-change-pdf-adapter-template-validation.json');
  const validationReportIndexPath = join(absoluteOutputDir, 'name-change-pdf-adapter-template-validation.html');
  const catalogPath = join(absoluteOutputDir, 'name-change-pdf-adapter-catalog.json');
  const manifestPath = join(absoluteOutputDir, 'name-change-pdf-adapter-promotion-manifest.json');

  await mkdir(absoluteOutputDir, { recursive: true });

  const files = {
    reviewedTemplatePath,
    selectionReportPath,
    selectionReportIndexPath,
    validationReportPath,
    validationReportIndexPath,
    catalogPath,
    manifestPath,
  };
  const inputs = {
    templatePath: absoluteTemplatePath,
    selectionsPath: absoluteSelectionsPath,
    lastMappedAt,
  };
  const steps = [];

  const applyResult = await runNodeScript('v1-apply-name-change-pdf-adapter-selections.mjs', [
    '--template',
    absoluteTemplatePath,
    '--selections',
    absoluteSelectionsPath,
    '--output',
    reviewedTemplatePath,
    '--report',
    selectionReportPath,
    '--index',
    selectionReportIndexPath,
  ]);
  steps.push({
    step: 'apply_selections',
    status: getStepStatus(applyResult),
    code: applyResult.code,
    stderr: applyResult.stderr,
  });

  if (!applyResult.ok) {
    const manifest = await writeManifest({
      manifestPath,
      status: 'failed',
      inputs,
      files,
      steps,
    });
    console.log(JSON.stringify({
      reviewOnly: true,
      status: manifest.status,
      manifestPath,
      summary: manifest.summary,
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  const validateResult = await runNodeScript('v1-validate-name-change-pdf-adapter-template.mjs', [
    '--template',
    reviewedTemplatePath,
    '--output',
    validationReportPath,
    '--index',
    validationReportIndexPath,
  ]);
  steps.push({
    step: 'validate_reviewed_template',
    status: getStepStatus(validateResult),
    code: validateResult.code,
    stderr: validateResult.stderr,
  });

  if (!validateResult.ok) {
    const manifest = await writeManifest({
      manifestPath,
      status: 'failed',
      inputs,
      files,
      steps,
    });
    console.log(JSON.stringify({
      reviewOnly: true,
      status: manifest.status,
      manifestPath,
      summary: manifest.summary,
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  const catalogResult = await runNodeScript('v1-build-name-change-pdf-adapter-catalog.mjs', [
    '--template',
    reviewedTemplatePath,
    '--output',
    catalogPath,
    '--last-mapped-at',
    lastMappedAt,
  ]);
  steps.push({
    step: 'build_catalog',
    status: getStepStatus(catalogResult),
    code: catalogResult.code,
    stderr: catalogResult.stderr,
  });

  const manifest = await writeManifest({
    manifestPath,
    status: getManifestStatus(steps),
    inputs,
    files,
    steps,
  });

  console.log(JSON.stringify({
    reviewOnly: true,
    status: manifest.status,
    outputDir: absoluteOutputDir,
    catalogPath: (await fileExists(catalogPath)) ? catalogPath : null,
    manifestPath,
    summary: manifest.summary,
  }, null, 2));

  if (manifest.status !== 'passed') {
    process.exitCode = 1;
  }
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
