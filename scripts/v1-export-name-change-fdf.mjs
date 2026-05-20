#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

function usage() {
  return [
    'Usage:',
    '  node scripts/v1-export-name-change-fdf.mjs --input /path/dayof-name-change-draft-output-payload.json --outdir /tmp/name-change-fdf',
    '',
    'Input must be the safe review-only draft JSON from the DayOf name-change Draft output payload panel.',
  ].join('\n');
}

function parseArgs(argv) {
  const parsed = {
    inputPath: null,
    outputDir: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--input') {
      parsed.inputPath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--outdir') {
      parsed.outputDir = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (!parsed.inputPath) {
      parsed.inputPath = arg;
      continue;
    }
    if (!parsed.outputDir) {
      parsed.outputDir = arg;
    }
  }

  return parsed;
}

function escapePdfLiteral(value) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
}

function sanitizeFilePart(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'name-change-form';
}

function buildFdfText(assignments) {
  const fields = assignments.map((assignment) => (
    `<< /T (${escapePdfLiteral(assignment.pdfFieldName)}) /V (${escapePdfLiteral(assignment.value)}) >>`
  ));

  return [
    '%FDF-1.2',
    '1 0 obj',
    '<<',
    '/FDF <<',
    '/Fields [',
    ...fields,
    ']',
    '>>',
    '>>',
    'endobj',
    'trailer',
    '<< /Root 1 0 R >>',
    '%%EOF',
  ].join('\n');
}

function validateDraftPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Draft payload must be a JSON object.');
  }
  if (payload.reviewOnly !== true || payload.safePayload !== true) {
    throw new Error('Draft payload must include reviewOnly: true and safePayload: true.');
  }
  if (!Array.isArray(payload.items)) {
    throw new Error('Draft payload must include an items array.');
  }
}

function getReadyAssignments(item) {
  if (item.status !== 'ready') return [];
  if (!Array.isArray(item.assignments)) return [];

  return item.assignments.map((assignment) => {
    if (assignment?.redactionPolicy !== 'none') {
      throw new Error(`${item.formCode ?? 'Unknown form'} includes a non-exportable sensitive assignment.`);
    }
    if (typeof assignment.pdfFieldName !== 'string' || !assignment.pdfFieldName.trim()) {
      throw new Error(`${item.formCode ?? 'Unknown form'} has an assignment without a PDF field name.`);
    }
    if (typeof assignment.value !== 'string') {
      throw new Error(`${item.formCode ?? 'Unknown form'} has an assignment without a string value.`);
    }

    return {
      fieldKey: String(assignment.fieldKey ?? ''),
      officialFieldLabel: String(assignment.officialFieldLabel ?? assignment.fieldKey ?? ''),
      pdfFieldName: assignment.pdfFieldName,
      value: assignment.value,
    };
  });
}

function getFileName(item) {
  return `dayof-${sanitizeFilePart(`${item.formCode}-${item.officialRevisionLabel}`)}.fdf`;
}

async function exportFdfFiles(payload, outputDir) {
  const absoluteOutputDir = resolve(outputDir);
  await mkdir(absoluteOutputDir, { recursive: true });

  const exports = [];
  const skipped = [];

  for (const item of payload.items) {
    if (item.status !== 'ready') {
      skipped.push({
        formCode: item.formCode ?? 'UNKNOWN',
        status: item.status ?? 'unknown',
        reason: item.blockers?.[0]?.reason ?? item.nextAction ?? 'Form is not ready for FDF export.',
      });
      continue;
    }

    const assignments = getReadyAssignments(item);
    if (assignments.length === 0) {
      skipped.push({
        formCode: item.formCode ?? 'UNKNOWN',
        status: 'blocked',
        reason: 'Ready item did not include any safe assignments.',
      });
      continue;
    }

    const fdfFileName = getFileName(item);
    const fdfPath = join(absoluteOutputDir, fdfFileName);
    await writeFile(fdfPath, buildFdfText(assignments), 'utf8');
    exports.push({
      formCode: item.formCode,
      formLabel: item.formLabel,
      officialRevisionLabel: item.officialRevisionLabel,
      assignmentCount: assignments.length,
      fdfFileName,
      fdfPath,
      fillCommandTemplate: `pdftk OFFICIAL_${item.formCode}.pdf fill_form ${fdfFileName} output REVIEW_DRAFT_${item.formCode}.pdf flatten`,
    });
  }

  const manifest = {
    reviewOnly: true,
    generatedAt: new Date().toISOString(),
    source: 'DayOf name-change safe draft payload',
    outputDir: absoluteOutputDir,
    summary: {
      totalForms: payload.items.length,
      exportedFdfFiles: exports.length,
      skippedForms: skipped.length,
      assignments: exports.reduce((sum, item) => sum + item.assignmentCount, 0),
    },
    exports,
    skipped,
  };
  const manifestPath = join(absoluteOutputDir, 'dayof-name-change-fdf-export-manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  return {
    ...manifest,
    manifestPath,
  };
}

async function main() {
  const { inputPath, outputDir } = parseArgs(process.argv.slice(2));
  if (!inputPath || !outputDir) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  const rawPayload = await readFile(inputPath, 'utf8');
  const payload = JSON.parse(rawPayload);
  validateDraftPayload(payload);
  const manifest = await exportFdfFiles(payload, outputDir);

  console.log(JSON.stringify({
    reviewOnly: true,
    inputFile: basename(inputPath),
    manifestPath: manifest.manifestPath,
    summary: manifest.summary,
  }, null, 2));
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
