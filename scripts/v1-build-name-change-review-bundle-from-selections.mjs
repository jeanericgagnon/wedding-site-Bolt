#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptDir = dirname(fileURLToPath(import.meta.url));

function usage() {
  return [
    'Usage:',
    '  node scripts/v1-build-name-change-review-bundle-from-selections.mjs --population /path/dayof-name-change-population-plan.json --probe /path/name-change-pdf-probe.json --selections /tmp/name-change-pdf-adapter-template.selections.json --outdir /tmp/name-change-form-population-run --last-mapped-at 2026-05-20',
    '  node scripts/v1-build-name-change-review-bundle-from-selections.mjs --population /path/dayof-name-change-population-plan.json --probe /path/name-change-pdf-probe.json --selections /tmp/name-change-pdf-adapter-template.selections.json --answers /tmp/dayof-name-change-intake-answer-response.json --outdir /tmp/name-change-form-population-run --last-mapped-at 2026-05-20',
    '  node scripts/v1-build-name-change-review-bundle-from-selections.mjs --population /path/dayof-name-change-population-plan.json --probe /path/name-change-pdf-probe.json --selections /tmp/name-change-pdf-adapter-template.selections.json --filled-template /tmp/dayof-name-change-intake-answer-template.filled.json --outdir /tmp/name-change-form-population-run --last-mapped-at 2026-05-20',
    '',
    'Builds the PDF adapter template, promotes filled reviewer selections to a catalog, optionally applies completed intake answers, and produces the final review bundle. Use either --answers or --filled-template, not both.',
  ].join('\n');
}

function parseArgs(argv) {
  const parsed = {
    populationPath: null,
    probePath: null,
    selectionsPath: null,
    answersPath: null,
    filledTemplatePath: null,
    outputDir: null,
    lastMappedAt: new Date().toISOString().slice(0, 10),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--population') {
      parsed.populationPath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--probe') {
      parsed.probePath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--selections') {
      parsed.selectionsPath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--answers') {
      parsed.answersPath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--filled-template') {
      parsed.filledTemplatePath = argv[index + 1] ?? null;
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

function sanitizeStepOutput(value, sensitivePaths = []) {
  if (typeof value !== 'string') return value;
  let sanitized = value;
  for (const path of sensitivePaths.filter(Boolean)) {
    sanitized = sanitized.split(path).join('[value-bearing input path removed]');
  }
  return sanitized
    .replace(/(v1-build-name-change-intake-answer-response\.mjs --template )\S+/g, '$1[filled-template-removed]')
    .replace(/\S*dayof-name-change-answer-response-[^\s]*\/dayof-name-change-intake-answer-response\.json/g, '[temporary answer response removed]');
}

async function runNodeScript(scriptName, args, options = {}) {
  const scriptPath = join(scriptDir, scriptName);
  const sensitivePaths = options.sensitivePaths ?? [];

  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath, ...args], {
      maxBuffer: 1024 * 1024 * 10,
    });

    return {
      ok: true,
      code: 0,
      stdout: sanitizeStepOutput(stdout.trim(), sensitivePaths),
      stderr: sanitizeStepOutput(stderr.trim(), sensitivePaths) || null,
    };
  } catch (error) {
    return {
      ok: false,
      code: typeof error?.code === 'number' ? error.code : 1,
      stdout: typeof error?.stdout === 'string' ? sanitizeStepOutput(error.stdout.trim(), sensitivePaths) : '',
      stderr: sanitizeStepOutput(
        typeof error?.stderr === 'string' && error.stderr.trim() ? error.stderr.trim() : String(error?.message ?? error),
        sensitivePaths,
      ),
    };
  }
}

async function validateRunOutput({ runManifestPath, runValidationPath }) {
  const result = await runNodeScript('v1-validate-name-change-form-population-run.mjs', [
    '--manifest',
    runManifestPath,
    '--output',
    runValidationPath,
  ]);
  const report = await readJsonIfExists(runValidationPath);

  return {
    result,
    report,
  };
}

function getStepStatus(result) {
  if (!result) return 'skipped';
  return result.ok ? 'passed' : 'failed';
}

function getRunStatus(steps) {
  return steps.every((step) => step.status === 'passed' || step.status === 'skipped') ? 'passed' : 'failed';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getStatusClass(status) {
  if (status === 'passed') return 'passed';
  if (status === 'failed') return 'failed';
  return 'skipped';
}

function getFileHref(indexPath, targetPath) {
  return encodeURI(relative(dirname(indexPath), targetPath).split('\\').join('/'));
}

function formatCount(value) {
  return String(value ?? 'n/a');
}

function renderSummaryCard(label, value) {
  return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(formatCount(value))}</strong></div>`;
}

function buildAction({ id, priority = 'secondary', label, detail, filePath = null }) {
  return {
    id,
    priority,
    label,
    detail,
    filePath,
  };
}

const pendingRunFileKeys = new Set([
  'runManifestPath',
  'runIndexPath',
  'runHandoffPath',
  'runValidationPath',
]);

async function getFileAvailability(files) {
  const entries = await Promise.all(Object.entries(files).map(async ([key, path]) => {
    if (!path) return [key, false];
    if (pendingRunFileKeys.has(key)) return [key, true];
    return [key, await fileExists(path)];
  }));

  return Object.fromEntries(entries);
}

function isFileVisible(manifest, key) {
  if (key === 'reviewBundleAnsweredPopulationPath') return false;
  return Boolean(manifest.files[key] && manifest.fileAvailability?.[key] !== false);
}

function buildNextActions({ status, files, steps, summary }) {
  const failedStep = steps.find((step) => step.status === 'failed');
  const selectionIssues = summary.selectionIssues ?? [];
  const adapterTemplate = summary.adapterTemplate ?? {};
  const adapterPromotion = summary.adapterPromotion ?? {};
  const reviewBundle = summary.reviewBundle ?? {};
  const actions = [];

  if (status === 'passed') {
    actions.push(buildAction({
      id: 'open_final_review_bundle',
      priority: 'primary',
      label: 'Open final review bundle',
      detail: `${reviewBundle.reviewPacket?.readyPackets ?? 0} packet(s) ready for review, ${reviewBundle.reviewPacket?.blockedPackets ?? 0} blocked.`,
      filePath: files.reviewBundleIndexPath,
    }));
    actions.push(buildAction({
      id: 'inspect_run_manifest',
      label: 'Keep the run manifest with the bundle',
      detail: 'This JSON records the exact population input, probe input, selections input, generated files, and review-only status.',
      filePath: files.runManifestPath,
    }));
    return actions;
  }

  if (selectionIssues.length > 0) {
    actions.push(buildAction({
      id: 'review_selection_todo',
      priority: 'primary',
      label: 'Review the PDF selection todo',
      detail: `${selectionIssues.length} mapping selection issue(s) must be fixed. Start with the no-values todo, then copy confirmed PDF field names into the selections JSON.`,
      filePath: files.adapterSelectionTodoHtmlPath,
    }));
    actions.push(buildAction({
      id: 'fill_selection_file',
      label: 'Fill the selections JSON',
      detail: 'Set selectedPdfFieldName only after confirming the candidate against the visual official PDF.',
      filePath: files.adapterTemplateStarterSelectionsPath,
    }));
    actions.push(buildAction({
      id: 'open_selection_report',
      label: 'Open the selection report',
      detail: 'The report lists the exact form field, issue code, and message for each selection problem.',
      filePath: files.adapterSelectionReportIndexPath,
    }));
    return actions;
  }

  if (failedStep?.step === 'build_adapter_template') {
    actions.push(buildAction({
      id: 'fix_population_or_probe_input',
      priority: 'primary',
      label: 'Fix the population or PDF probe input',
      detail: 'The mapping worksheet could not be built. Inspect the failed step output, then rerun with corrected input files.',
      filePath: files.runManifestPath,
    }));
    return actions;
  }

  if ((adapterTemplate.needsPdfProbe ?? 0) > 0) {
    actions.push(buildAction({
      id: 'run_pdf_probe',
      priority: 'primary',
      label: 'Run the PDF field probe for remaining official PDFs',
      detail: `${adapterTemplate.needsPdfProbe} form(s) still need raw PDF fields before mappings can be reviewed.`,
      filePath: files.adapterTemplateIndexPath,
    }));
    return actions;
  }

  if (failedStep?.step === 'promote_adapter_catalog') {
    actions.push(buildAction({
      id: 'inspect_catalog_promotion',
      priority: 'primary',
      label: 'Inspect catalog promotion output',
      detail: `${adapterPromotion.selection?.issues ?? 0} selection issue(s), ${adapterPromotion.validation?.errors ?? 0} validation error(s), and ${adapterPromotion.catalog?.issues ?? 0} catalog issue(s) were reported.`,
      filePath: files.adapterPromotionManifestPath,
    }));
    actions.push(buildAction({
      id: 'open_validation_report',
      label: 'Open validation report',
      detail: 'Use the validation report when selections were filled but could not be promoted safely.',
      filePath: files.adapterValidationReportIndexPath,
    }));
    return actions;
  }

  if (failedStep?.step === 'build_review_bundle') {
    if ((summary.answerResponseIssues ?? []).length > 0) {
      actions.push(buildAction({
        id: 'review_filled_template_conversion_report',
        priority: 'primary',
        label: 'Review filled-template readiness',
        detail: `${summary.answerResponseIssues.length} filled-template issue(s) stopped answer application before draft generation. Start with the readiness page, then fix the filled intake template consent, retention, or value and rerun this command.`,
        filePath: files.reviewBundleFilledTemplateReadinessIndexPath ?? files.reviewBundleFilledTemplateConversionReportPath,
      }));
      return actions;
    }

    if ((summary.answerApplyIssues ?? []).length > 0) {
      actions.push(buildAction({
        id: 'review_intake_answer_apply_report',
        priority: 'primary',
        label: 'Review the intake answer report',
        detail: `${summary.answerApplyIssues.length} answer issue(s) stopped the review bundle before draft generation. Fix the answer response consent or value, then rerun this command.`,
        filePath: files.reviewBundleAnswerApplyReportPath,
      }));
      return actions;
    }

    actions.push(buildAction({
      id: 'inspect_review_bundle_build',
      priority: 'primary',
      label: 'Inspect review bundle build output',
      detail: 'The adapter catalog promoted, but draft/FDF/review bundle generation failed. Check the step output and any partial bundle files.',
      filePath: files.reviewBundleManifestPath,
    }));
    return actions;
  }

  actions.push(buildAction({
    id: 'inspect_failed_step',
    priority: 'primary',
    label: 'Inspect the failed step',
    detail: failedStep
      ? `${failedStep.step} failed. Review its output, fix the input, and rerun this command.`
      : 'The run did not pass. Review the step table and rerun after correcting the source files.',
    filePath: files.runManifestPath,
  }));

  return actions;
}

function renderNextActions(manifest) {
  const actions = manifest.nextActions ?? [];
  if (!actions.length) return '';

  return `
    <section class="actions">
      <h2>Next Actions</h2>
      <ol>
        ${actions.map((action) => `
          <li class="${escapeHtml(action.priority)}">
            <strong>${escapeHtml(action.label)}</strong>
            <p>${escapeHtml(action.detail)}</p>
            ${action.filePath ? `<a href="${escapeHtml(getFileHref(manifest.files.runIndexPath, action.filePath))}">${escapeHtml(action.filePath)}</a>` : ''}
          </li>
        `).join('\n')}
      </ol>
    </section>
  `;
}

function renderStepRows(steps) {
  return steps.map((step) => `
    <tr>
      <td><code>${escapeHtml(step.step)}</code></td>
      <td><span class="status ${getStatusClass(step.status)}">${escapeHtml(step.status)}</span></td>
      <td>${escapeHtml(step.code ?? '')}</td>
      <td>${step.stdout ? `<pre>${escapeHtml(step.stdout)}</pre>` : '<span class="empty">None</span>'}</td>
      <td>${step.stderr ? `<pre>${escapeHtml(step.stderr)}</pre>` : '<span class="empty">None</span>'}</td>
    </tr>
  `).join('\n');
}

function renderIssueRows(issues) {
  return issues.map((issue) => `
    <tr>
      <td><code>${escapeHtml(issue.code)}</code></td>
      <td>${escapeHtml(issue.formCode)}</td>
      <td><code>${escapeHtml(issue.fieldKey)}</code></td>
      <td>${escapeHtml(issue.message)}</td>
    </tr>
  `).join('\n');
}

function renderSelectionIssues(manifest) {
  const issues = manifest.summary.selectionIssues ?? [];
  if (!issues.length) return '';

  return `
    <section>
      <h2>Selection Issues</h2>
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Form</th>
            <th>Field</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          ${renderIssueRows(issues)}
        </tbody>
      </table>
    </section>
  `;
}

function renderFileLink({ manifest, label, key }) {
  if (!isFileVisible(manifest, key)) return '';
  const indexPath = manifest.files.runIndexPath;
  const path = manifest.files[key];

  return `
    <li>
      <a href="${escapeHtml(getFileHref(indexPath, path))}">${escapeHtml(label)}</a>
      <code>${escapeHtml(path)}</code>
    </li>
  `;
}

function renderFileLinks(manifest) {
  const fileLinks = [
    ['Run manifest JSON', 'runManifestPath'],
    ['Run index HTML', 'runIndexPath'],
    ['Run handoff Markdown', 'runHandoffPath'],
    ['Run validation JSON', 'runValidationPath'],
    ['Mapping review HTML', 'adapterTemplateIndexPath'],
    ['Starter selections JSON', 'adapterTemplateStarterSelectionsPath'],
    ['Selection todo HTML', 'adapterSelectionTodoHtmlPath'],
    ['Selection todo Markdown', 'adapterSelectionTodoMarkdownPath'],
    ['Selection todo JSON', 'adapterSelectionTodoPath'],
    ['Selection report HTML', 'adapterSelectionReportIndexPath'],
    ['Selection report JSON', 'adapterSelectionReportPath'],
    ['Reviewed template JSON', 'adapterReviewedTemplatePath'],
    ['Validation report HTML', 'adapterValidationReportIndexPath'],
    ['Validation report JSON', 'adapterValidationReportPath'],
    ['Adapter catalog JSON', 'adapterCatalogPath'],
    ['Catalog promotion manifest', 'adapterPromotionManifestPath'],
    ['Answered population JSON', 'reviewBundleAnsweredPopulationPath'],
    ['Filled-template conversion report JSON', 'reviewBundleFilledTemplateConversionReportPath'],
    ['Filled-template readiness HTML', 'reviewBundleFilledTemplateReadinessIndexPath'],
    ['Answer apply report JSON', 'reviewBundleAnswerApplyReportPath'],
    ['Final review bundle index', 'reviewBundleIndexPath'],
    ['Final review bundle manifest', 'reviewBundleManifestPath'],
  ];

  return fileLinks
    .map(([label, key]) => renderFileLink({ manifest, label, key }))
    .filter(Boolean)
    .join('\n');
}

function buildRunIndexHtml(manifest) {
  const adapterTemplate = manifest.summary.adapterTemplate ?? {};
  const adapterPromotion = manifest.summary.adapterPromotion ?? {};
  const reviewBundle = manifest.summary.reviewBundle ?? {};
  const answerResponse = manifest.summary.answerResponse ?? reviewBundle.intakeAnswerResponse ?? {};
  const answerApply = manifest.summary.answerApply ?? reviewBundle.intakeAnswerApply ?? {};
  const summaryCards = [
    ['Run status', manifest.status],
    ['Template ready forms', adapterTemplate.readyForReview],
    ['Fields to map', adapterTemplate.fieldsToMap],
    ['Selected fields', adapterPromotion.selection?.selectedFields],
    ['Catalog mapped fields', adapterPromotion.catalog?.mappedFields],
    ['Filled answers', answerResponse.answerFields],
    ['Answers applied', answerApply.appliedAnswers],
    ['Ready review packets', reviewBundle.reviewPacket?.readyPackets],
    ['Blocked review packets', reviewBundle.reviewPacket?.blockedPackets],
    ['FDF files', reviewBundle.fdf?.exportedFdfFiles],
  ];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DayOf Name Change Form Population Run</title>
  <style>
    :root {
      color-scheme: light;
      --text: #172033;
      --muted: #667085;
      --line: #d9deea;
      --surface: #f7f8fb;
      --passed: #087443;
      --failed: #b42318;
      --skipped: #475467;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body {
      margin: 0;
      background: #ffffff;
      color: var(--text);
    }
    main {
      margin: 0 auto;
      max-width: 1120px;
      padding: 32px 20px 48px;
    }
    h1, h2, p {
      margin: 0;
    }
    header {
      border-bottom: 1px solid var(--line);
      padding-bottom: 20px;
    }
    header p {
      color: var(--muted);
      margin-top: 8px;
      max-width: 760px;
    }
    section {
      margin-top: 24px;
    }
    .summary {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      margin-top: 20px;
    }
    .summary div, .files, .notice, .actions li {
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
    .notice {
      background: var(--surface);
      color: var(--muted);
      line-height: 1.5;
    }
    .status {
      border-radius: 999px;
      display: inline-flex;
      font-size: 12px;
      padding: 5px 9px;
      white-space: nowrap;
    }
    .status.passed {
      background: #ecfdf3;
      color: var(--passed);
    }
    .status.failed {
      background: #fef3f2;
      color: var(--failed);
    }
    .status.skipped {
      background: #f2f4f7;
      color: var(--skipped);
    }
    .files ul {
      display: grid;
      gap: 10px;
      list-style: none;
      margin: 12px 0 0;
      padding: 0;
    }
    .files li {
      display: grid;
      gap: 4px;
    }
    .actions ol {
      display: grid;
      gap: 10px;
      list-style-position: inside;
      margin: 12px 0 0;
      padding: 0;
    }
    .actions li.primary {
      border-color: #84caff;
      background: #f5fbff;
    }
    .actions strong {
      display: inline-block;
      margin-left: 4px;
    }
    .actions p {
      color: var(--muted);
      font-size: 13px;
      margin-top: 6px;
    }
    a {
      color: #175cd3;
      text-decoration: none;
    }
    code, pre {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 12px;
    }
    code {
      color: var(--muted);
      overflow-wrap: anywhere;
    }
    table {
      border-collapse: collapse;
      margin-top: 12px;
      width: 100%;
    }
    th, td {
      border-top: 1px solid var(--line);
      font-size: 13px;
      padding: 10px 8px;
      text-align: left;
      vertical-align: top;
    }
    th {
      color: var(--muted);
      font-weight: 600;
    }
    pre {
      margin: 0;
      max-height: 220px;
      overflow: auto;
      white-space: pre-wrap;
    }
    .empty {
      color: var(--muted);
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>DayOf Name Change Form Population Run</h1>
      <p>Review-only status for the local path from saved intake, to PDF mapping, to a final review bundle. Nothing here submits, signs, or replaces official agency instructions.</p>
      <div class="summary">
        ${summaryCards.map(([label, value]) => renderSummaryCard(label, value)).join('\n')}
      </div>
    </header>
    <section class="notice">
      Open the final review bundle index when this run passes. If the run failed, use the failed step and file links below to finish mapping selections or inspect the source JSON.
    </section>
    ${renderNextActions(manifest)}
    <section class="files">
      <h2>Run Files</h2>
      <ul>
        ${renderFileLinks(manifest)}
      </ul>
    </section>
    <section>
      <h2>Steps</h2>
      <table>
        <thead>
          <tr>
            <th>Step</th>
            <th>Status</th>
            <th>Code</th>
            <th>Output</th>
            <th>Error output</th>
          </tr>
        </thead>
        <tbody>
          ${renderStepRows(manifest.steps)}
        </tbody>
      </table>
    </section>
    ${renderSelectionIssues(manifest)}
  </main>
</body>
</html>
`;
}

function formatMarkdownPath(path) {
  return path ? `\`${path}\`` : '`n/a`';
}

function formatMarkdownList(items) {
  if (!items.length) return '- None';
  return items.map((item) => `- ${item}`).join('\n');
}

function renderMarkdownFileLine(manifest, label, key) {
  return isFileVisible(manifest, key) ? `- ${label}: ${formatMarkdownPath(manifest.files[key])}` : null;
}

function buildRunHandoffMarkdown(manifest) {
  const adapterTemplate = manifest.summary.adapterTemplate ?? {};
  const adapterPromotion = manifest.summary.adapterPromotion ?? {};
  const reviewBundle = manifest.summary.reviewBundle ?? {};
  const answerResponse = manifest.summary.answerResponse ?? reviewBundle.intakeAnswerResponse ?? {};
  const answerApply = manifest.summary.answerApply ?? reviewBundle.intakeAnswerApply ?? {};
  const selectionIssues = manifest.summary.selectionIssues ?? [];
  const failedStep = manifest.steps.find((step) => step.status === 'failed');
  const actionLines = manifest.nextActions.map((action, index) => [
    `${index + 1}. ${action.label}`,
    `   - ${action.detail}`,
    action.filePath ? `   - File: ${formatMarkdownPath(action.filePath)}` : null,
  ].filter(Boolean).join('\n'));
  const issueLines = selectionIssues.map((issue) => [
    `${issue.code}: ${issue.formCode} ${issue.fieldKey}`,
    issue.message,
  ].join(' - '));

  return [
    '# DayOf Name Change Form Population Run Handoff',
    '',
    `Generated: ${manifest.generatedAt}`,
    `Status: ${manifest.status}`,
    '',
    'Review-only output. Nothing in this folder submits a form, signs a form, or replaces official agency instructions.',
    '',
    '## Next Actions',
    '',
    formatMarkdownList(actionLines),
    '',
    '## Summary',
    '',
    `- Template ready forms: ${formatCount(adapterTemplate.readyForReview)}`,
    `- Fields to map: ${formatCount(adapterTemplate.fieldsToMap)}`,
    `- Selected fields: ${formatCount(adapterPromotion.selection?.selectedFields)}`,
    `- Catalog mapped fields: ${formatCount(adapterPromotion.catalog?.mappedFields)}`,
    `- Filled answers: ${formatCount(answerResponse.answerFields)}`,
    `- Answers applied: ${formatCount(answerApply.appliedAnswers)}`,
    `- Ready review packets: ${formatCount(reviewBundle.reviewPacket?.readyPackets)}`,
    `- Blocked review packets: ${formatCount(reviewBundle.reviewPacket?.blockedPackets)}`,
    `- FDF files: ${formatCount(reviewBundle.fdf?.exportedFdfFiles)}`,
    '',
    '## Key Files',
    '',
    ...[
      renderMarkdownFileLine(manifest, 'Run index', 'runIndexPath'),
      renderMarkdownFileLine(manifest, 'Run manifest', 'runManifestPath'),
      renderMarkdownFileLine(manifest, 'Mapping review', 'adapterTemplateIndexPath'),
      renderMarkdownFileLine(manifest, 'Selection todo HTML', 'adapterSelectionTodoHtmlPath'),
      renderMarkdownFileLine(manifest, 'Selection todo Markdown', 'adapterSelectionTodoMarkdownPath'),
      renderMarkdownFileLine(manifest, 'Selections JSON', 'adapterTemplateStarterSelectionsPath'),
      renderMarkdownFileLine(manifest, 'Selection report', 'adapterSelectionReportIndexPath'),
      renderMarkdownFileLine(manifest, 'Filled-template conversion report', 'reviewBundleFilledTemplateConversionReportPath'),
      renderMarkdownFileLine(manifest, 'Filled-template readiness HTML', 'reviewBundleFilledTemplateReadinessIndexPath'),
      renderMarkdownFileLine(manifest, 'Answer apply report', 'reviewBundleAnswerApplyReportPath'),
      renderMarkdownFileLine(manifest, 'Final review bundle', 'reviewBundleIndexPath'),
    ].filter(Boolean),
    '',
    '## Step Status',
    '',
    formatMarkdownList(manifest.steps.map((step) => `${step.step}: ${step.status}${step.code === undefined ? '' : ` (${step.code})`}`)),
    '',
    '## Selection Issues',
    '',
    formatMarkdownList(issueLines),
    '',
    '## Failed Step',
    '',
    failedStep ? `${failedStep.step}: ${failedStep.stderr ?? failedStep.stdout ?? 'No output captured.'}` : 'None',
    '',
  ].join('\n');
}

async function writeManifest({
  manifestPath,
  status,
  inputs,
  files,
  steps,
}) {
  const adapterTemplate = await readJsonIfExists(files.adapterTemplatePath);
  const adapterSelectionReport = await readJsonIfExists(files.adapterSelectionReportPath);
  const adapterPromotion = await readJsonIfExists(files.adapterPromotionManifestPath);
  const reviewBundle = await readJsonIfExists(files.reviewBundleManifestPath);
  const answerResponseReport = await readJsonIfExists(files.reviewBundleFilledTemplateConversionReportPath);
  const answerApplyReport = await readJsonIfExists(files.reviewBundleAnswerApplyReportPath);
  const fileAvailability = await getFileAvailability(files);
  const summary = {
    adapterTemplate: adapterTemplate?.summary ?? null,
    adapterPromotion: adapterPromotion?.summary ?? null,
    selectionIssues: adapterSelectionReport?.issues ?? [],
    answerResponse: answerResponseReport?.summary ?? reviewBundle?.summary?.intakeAnswerResponse ?? null,
    answerResponseIssues: answerResponseReport?.issues ?? [],
    answerApply: answerApplyReport?.summary ?? reviewBundle?.summary?.intakeAnswerApply ?? null,
    answerApplyIssues: answerApplyReport?.issues ?? [],
    reviewBundle: reviewBundle?.summary ?? null,
  };
  const manifest = {
    reviewOnly: true,
    safePayload: true,
    generatedAt: new Date().toISOString(),
    source: 'DayOf name-change form population run from reviewer selections',
    status,
    inputs,
    files,
    fileAvailability,
    steps,
    nextActions: buildNextActions({ status, files, steps, summary }),
    summary,
  };

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  await writeFile(files.runIndexPath, buildRunIndexHtml(manifest), 'utf8');
  await writeFile(files.runHandoffPath, buildRunHandoffMarkdown(manifest), 'utf8');
  return manifest;
}

async function main() {
  const { populationPath, probePath, selectionsPath, answersPath, filledTemplatePath, outputDir, lastMappedAt } = parseArgs(process.argv.slice(2));
  if (!populationPath || !probePath || !selectionsPath || !outputDir) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }
  if (answersPath && filledTemplatePath) {
    throw new Error('Use either --answers or --filled-template, not both.');
  }

  const absolutePopulationPath = resolve(populationPath);
  const absoluteProbePath = resolve(probePath);
  const absoluteSelectionsPath = resolve(selectionsPath);
  const absoluteAnswersPath = answersPath ? resolve(answersPath) : null;
  const absoluteFilledTemplatePath = filledTemplatePath ? resolve(filledTemplatePath) : null;
  const hasAnswerInput = Boolean(absoluteAnswersPath || absoluteFilledTemplatePath);
  const absoluteOutputDir = resolve(outputDir);
  const adapterDir = join(absoluteOutputDir, 'pdf-adapter');
  const adapterPromotionDir = join(absoluteOutputDir, 'pdf-adapter-promotion');
  const reviewBundleDir = join(absoluteOutputDir, 'review-bundle');
  const adapterTemplatePath = join(adapterDir, 'name-change-pdf-adapter-template.json');
  const adapterTemplateIndexPath = join(adapterDir, 'name-change-pdf-adapter-template.html');
  const adapterTemplateStarterSelectionsPath = join(adapterDir, 'name-change-pdf-adapter-template.selections.json');
  const adapterSelectionTodoPath = join(adapterDir, 'name-change-pdf-adapter-selection-todo.json');
  const adapterSelectionTodoMarkdownPath = join(adapterDir, 'name-change-pdf-adapter-selection-todo.md');
  const adapterSelectionTodoHtmlPath = join(adapterDir, 'name-change-pdf-adapter-selection-todo.html');
  const adapterReviewedTemplatePath = join(adapterPromotionDir, 'name-change-pdf-adapter-template.reviewed.json');
  const adapterSelectionReportPath = join(adapterPromotionDir, 'name-change-pdf-adapter-selection-report.json');
  const adapterSelectionReportIndexPath = join(adapterPromotionDir, 'name-change-pdf-adapter-selection-report.html');
  const adapterValidationReportPath = join(adapterPromotionDir, 'name-change-pdf-adapter-template-validation.json');
  const adapterValidationReportIndexPath = join(adapterPromotionDir, 'name-change-pdf-adapter-template-validation.html');
  const adapterCatalogPath = join(adapterPromotionDir, 'name-change-pdf-adapter-catalog.json');
  const adapterPromotionManifestPath = join(adapterPromotionDir, 'name-change-pdf-adapter-promotion-manifest.json');
  const reviewBundleIndexPath = join(reviewBundleDir, 'dayof-name-change-review-index.html');
  const reviewBundleManifestPath = join(reviewBundleDir, 'dayof-name-change-review-bundle-manifest.json');
  const reviewBundleAnsweredPopulationPath = hasAnswerInput
    ? join(reviewBundleDir, 'dayof-name-change-population-plan.answered.json')
    : null;
  const reviewBundleAnswerApplyReportPath = hasAnswerInput
    ? join(reviewBundleDir, 'dayof-name-change-intake-answer-apply-report.json')
    : null;
  const reviewBundleFilledTemplateConversionReportPath = absoluteFilledTemplatePath
    ? join(reviewBundleDir, 'dayof-name-change-filled-template-conversion-report.json')
    : null;
  const reviewBundleFilledTemplateReadinessIndexPath = absoluteFilledTemplatePath
    ? join(reviewBundleDir, 'dayof-name-change-filled-template-readiness.html')
    : null;
  const runIndexPath = join(absoluteOutputDir, 'dayof-name-change-form-population-run-index.html');
  const runHandoffPath = join(absoluteOutputDir, 'dayof-name-change-form-population-run-handoff.md');
  const runValidationPath = join(absoluteOutputDir, 'dayof-name-change-form-population-run-validation.json');
  const runManifestPath = join(absoluteOutputDir, 'dayof-name-change-form-population-run-manifest.json');

  await mkdir(adapterDir, { recursive: true });
  await mkdir(adapterPromotionDir, { recursive: true });
  await mkdir(reviewBundleDir, { recursive: true });

  const files = {
    adapterTemplatePath,
    adapterTemplateIndexPath,
    adapterTemplateStarterSelectionsPath,
    adapterSelectionTodoPath,
    adapterSelectionTodoMarkdownPath,
    adapterSelectionTodoHtmlPath,
    adapterPromotionDir,
    adapterReviewedTemplatePath,
    adapterSelectionReportPath,
    adapterSelectionReportIndexPath,
    adapterValidationReportPath,
    adapterValidationReportIndexPath,
    adapterCatalogPath,
    adapterPromotionManifestPath,
    reviewBundleDir,
    reviewBundleIndexPath,
    reviewBundleManifestPath,
    reviewBundleAnsweredPopulationPath,
    reviewBundleAnswerApplyReportPath,
    reviewBundleFilledTemplateConversionReportPath,
    reviewBundleFilledTemplateReadinessIndexPath,
    runIndexPath,
    runHandoffPath,
    runValidationPath,
    runManifestPath,
  };
  const inputs = {
    populationPath: absolutePopulationPath,
    probePath: absoluteProbePath,
    selectionsPath: absoluteSelectionsPath,
    answersPath: absoluteAnswersPath,
    filledTemplatePath: absoluteFilledTemplatePath,
    lastMappedAt,
  };
  const steps = [];

  const templateResult = await runNodeScript('v1-build-name-change-pdf-adapter-template.mjs', [
    '--population',
    absolutePopulationPath,
    '--probe',
    absoluteProbePath,
    '--output',
    adapterTemplatePath,
    '--index',
    adapterTemplateIndexPath,
    '--selections',
    adapterTemplateStarterSelectionsPath,
    '--todo',
    adapterSelectionTodoPath,
    '--todo-md',
    adapterSelectionTodoMarkdownPath,
    '--todo-html',
    adapterSelectionTodoHtmlPath,
  ]);
  steps.push({
    step: 'build_adapter_template',
    status: getStepStatus(templateResult),
    code: templateResult.code,
    stdout: templateResult.stdout || null,
    stderr: templateResult.stderr,
  });

  if (!templateResult.ok) {
    const manifest = await writeManifest({
      manifestPath: runManifestPath,
      status: 'failed',
      inputs,
      files,
      steps,
    });
    const validation = await validateRunOutput({ runManifestPath, runValidationPath });
    console.log(JSON.stringify({
      reviewOnly: true,
      safePayload: true,
      status: manifest.status,
      manifestPath: runManifestPath,
      indexPath: runIndexPath,
      handoffPath: runHandoffPath,
      validationPath: runValidationPath,
      validation: validation.report?.status ?? (validation.result.ok ? 'passed' : 'failed'),
      summary: manifest.summary,
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  const promotionResult = await runNodeScript('v1-build-name-change-pdf-adapter-catalog-from-selections.mjs', [
    '--template',
    adapterTemplatePath,
    '--selections',
    absoluteSelectionsPath,
    '--outdir',
    adapterPromotionDir,
    '--last-mapped-at',
    lastMappedAt,
  ]);
  steps.push({
    step: 'promote_adapter_catalog',
    status: getStepStatus(promotionResult),
    code: promotionResult.code,
    stdout: promotionResult.stdout || null,
    stderr: promotionResult.stderr,
  });

  if (!promotionResult.ok) {
    const manifest = await writeManifest({
      manifestPath: runManifestPath,
      status: 'failed',
      inputs,
      files,
      steps,
    });
    const validation = await validateRunOutput({ runManifestPath, runValidationPath });
    console.log(JSON.stringify({
      reviewOnly: true,
      safePayload: true,
      status: manifest.status,
      manifestPath: runManifestPath,
      indexPath: runIndexPath,
      handoffPath: runHandoffPath,
      validationPath: runValidationPath,
      validation: validation.report?.status ?? (validation.result.ok ? 'passed' : 'failed'),
      summary: manifest.summary,
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  const bundleArgs = [
    '--population',
    absolutePopulationPath,
    '--catalog',
    adapterCatalogPath,
    ...(absoluteAnswersPath ? ['--answers', absoluteAnswersPath] : []),
    ...(absoluteFilledTemplatePath ? ['--filled-template', absoluteFilledTemplatePath] : []),
    '--outdir',
    reviewBundleDir,
  ];
  const bundleResult = await runNodeScript('v1-build-name-change-review-bundle.mjs', bundleArgs, {
    sensitivePaths: [absoluteAnswersPath, absoluteFilledTemplatePath],
  });
  steps.push({
    step: 'build_review_bundle',
    status: getStepStatus(bundleResult),
    code: bundleResult.code,
    stdout: bundleResult.stdout || null,
    stderr: bundleResult.stderr,
  });

  const manifest = await writeManifest({
    manifestPath: runManifestPath,
    status: getRunStatus(steps),
    inputs,
    files,
    steps,
  });
  const validation = await validateRunOutput({ runManifestPath, runValidationPath });

  console.log(JSON.stringify({
    reviewOnly: true,
    safePayload: true,
    status: manifest.status,
    outputDir: absoluteOutputDir,
    catalogPath: (await fileExists(adapterCatalogPath)) ? adapterCatalogPath : null,
    reviewBundleManifestPath: (await fileExists(reviewBundleManifestPath)) ? reviewBundleManifestPath : null,
    indexPath: runIndexPath,
    handoffPath: runHandoffPath,
    validationPath: runValidationPath,
    validation: validation.report?.status ?? (validation.result.ok ? 'passed' : 'failed'),
    manifestPath: runManifestPath,
    summary: manifest.summary,
  }, null, 2));

  if (manifest.status !== 'passed' || validation.report?.status !== 'passed') {
    process.exitCode = 1;
  }
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
