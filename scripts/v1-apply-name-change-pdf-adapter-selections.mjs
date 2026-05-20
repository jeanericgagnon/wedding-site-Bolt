#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

function usage() {
  return [
    'Usage:',
    '  node scripts/v1-apply-name-change-pdf-adapter-selections.mjs --template /tmp/name-change-pdf-adapter-template.json --selections /tmp/name-change-pdf-adapter-selections.json --output /tmp/name-change-pdf-adapter-template.reviewed.json',
    '',
    'Selections JSON shape:',
    '  { "reviewOnly": true, "selections": [{ "formCode": "SSA-SS5", "fieldKey": "applicant.newLastName", "selectedPdfFieldName": "LastName", "visualReviewConfirmed": true, "reviewedAt": "2026-05-20" }] }',
  ].join('\n');
}

function parseArgs(argv) {
  const parsed = {
    templatePath: null,
    selectionsPath: null,
    outputPath: null,
    reportPath: null,
    indexPath: null,
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
    if (arg === '--output') {
      parsed.outputPath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--report') {
      parsed.reportPath = argv[index + 1] ?? null;
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

function getDefaultReportPath(outputPath) {
  if (outputPath.endsWith('.json')) return `${outputPath.slice(0, -5)}.selection-report.json`;
  return join(dirname(outputPath), 'name-change-pdf-adapter-selection-report.json');
}

function getDefaultIndexPath(reportPath) {
  if (reportPath.endsWith('.json')) return `${reportPath.slice(0, -5)}.html`;
  return join(dirname(reportPath), 'name-change-pdf-adapter-selection-report.html');
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

function validateSelectionsPayload(payload) {
  if (!payload || typeof payload !== 'object' || payload.reviewOnly !== true || !Array.isArray(payload.selections)) {
    throw new Error('Selections payload must be reviewOnly JSON with a selections array.');
  }
}

function isReviewDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getKnownPdfFieldNames(field, item) {
  return new Set([
    ...(field.candidatePdfFields ?? []).map((candidate) => candidate.pdfFieldName),
    ...(item.unmappedPdfFieldNames ?? []),
  ]);
}

function getSelectionKey(selection) {
  return [
    selection.formCode ?? '',
    selection.officialRevisionLabel ?? '',
    selection.fieldKey ?? '',
  ].join('::');
}

function findTemplateField(template, selection) {
  for (const item of template.items ?? []) {
    if (item.formCode !== selection.formCode) continue;
    if (selection.officialRevisionLabel && item.officialRevisionLabel !== selection.officialRevisionLabel) continue;

    const field = (item.fields ?? []).find((candidate) => candidate.fieldKey === selection.fieldKey);
    if (field) return { item, field };
  }

  return null;
}

function buildSelectionIssues(template, selections) {
  const seenSelectionKeys = new Set();
  const issues = [];

  for (const selection of selections) {
    if (!selection.formCode || !selection.fieldKey) {
      issues.push({
        code: 'invalid_selection',
        formCode: selection.formCode ?? null,
        fieldKey: selection.fieldKey ?? null,
        selectedPdfFieldName: selection.selectedPdfFieldName ?? null,
        message: 'Each selection needs formCode and fieldKey.',
      });
      continue;
    }

    if (!selection.selectedPdfFieldName) {
      issues.push({
        code: 'unfilled_selection',
        formCode: selection.formCode,
        fieldKey: selection.fieldKey,
        selectedPdfFieldName: selection.selectedPdfFieldName ?? null,
        message: `${selection.formCode} ${selection.fieldKey} needs selectedPdfFieldName filled before applying selections.`,
      });
      continue;
    }

    if (selection.visualReviewConfirmed !== true) {
      issues.push({
        code: 'visual_review_not_confirmed',
        formCode: selection.formCode,
        fieldKey: selection.fieldKey,
        selectedPdfFieldName: selection.selectedPdfFieldName,
        message: `${selection.formCode} ${selection.fieldKey} must set visualReviewConfirmed to true after comparing ${selection.selectedPdfFieldName} against the visual official PDF.`,
      });
      continue;
    }

    if (!isReviewDate(selection.reviewedAt)) {
      issues.push({
        code: 'visual_review_date_missing',
        formCode: selection.formCode,
        fieldKey: selection.fieldKey,
        selectedPdfFieldName: selection.selectedPdfFieldName,
        message: `${selection.formCode} ${selection.fieldKey} needs reviewedAt in YYYY-MM-DD format when visualReviewConfirmed is true.`,
      });
      continue;
    }

    const selectionKey = getSelectionKey(selection);
    if (seenSelectionKeys.has(selectionKey)) {
      issues.push({
        code: 'duplicate_selection_target',
        formCode: selection.formCode,
        fieldKey: selection.fieldKey,
        selectedPdfFieldName: selection.selectedPdfFieldName,
        message: `${selection.formCode} ${selection.fieldKey} appears more than once in the selections file.`,
      });
      continue;
    }
    seenSelectionKeys.add(selectionKey);

    const match = findTemplateField(template, selection);
    if (!match) {
      issues.push({
        code: 'selection_target_not_found',
        formCode: selection.formCode,
        fieldKey: selection.fieldKey,
        selectedPdfFieldName: selection.selectedPdfFieldName,
        message: `${selection.formCode} ${selection.fieldKey} was not found in the adapter template.`,
      });
      continue;
    }

    if (!getKnownPdfFieldNames(match.field, match.item).has(selection.selectedPdfFieldName)) {
      issues.push({
        code: 'selected_pdf_field_not_in_probe',
        formCode: selection.formCode,
        fieldKey: selection.fieldKey,
        selectedPdfFieldName: selection.selectedPdfFieldName,
        message: `${selection.selectedPdfFieldName} was not present in the PDF probe output for ${selection.formCode}.`,
      });
    }
  }

  return issues;
}

function applySelections(template, selections) {
  let appliedSelections = 0;
  let unchangedSelections = 0;
  const applied = [];
  const selectionByKey = new Map(selections.map((selection) => [getSelectionKey(selection), selection]));
  const items = (template.items ?? []).map((item) => ({
    ...item,
    fields: (item.fields ?? []).map((field) => {
      const exactSelection = selectionByKey.get([
        item.formCode,
        item.officialRevisionLabel,
        field.fieldKey,
      ].join('::'));
      const looseSelection = selectionByKey.get([
        item.formCode,
        '',
        field.fieldKey,
      ].join('::'));
      const selection = exactSelection ?? looseSelection;
      if (!selection) return field;

      if (field.selectedPdfFieldName === selection.selectedPdfFieldName) {
        unchangedSelections += 1;
      } else {
        appliedSelections += 1;
      }
      const reviewerNote = selection.reviewerNote ?? selection.note ?? null;
      applied.push({
        formCode: item.formCode,
        officialRevisionLabel: item.officialRevisionLabel,
        fieldKey: field.fieldKey,
        officialFieldLabel: field.officialFieldLabel,
        previousPdfFieldName: field.selectedPdfFieldName ?? null,
        selectedPdfFieldName: selection.selectedPdfFieldName,
        visualReviewConfirmed: selection.visualReviewConfirmed === true,
        reviewedAt: selection.reviewedAt,
        reviewerNote,
      });

      return {
        ...field,
        selectedPdfFieldName: selection.selectedPdfFieldName,
        mappingConfidence: selection.mappingConfidence ?? field.mappingConfidence ?? 'manual_review',
        visualReviewConfirmed: selection.visualReviewConfirmed === true,
        reviewedAt: selection.reviewedAt,
        reviewerNote,
        note: [
          field.note,
          `Visual PDF field review confirmed by reviewer selections on ${selection.reviewedAt}.`,
          reviewerNote ? `Reviewer note: ${reviewerNote}` : null,
        ].filter(Boolean).join(' '),
      };
    }),
  }));

  return {
    template: {
      ...template,
      generatedAt: new Date().toISOString(),
      items,
    },
    applied,
    appliedSelections,
    unchangedSelections,
  };
}

function buildReport({ templatePath, selectionsPath, outputPath, selectionCount, application, issues }) {
  const selectedFields = (application.template.items ?? []).reduce((sum, item) => (
    sum + (item.fields ?? []).filter((field) => Boolean(field.selectedPdfFieldName)).length
  ), 0);
  const fieldsToMap = (application.template.items ?? []).reduce((sum, item) => sum + (item.fields ?? []).length, 0);

  return {
    reviewOnly: true,
    generatedAt: new Date().toISOString(),
    status: issues.length === 0 ? 'applied' : 'failed',
    templatePath,
    selectionsPath,
    outputPath,
    summary: {
      selections: selectionCount,
      appliedSelections: application.appliedSelections,
      unchangedSelections: application.unchangedSelections,
      selectedFields,
      fieldsToMap,
      unconfirmedSelections: issues.filter((issue) => issue.code === 'visual_review_not_confirmed').length,
      undatedConfirmedSelections: issues.filter((issue) => issue.code === 'visual_review_date_missing').length,
      issues: issues.length,
    },
    applied: application.applied,
    issues,
  };
}

function renderIssueList(issues) {
  if (!issues.length) return '<p class="empty">No selection issues found.</p>';

  return `
    <ul>
      ${issues.map((issue) => `
        <li>
          <strong>${escapeHtml(issue.code)}</strong>
          <span>${escapeHtml(issue.formCode)}</span>
          <span>${escapeHtml(issue.fieldKey)}</span>
          <p>${escapeHtml(issue.message)}</p>
        </li>
      `).join('\n')}
    </ul>
  `;
}

function renderAppliedList(applied) {
  if (!applied.length) return '<p class="empty">No selections were applied.</p>';

  return `
    <table>
      <thead>
        <tr>
          <th>Form</th>
          <th>DayOf field</th>
          <th>Selected PDF field</th>
          <th>Visual review</th>
          <th>Reviewed at</th>
        </tr>
      </thead>
      <tbody>
        ${applied.map((item) => `
          <tr>
            <td>${escapeHtml(item.formCode)}</td>
            <td>${escapeHtml(item.officialFieldLabel)}<br><code>${escapeHtml(item.fieldKey)}</code></td>
            <td><code>${escapeHtml(item.selectedPdfFieldName)}</code></td>
            <td>${item.visualReviewConfirmed ? 'confirmed' : 'not confirmed'}</td>
            <td>${escapeHtml(item.reviewedAt ?? '')}</td>
          </tr>
        `).join('\n')}
      </tbody>
    </table>
  `;
}

function buildReportHtml(report) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DayOf PDF Adapter Selection Report</title>
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
    body { background: #ffffff; color: var(--text); margin: 0; }
    main { margin: 0 auto; max-width: 1040px; padding: 32px 20px 48px; }
    h1, h2, p { margin: 0; }
    header { border-bottom: 1px solid var(--line); padding-bottom: 20px; }
    header p, li p, .empty { color: var(--muted); font-size: 13px; margin-top: 6px; }
    .status { border-radius: 999px; display: inline-block; font-size: 12px; margin-top: 12px; padding: 5px 9px; }
    .status.applied { background: #ecfdf3; color: var(--ok); }
    .status.failed { background: #fef3f2; color: var(--bad); }
    .summary { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); margin-top: 20px; }
    .summary div { border: 1px solid var(--line); border-radius: 8px; padding: 14px; }
    .summary span { color: var(--muted); display: block; font-size: 12px; }
    .summary strong { display: block; font-size: 20px; margin-top: 4px; }
    section { margin-top: 20px; }
    table { border-collapse: collapse; margin-top: 10px; width: 100%; }
    th, td { border-top: 1px solid var(--line); font-size: 13px; padding: 10px 8px; text-align: left; vertical-align: top; }
    th { color: var(--muted); font-weight: 600; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-size: 12px; }
    ul { margin: 10px 0 0; padding-left: 18px; }
    li + li { margin-top: 10px; }
    li span { background: var(--surface); border-radius: 999px; color: var(--muted); display: inline-block; font-size: 12px; margin-left: 8px; padding: 3px 7px; }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>DayOf PDF Adapter Selection Report</h1>
      <p>Review-only report for applying compact reviewer selections into a PDF adapter template.</p>
      <span class="status ${escapeHtml(report.status)}">${escapeHtml(report.status)}</span>
      <div class="summary">
        <div><span>Selections</span><strong>${escapeHtml(report.summary.selections)}</strong></div>
        <div><span>Applied</span><strong>${escapeHtml(report.summary.appliedSelections)}</strong></div>
        <div><span>Selected fields</span><strong>${escapeHtml(report.summary.selectedFields)}</strong></div>
        <div><span>Unconfirmed</span><strong>${escapeHtml(report.summary.unconfirmedSelections)}</strong></div>
        <div><span>Missing review date</span><strong>${escapeHtml(report.summary.undatedConfirmedSelections)}</strong></div>
        <div><span>Issues</span><strong>${escapeHtml(report.summary.issues)}</strong></div>
      </div>
    </header>
    <section>
      <h2>Applied Selections</h2>
      ${renderAppliedList(report.applied)}
    </section>
    <section>
      <h2>Issues</h2>
      ${renderIssueList(report.issues)}
    </section>
  </main>
</body>
</html>
`;
}

async function main() {
  const { templatePath, selectionsPath, outputPath, reportPath, indexPath } = parseArgs(process.argv.slice(2));
  if (!templatePath || !selectionsPath || !outputPath) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  const absoluteTemplatePath = resolve(templatePath);
  const absoluteSelectionsPath = resolve(selectionsPath);
  const absoluteOutputPath = resolve(outputPath);
  const absoluteReportPath = resolve(reportPath ?? getDefaultReportPath(absoluteOutputPath));
  const absoluteIndexPath = resolve(indexPath ?? getDefaultIndexPath(absoluteReportPath));
  const template = JSON.parse(await readFile(absoluteTemplatePath, 'utf8'));
  const selectionsPayload = JSON.parse(await readFile(absoluteSelectionsPath, 'utf8'));
  validateTemplatePayload(template);
  validateSelectionsPayload(selectionsPayload);

  const selections = selectionsPayload.selections;
  const issues = buildSelectionIssues(template, selections);
  const application = issues.length === 0
    ? applySelections(template, selections)
    : { template, applied: [], appliedSelections: 0, unchangedSelections: 0 };
  const report = buildReport({
    templatePath: absoluteTemplatePath,
    selectionsPath: absoluteSelectionsPath,
    outputPath: absoluteOutputPath,
    selectionCount: selections.length,
    application,
    issues,
  });

  if (issues.length === 0) {
    await writeFile(absoluteOutputPath, JSON.stringify(application.template, null, 2), 'utf8');
  }
  await writeFile(absoluteReportPath, JSON.stringify(report, null, 2), 'utf8');
  await writeFile(absoluteIndexPath, buildReportHtml(report), 'utf8');

  console.log(JSON.stringify({
    reviewOnly: true,
    outputPath: issues.length === 0 ? absoluteOutputPath : null,
    reportPath: absoluteReportPath,
    indexPath: absoluteIndexPath,
    status: report.status,
    summary: report.summary,
  }, null, 2));

  if (issues.length > 0) {
    process.exitCode = 1;
  }
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
