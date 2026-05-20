#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

function usage() {
  return [
    'Usage:',
    '  node scripts/v1-validate-name-change-pdf-adapter-template.mjs --template /tmp/name-change-pdf-adapter-template.json',
    '  node scripts/v1-validate-name-change-pdf-adapter-template.mjs --template /tmp/name-change-pdf-adapter-template.json --output /tmp/name-change-pdf-adapter-template-validation.json --index /tmp/name-change-pdf-adapter-template-validation.html',
    '',
    'Validates reviewed PDF adapter templates before they are promoted to a reusable catalog.',
  ].join('\n');
}

function parseArgs(argv) {
  const parsed = {
    templatePath: null,
    outputPath: null,
    indexPath: null,
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
    if (arg === '--index') {
      parsed.indexPath = argv[index + 1] ?? null;
      index += 1;
    }
  }

  return parsed;
}

function getDefaultOutputPath(templatePath) {
  if (templatePath.endsWith('.json')) return `${templatePath.slice(0, -5)}.validation.json`;
  return join(dirname(templatePath), 'name-change-pdf-adapter-template-validation.json');
}

function getDefaultIndexPath(outputPath) {
  if (outputPath.endsWith('.json')) return `${outputPath.slice(0, -5)}.html`;
  return join(dirname(outputPath), 'name-change-pdf-adapter-template-validation.html');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

function buildMissingAndUnknownIssues(item) {
  return (item.fields ?? []).flatMap((field) => {
    if (!field.selectedPdfFieldName) {
      return [{
        code: 'missing_selected_pdf_field',
        severity: 'error',
        formCode: item.formCode,
        fieldKey: field.fieldKey,
        officialFieldLabel: field.officialFieldLabel,
        selectedPdfFieldName: null,
        message: `${field.officialFieldLabel} needs a selected PDF field name.`,
      }];
    }

    if (!getKnownPdfFieldNames(field, item).has(field.selectedPdfFieldName)) {
      return [{
        code: 'unknown_selected_pdf_field',
        severity: 'error',
        formCode: item.formCode,
        fieldKey: field.fieldKey,
        officialFieldLabel: field.officialFieldLabel,
        selectedPdfFieldName: field.selectedPdfFieldName,
        message: `${field.officialFieldLabel} is mapped to ${field.selectedPdfFieldName}, which was not present in the PDF probe output.`,
      }];
    }

    if (field.visualReviewConfirmed !== true) {
      return [{
        code: 'visual_review_not_confirmed',
        severity: 'error',
        formCode: item.formCode,
        fieldKey: field.fieldKey,
        officialFieldLabel: field.officialFieldLabel,
        selectedPdfFieldName: field.selectedPdfFieldName,
        message: `${field.officialFieldLabel} must be visually confirmed against the official PDF before promotion.`,
      }];
    }

    if (!isReviewDate(field.reviewedAt)) {
      return [{
        code: 'visual_review_date_missing',
        severity: 'error',
        formCode: item.formCode,
        fieldKey: field.fieldKey,
        officialFieldLabel: field.officialFieldLabel,
        selectedPdfFieldName: field.selectedPdfFieldName,
        message: `${field.officialFieldLabel} needs reviewedAt in YYYY-MM-DD format before promotion.`,
      }];
    }

    return [];
  });
}

function buildDuplicateIssues(item) {
  const fieldsBySelectedName = new Map();

  for (const field of item.fields ?? []) {
    if (!field.selectedPdfFieldName) continue;
    const selectedName = field.selectedPdfFieldName;
    const fields = fieldsBySelectedName.get(selectedName) ?? [];
    fields.push(field);
    fieldsBySelectedName.set(selectedName, fields);
  }

  return Array.from(fieldsBySelectedName.entries()).flatMap(([selectedPdfFieldName, fields]) => {
    if (fields.length < 2) return [];

    return [{
      code: 'duplicate_selected_pdf_field',
      severity: 'error',
      formCode: item.formCode,
      fieldKeys: fields.map((field) => field.fieldKey),
      officialFieldLabels: fields.map((field) => field.officialFieldLabel),
      selectedPdfFieldName,
      message: `${selectedPdfFieldName} is selected for multiple DayOf fields: ${fields.map((field) => field.officialFieldLabel).join(', ')}.`,
    }];
  });
}

function buildReviewNotes(item) {
  return (item.fields ?? []).flatMap((field) => {
    if (field.selectedPdfFieldName || (field.candidatePdfFields ?? []).length > 0) return [];

    return [{
      code: 'no_candidate_pdf_fields',
      severity: 'note',
      formCode: item.formCode,
      fieldKey: field.fieldKey,
      officialFieldLabel: field.officialFieldLabel,
      selectedPdfFieldName: null,
      message: `${field.officialFieldLabel} has no candidate PDF fields. Use the raw PDF field list if this field is still required.`,
    }];
  });
}

function validateTemplate(template) {
  const reviewedItems = template.items.filter((item) => item.status === 'ready_for_review');
  const issues = reviewedItems.flatMap((item) => [
    ...buildMissingAndUnknownIssues(item),
    ...buildDuplicateIssues(item),
    ...buildReviewNotes(item),
  ]);
  const errorCount = issues.filter((issue) => issue.severity === 'error').length;
  const selectedFields = reviewedItems.reduce((sum, item) => (
    sum + (item.fields ?? []).filter((field) => Boolean(field.selectedPdfFieldName)).length
  ), 0);
  const fieldsToMap = reviewedItems.reduce((sum, item) => sum + (item.fields ?? []).length, 0);

  return {
    reviewOnly: true,
    validatedAt: new Date().toISOString(),
    status: errorCount === 0 ? 'passed' : 'failed',
    summary: {
      reviewedForms: reviewedItems.length,
      fieldsToMap,
      selectedFields,
      missingSelections: issues.filter((issue) => issue.code === 'missing_selected_pdf_field').length,
      unknownSelections: issues.filter((issue) => issue.code === 'unknown_selected_pdf_field').length,
      unconfirmedSelections: issues.filter((issue) => issue.code === 'visual_review_not_confirmed').length,
      undatedConfirmedSelections: issues.filter((issue) => issue.code === 'visual_review_date_missing').length,
      duplicateSelections: issues.filter((issue) => issue.code === 'duplicate_selected_pdf_field').length,
      notes: issues.filter((issue) => issue.severity === 'note').length,
      errors: errorCount,
      readyToPromote: errorCount === 0 && reviewedItems.length > 0,
    },
    issues,
  };
}

function renderIssueList(issues) {
  if (!issues.length) return '<p class="empty">No issues found.</p>';

  return `
    <ul>
      ${issues.map((issue) => `
        <li>
          <strong>${escapeHtml(issue.code)}</strong>
          <span>${escapeHtml(issue.formCode)}</span>
          <p>${escapeHtml(issue.message)}</p>
        </li>
      `).join('\n')}
    </ul>
  `;
}

function renderFormStatus(item) {
  const fields = item.fields ?? [];
  const selectedCount = fields.filter((field) => Boolean(field.selectedPdfFieldName)).length;
  const missingCount = fields.length - selectedCount;

  return `
    <section class="form-card">
      <div class="form-head">
        <div>
          <h2>${escapeHtml(item.formCode)}</h2>
          <p>${escapeHtml(item.formLabel)}</p>
        </div>
        <span>${escapeHtml(item.statusLabel)}</span>
      </div>
      <div class="meta">
        <span>${escapeHtml(item.officialRevisionLabel)}</span>
        <span>${escapeHtml(selectedCount)} selected</span>
        <span>${escapeHtml(missingCount)} missing</span>
      </div>
    </section>
  `;
}

function buildValidationHtml({ template, validation }) {
  const errors = validation.issues.filter((issue) => issue.severity === 'error');
  const notes = validation.issues.filter((issue) => issue.severity === 'note');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DayOf PDF Adapter Template Validation</title>
  <style>
    :root {
      color-scheme: light;
      --text: #182230;
      --muted: #667085;
      --line: #d0d5dd;
      --surface: #f8fafc;
      --ok: #067647;
      --bad: #b42318;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body {
      background: #ffffff;
      color: var(--text);
      margin: 0;
    }
    main {
      margin: 0 auto;
      max-width: 1040px;
      padding: 32px 20px 48px;
    }
    h1, h2, p {
      margin: 0;
    }
    header {
      border-bottom: 1px solid var(--line);
      padding-bottom: 20px;
    }
    header p, .form-card p, li p, .empty {
      color: var(--muted);
      font-size: 13px;
      margin-top: 6px;
    }
    .status {
      border-radius: 999px;
      display: inline-block;
      font-size: 12px;
      margin-top: 12px;
      padding: 5px 9px;
    }
    .status.passed {
      background: #ecfdf3;
      color: var(--ok);
    }
    .status.failed {
      background: #fef3f2;
      color: var(--bad);
    }
    .summary {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      margin-top: 20px;
    }
    .summary div, .form-card {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 14px;
    }
    .summary span {
      color: var(--muted);
      display: block;
      font-size: 12px;
    }
    .summary strong {
      display: block;
      font-size: 20px;
      margin-top: 4px;
    }
    section {
      margin-top: 20px;
    }
    ul {
      margin: 10px 0 0;
      padding-left: 18px;
    }
    li + li {
      margin-top: 10px;
    }
    li span {
      background: var(--surface);
      border-radius: 999px;
      color: var(--muted);
      display: inline-block;
      font-size: 12px;
      margin-left: 8px;
      padding: 3px 7px;
    }
    .form-grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      margin-top: 10px;
    }
    .form-head {
      align-items: flex-start;
      display: flex;
      gap: 12px;
      justify-content: space-between;
    }
    .form-head span, .meta span {
      background: var(--surface);
      border-radius: 999px;
      color: var(--muted);
      font-size: 12px;
      padding: 5px 8px;
      white-space: nowrap;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>DayOf PDF Adapter Template Validation</h1>
      <p>Use this before promoting reviewed PDF mappings into a reusable adapter catalog.</p>
      <span class="status ${escapeHtml(validation.status)}">${escapeHtml(validation.status)}</span>
      <div class="summary">
        <div><span>Fields to map</span><strong>${escapeHtml(validation.summary.fieldsToMap)}</strong></div>
        <div><span>Selected</span><strong>${escapeHtml(validation.summary.selectedFields)}</strong></div>
        <div><span>Missing</span><strong>${escapeHtml(validation.summary.missingSelections)}</strong></div>
        <div><span>Duplicates</span><strong>${escapeHtml(validation.summary.duplicateSelections)}</strong></div>
        <div><span>Errors</span><strong>${escapeHtml(validation.summary.errors)}</strong></div>
      </div>
    </header>
    <section>
      <h2>Errors</h2>
      ${renderIssueList(errors)}
    </section>
    <section>
      <h2>Notes</h2>
      ${renderIssueList(notes)}
    </section>
    <section>
      <h2>Forms</h2>
      <div class="form-grid">
        ${template.items.map(renderFormStatus).join('\n')}
      </div>
    </section>
  </main>
</body>
</html>
`;
}

async function main() {
  const { templatePath, outputPath, indexPath } = parseArgs(process.argv.slice(2));
  if (!templatePath) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  const absoluteTemplatePath = resolve(templatePath);
  const absoluteOutputPath = resolve(outputPath ?? getDefaultOutputPath(absoluteTemplatePath));
  const absoluteIndexPath = resolve(indexPath ?? getDefaultIndexPath(absoluteOutputPath));
  const template = JSON.parse(await readFile(absoluteTemplatePath, 'utf8'));
  validateTemplatePayload(template);
  const validation = validateTemplate(template);
  await writeFile(absoluteOutputPath, JSON.stringify({
    ...validation,
    templatePath: absoluteTemplatePath,
  }, null, 2), 'utf8');
  await writeFile(absoluteIndexPath, buildValidationHtml({ template, validation }), 'utf8');

  console.log(JSON.stringify({
    reviewOnly: true,
    outputPath: absoluteOutputPath,
    indexPath: absoluteIndexPath,
    status: validation.status,
    summary: validation.summary,
  }, null, 2));

  if (validation.status !== 'passed') {
    process.exitCode = 1;
  }
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
