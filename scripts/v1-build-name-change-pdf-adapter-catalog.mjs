#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function usage() {
  return [
    'Usage:',
    '  node scripts/v1-build-name-change-pdf-adapter-catalog.mjs --template /path/name-change-pdf-adapter-template.json --output /tmp/name-change-pdf-adapter-catalog.json',
    '',
    'Before running, fill selectedPdfFieldName for each reviewed field after checking the official PDF visually.',
  ].join('\n');
}

function parseArgs(argv) {
  const parsed = {
    templatePath: null,
    outputPath: null,
    lastMappedAt: new Date().toISOString().slice(0, 10),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--template') {
      parsed.templatePath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--output') {
      parsed.outputPath = argv[index + 1] ?? null;
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

function validateTemplatePayload(payload) {
  if (!payload || typeof payload !== 'object' || payload.reviewOnly !== true || !Array.isArray(payload.items)) {
    throw new Error('Adapter template must be reviewOnly JSON with an items array.');
  }
}

function getKnownPdfFieldNames(field, item) {
  return new Set([
    ...(field.candidatePdfFields ?? []).map((candidate) => candidate.pdfFieldName),
    ...(item.unmappedPdfFieldNames ?? []),
  ]);
}

function isReviewDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getFieldIssue(field, item) {
  if (!field.selectedPdfFieldName) {
    return {
      formCode: item.formCode,
      fieldKey: field.fieldKey,
      reason: `${field.officialFieldLabel} needs a selected PDF field name.`,
    };
  }
  if (!getKnownPdfFieldNames(field, item).has(field.selectedPdfFieldName)) {
    return {
      formCode: item.formCode,
      fieldKey: field.fieldKey,
      reason: `${field.officialFieldLabel} is mapped to ${field.selectedPdfFieldName}, which was not present in the PDF probe output.`,
    };
  }
  if (field.visualReviewConfirmed !== true) {
    return {
      formCode: item.formCode,
      fieldKey: field.fieldKey,
      reason: `${field.officialFieldLabel} must be visually confirmed against the official PDF before catalog promotion.`,
    };
  }
  if (!isReviewDate(field.reviewedAt)) {
    return {
      formCode: item.formCode,
      fieldKey: field.fieldKey,
      reason: `${field.officialFieldLabel} needs reviewedAt in YYYY-MM-DD format before catalog promotion.`,
    };
  }

  return null;
}

function getDuplicateFieldIssues(item) {
  const fieldsBySelectedName = new Map();
  for (const field of item.fields ?? []) {
    if (!field.selectedPdfFieldName) continue;
    const fields = fieldsBySelectedName.get(field.selectedPdfFieldName) ?? [];
    fields.push(field);
    fieldsBySelectedName.set(field.selectedPdfFieldName, fields);
  }

  return Array.from(fieldsBySelectedName.entries()).flatMap(([selectedPdfFieldName, fields]) => {
    if (fields.length < 2) return [];

    return [{
      formCode: item.formCode,
      fieldKey: fields.map((field) => field.fieldKey).join(', '),
      reason: `${selectedPdfFieldName} is selected for multiple DayOf fields: ${fields.map((field) => field.officialFieldLabel).join(', ')}.`,
    }];
  });
}

function getTemplateIssues(reviewedItems) {
  return reviewedItems.flatMap((item) => [
    ...(item.fields ?? [])
      .map((field) => getFieldIssue(field, item))
      .filter(Boolean),
    ...getDuplicateFieldIssues(item),
  ]);
}

function uniq(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeFieldMappings(fieldMappings) {
  const seen = new Set();
  return fieldMappings.filter((mapping) => {
    if (!mapping.fieldKey || !mapping.pdfFieldName) return false;
    if (seen.has(mapping.fieldKey)) return false;
    seen.add(mapping.fieldKey);
    return true;
  });
}

function buildCatalog(templatePayload, lastMappedAt) {
  const reviewedItems = templatePayload.items.filter((item) => item.status === 'ready_for_review');
  const issues = getTemplateIssues(reviewedItems);

  if (issues.length > 0) {
    return {
      reviewOnly: true,
      summary: {
        reviewedForms: reviewedItems.length,
        catalogAdapters: 0,
        mappedFields: 0,
        issues: issues.length,
      },
      issues,
      adapters: [],
    };
  }

  const adapters = reviewedItems.map((item) => ({
    formCode: item.formCode,
    officialRevisionLabel: item.officialRevisionLabel,
    probeSourceLabel: item.probeSourceLabel,
    lastMappedAt,
    fieldMappings: normalizeFieldMappings((item.fields ?? []).map((field) => ({
      fieldKey: field.fieldKey,
      pdfFieldName: field.selectedPdfFieldName,
      confidence: field.mappingConfidence ?? 'manual_review',
      reviewAudit: {
        visualReviewConfirmed: field.visualReviewConfirmed === true,
        reviewedAt: field.reviewedAt,
        reviewerNote: field.reviewerNote ?? null,
      },
      note: `Visually confirmed mapping for ${field.officialFieldLabel} on ${field.reviewedAt}. ${field.note ?? ''}`.trim(),
    }))),
    unmappedPdfFieldNames: uniq(item.unmappedPdfFieldNames ?? []),
  }));
  const summary = {
    reviewedForms: reviewedItems.length,
    catalogAdapters: adapters.length,
    mappedFields: adapters.reduce((sum, adapter) => sum + adapter.fieldMappings.length, 0),
    issues: 0,
  };

  return {
    reviewOnly: true,
    summary,
    issues: [],
    adapters,
  };
}

async function main() {
  const { templatePath, outputPath, lastMappedAt } = parseArgs(process.argv.slice(2));
  if (!templatePath || !outputPath) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  const templatePayload = JSON.parse(await readFile(templatePath, 'utf8'));
  validateTemplatePayload(templatePayload);
  const catalog = buildCatalog(templatePayload, lastMappedAt);

  if (catalog.issues.length > 0) {
    console.error(JSON.stringify({
      reviewOnly: true,
      summary: catalog.summary,
      issues: catalog.issues,
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  const absoluteOutputPath = resolve(outputPath);
  await writeFile(absoluteOutputPath, JSON.stringify(catalog, null, 2), 'utf8');

  console.log(JSON.stringify({
    reviewOnly: true,
    outputPath: absoluteOutputPath,
    summary: catalog.summary,
  }, null, 2));
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
