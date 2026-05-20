#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

function usage() {
  return [
    'Usage:',
    '  node scripts/v1-build-name-change-intake-answer-template.mjs --gaps /tmp/dayof-name-change-intake-gap-report.json --output /tmp/dayof-name-change-intake-answer-template.json',
    '',
    'Builds a blank no-values answer template from an intake gap report.',
  ].join('\n');
}

function parseArgs(argv) {
  const parsed = {
    gapsPath: null,
    outputPath: null,
    indexPath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--gaps') {
      parsed.gapsPath = argv[index + 1] ?? null;
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

function validateGapReport(payload) {
  if (!payload || typeof payload !== 'object' || payload.reviewOnly !== true || payload.safePayload !== true || payload.containsUserValues !== false || !Array.isArray(payload.gaps)) {
    throw new Error('Gap report must be reviewOnly, safePayload, no-values JSON with a gaps array.');
  }
}

function uniq(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getKind(gap) {
  if (gap.category === 'secure_session') return 'secure_session_answer';
  if (gap.category === 'consent') return 'consent_answer';
  if (gap.category === 'pdf_mapping') return 'pdf_mapping_task';
  return 'standard_answer';
}

function getStatus(kind) {
  if (kind === 'secure_session_answer') return 'needs_secure_entry';
  if (kind === 'consent_answer') return 'needs_consent';
  if (kind === 'pdf_mapping_task') return 'needs_pdf_mapping';
  return 'needs_answer';
}

function getRetentionPolicy(kind) {
  if (kind === 'secure_session_answer') return 'ephemeral_only';
  if (kind === 'consent_answer') return 'save_or_use_only_with_consent';
  if (kind === 'pdf_mapping_task') return 'not_user_answer';
  return 'normal_planner';
}

function buildField(gap) {
  const kind = getKind(gap);

  return {
    answerKey: `answer:${gap.gapKey}`,
    gapKey: gap.gapKey,
    fieldKey: gap.fieldKey,
    kind,
    status: getStatus(kind),
    statusLabel: gap.statusLabel,
    label: gap.label,
    prompt: gap.prompt,
    helperText: gap.helperText,
    formCodes: gap.formCodes,
    formLabels: gap.formLabels,
    officialRevisionLabels: gap.officialRevisionLabels ?? [],
    answerContext: {
      formCodes: gap.formCodes,
      officialRevisionLabels: gap.officialRevisionLabels ?? [],
      sources: gap.sources,
    },
    answerValue: null,
    consentToUseInDraft: null,
    consentToSave: null,
    retentionPolicy: getRetentionPolicy(kind),
    secureSessionOnly: kind === 'secure_session_answer',
    mappingRequired: kind === 'pdf_mapping_task',
    currentValueKnown: Boolean(gap.currentValueKnown),
    nextAction: gap.nextAction,
  };
}

function getPrimaryAction(summary) {
  if (summary.standardAnswers > 0) return 'Render standard intake questions first and save answers once for reuse.';
  if (summary.secureSessionAnswers > 0) return 'Render secure-session questions as ephemeral answers before draft generation.';
  if (summary.consentAnswers > 0) return 'Render consent questions before using or saving sensitive values.';
  if (summary.pdfMappingTasks > 0) return 'Route PDF mapping tasks to a reviewer instead of asking the user.';
  return 'No intake answers are needed for the current population plan.';
}

function buildTemplate(gapReport) {
  const fields = gapReport.gaps.map(buildField);
  const summary = {
    totalFields: fields.length,
    standardAnswers: fields.filter((field) => field.kind === 'standard_answer').length,
    consentAnswers: fields.filter((field) => field.kind === 'consent_answer').length,
    secureSessionAnswers: fields.filter((field) => field.kind === 'secure_session_answer').length,
    pdfMappingTasks: fields.filter((field) => field.kind === 'pdf_mapping_task').length,
    impactedForms: uniq(fields.flatMap((field) => field.formCodes)).length,
  };

  return {
    reviewOnly: true,
    safePayload: true,
    containsUserValues: false,
    generatedAt: new Date().toISOString(),
    source: 'DayOf name-change intake answer template',
    primaryAction: getPrimaryAction(summary),
    summary,
    fields,
  };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getKindClass(kind) {
  if (kind === 'secure_session_answer') return 'secure';
  if (kind === 'consent_answer') return 'consent';
  if (kind === 'pdf_mapping_task') return 'mapping';
  return 'standard';
}

function renderField(field) {
  return `
    <section class="field ${getKindClass(field.kind)}">
      <div class="field-head">
        <div>
          <h2>${escapeHtml(field.label)}</h2>
          <p><code>${escapeHtml(field.fieldKey)}</code></p>
        </div>
        <span>${escapeHtml(field.statusLabel)}</span>
      </div>
      <p class="prompt">${escapeHtml(field.prompt)}</p>
      <p>${escapeHtml(field.helperText)}</p>
      <div class="meta">
        <span>${escapeHtml(field.formCodes.join(', '))}</span>
        <span>${escapeHtml(field.retentionPolicy)}</span>
        <span>${field.answerValue === null ? 'Blank answer slot' : 'Filled'}</span>
      </div>
      <p class="next">${escapeHtml(field.nextAction)}</p>
    </section>
  `;
}

function buildIndexHtml(template) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DayOf Name Change Intake Answer Template</title>
  <style>
    :root {
      color-scheme: light;
      --text: #172033;
      --muted: #667085;
      --line: #d0d5dd;
      --surface: #f8fafc;
      --standard: #175cd3;
      --secure: #b42318;
      --consent: #93370d;
      --mapping: #344054;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body { background: #ffffff; color: var(--text); margin: 0; }
    main { margin: 0 auto; max-width: 1040px; padding: 32px 20px 48px; }
    h1, h2, p { margin: 0; }
    header { border-bottom: 1px solid var(--line); padding-bottom: 20px; }
    header p, .field p { color: var(--muted); font-size: 13px; margin-top: 7px; }
    .summary { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); margin-top: 20px; }
    .summary div, .field { border: 1px solid var(--line); border-radius: 8px; padding: 14px; }
    .summary span { color: var(--muted); display: block; font-size: 12px; }
    .summary strong { display: block; font-size: 20px; margin-top: 4px; }
    .field-grid { display: grid; gap: 14px; margin-top: 20px; }
    .field-head { align-items: flex-start; display: flex; gap: 12px; justify-content: space-between; }
    .field-head h2 { font-size: 17px; }
    .field-head span, .meta span { border-radius: 999px; font-size: 12px; padding: 5px 9px; white-space: nowrap; }
    .field.standard .field-head span { background: #eff8ff; color: var(--standard); }
    .field.secure .field-head span { background: #fef3f2; color: var(--secure); }
    .field.consent .field-head span { background: #fff6ed; color: var(--consent); }
    .field.mapping .field-head span { background: #f2f4f7; color: var(--mapping); }
    .prompt { color: var(--text) !important; font-weight: 600; }
    .meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .meta span { background: var(--surface); color: var(--muted); }
    .next { border-top: 1px solid var(--line); padding-top: 12px; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-size: 12px; }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>DayOf Name Change Intake Answer Template</h1>
      <p>Blank answer template for rendering questions safely before any user-entered values exist.</p>
      <div class="summary">
        <div><span>Total fields</span><strong>${escapeHtml(template.summary.totalFields)}</strong></div>
        <div><span>Standard answers</span><strong>${escapeHtml(template.summary.standardAnswers)}</strong></div>
        <div><span>Secure session</span><strong>${escapeHtml(template.summary.secureSessionAnswers)}</strong></div>
        <div><span>Consent</span><strong>${escapeHtml(template.summary.consentAnswers)}</strong></div>
        <div><span>PDF mapping tasks</span><strong>${escapeHtml(template.summary.pdfMappingTasks)}</strong></div>
      </div>
    </header>
    <div class="field-grid">
      ${template.fields.length ? template.fields.map(renderField).join('\n') : '<p class="empty">No intake answers are needed.</p>'}
    </div>
  </main>
</body>
</html>
`;
}

function getDefaultIndexPath(outputPath) {
  return outputPath.endsWith('.json') ? outputPath.replace(/\.json$/, '.html') : `${outputPath}.html`;
}

async function main() {
  const { gapsPath, outputPath, indexPath } = parseArgs(process.argv.slice(2));
  if (!gapsPath || !outputPath) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  const absoluteGapsPath = resolve(gapsPath);
  const absoluteOutputPath = resolve(outputPath);
  const absoluteIndexPath = resolve(indexPath ?? getDefaultIndexPath(absoluteOutputPath));
  const gapReport = JSON.parse(await readFile(absoluteGapsPath, 'utf8'));
  validateGapReport(gapReport);
  const template = buildTemplate(gapReport);

  await mkdir(dirname(absoluteOutputPath), { recursive: true });
  await mkdir(dirname(absoluteIndexPath), { recursive: true });
  await writeFile(absoluteOutputPath, JSON.stringify(template, null, 2), 'utf8');
  await writeFile(absoluteIndexPath, buildIndexHtml(template), 'utf8');

  console.log(JSON.stringify({
    reviewOnly: true,
    safePayload: true,
    containsUserValues: false,
    outputPath: absoluteOutputPath,
    indexPath: absoluteIndexPath,
    summary: template.summary,
  }, null, 2));
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
