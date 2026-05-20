#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptDir = dirname(fileURLToPath(import.meta.url));

function usage() {
  return [
    'Usage:',
    '  node scripts/v1-build-name-change-review-bundle.mjs --population /path/dayof-name-change-population-plan.json --outdir /tmp/name-change-review-bundle',
    '  node scripts/v1-build-name-change-review-bundle.mjs --population /path/dayof-name-change-population-plan.json --catalog /tmp/name-change-pdf-adapter-catalog.json --outdir /tmp/name-change-review-bundle',
    '  node scripts/v1-build-name-change-review-bundle.mjs --population /path/dayof-name-change-population-plan.json --answers /tmp/dayof-name-change-intake-answer-response.json --outdir /tmp/name-change-review-bundle',
    '  node scripts/v1-build-name-change-review-bundle.mjs --population /path/dayof-name-change-population-plan.json --filled-template /tmp/dayof-name-change-intake-answer-template.filled.json --outdir /tmp/name-change-review-bundle',
    '',
    'Use this after the population plan has been exported from DayOf. If --catalog is present, it is applied before answer intake and draft/FDF/review packet generation. Use either --answers or --filled-template, not both.',
  ].join('\n');
}

function parseArgs(argv) {
  const parsed = {
    populationPath: null,
    catalogPath: null,
    answersPath: null,
    filledTemplatePath: null,
    outputDir: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--population') {
      parsed.populationPath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--catalog') {
      parsed.catalogPath = argv[index + 1] ?? null;
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
    }
  }

  return parsed;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readJsonIfExists(path) {
  if (!path) return null;
  try {
    return await readJson(path);
  } catch {
    return null;
  }
}

async function rewriteJsonIfExists(path, updater) {
  const payload = await readJsonIfExists(path);
  if (!payload) return null;
  const updated = updater(payload);
  await writeFile(path, JSON.stringify(updated, null, 2), 'utf8');
  return updated;
}

function sanitizeFilledTemplateConversionReport(report) {
  return {
    ...report,
    outputPath: null,
    temporaryAnswerResponseRemoved: true,
    valueBearingPathsOmitted: true,
  };
}

function sanitizeAnswerApplyReport(report) {
  return {
    ...report,
    answersPath: null,
    outputPath: null,
    valueBearingPathsOmitted: true,
  };
}

function sanitizeFilledTemplateApplyReport(report) {
  return {
    ...sanitizeAnswerApplyReport(report),
    answersSource: 'filled_template',
    temporaryAnswerResponseRemoved: true,
  };
}

function sanitizeTemporaryAnswerResponsePath(value) {
  return String(value)
    .replace(/(v1-build-name-change-intake-answer-response\.mjs --template )\S+/g, '$1[filled-template-removed]')
    .replace(/(v1-apply-name-change-intake-answers\.mjs[^\n]*? --answers )\S+/g, '$1[value-bearing answer response removed]')
    .replace(/(v1-apply-name-change-intake-answers\.mjs[^\n]*? --output )\S+/g, '$1[value-bearing answered population removed]')
    .replace(/(v1-build-name-change-review-bundle\.mjs[^\n]*? --answers )\S+/g, '$1[value-bearing answer response removed]')
    .replace(/\S*dayof-name-change-answer-response-[^\s]*\/dayof-name-change-intake-answer-response\.json/g, '[temporary answer response removed]');
}

function validatePopulationPayload(payload) {
  if (!payload || typeof payload !== 'object' || payload.reviewOnly !== true || !Array.isArray(payload.items)) {
    throw new Error('Population payload must be reviewOnly JSON with an items array.');
  }
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
  if (status === 'ready_for_review') return 'ready';
  if (status === 'guided_online') return 'guided';
  return 'blocked';
}

function renderList(items) {
  if (!items.length) return '<p class="empty">None</p>';

  return [
    '<ul>',
    ...items.map((item) => `<li>${escapeHtml(item)}</li>`),
    '</ul>',
  ].join('\n');
}

function renderReviewPacketItem(item) {
  const fieldRows = item.fieldInstructions.length > 0
    ? item.fieldInstructions.map((field) => `
      <tr>
        <td>${escapeHtml(field.copyInstruction ?? field.instruction)}</td>
        <td><code>${escapeHtml(field.pdfFieldName)}</code></td>
        <td>${escapeHtml(field.value)}</td>
        <td>${renderList(field.reviewSteps ?? [field.reviewPrompt].filter(Boolean))}</td>
      </tr>
    `).join('\n')
    : '<tr><td colspan="4" class="empty">No field instructions</td></tr>';
  const blockers = item.blockers.map((blocker) => blocker.reason);

  return `
    <section class="form-card">
      <div class="form-head">
        <div>
          <h2>${escapeHtml(item.formCode)}</h2>
          <p>${escapeHtml(item.formLabel)}</p>
        </div>
        <span class="status ${getStatusClass(item.status)}">${escapeHtml(item.statusLabel)}</span>
      </div>
      <p class="next">${escapeHtml(item.nextAction)}</p>
      <div class="meta">
        ${item.officialUrl ? `<a href="${escapeHtml(item.officialUrl)}">Official source</a>` : ''}
        <span>${escapeHtml(item.officialRevisionLabel)}</span>
        ${item.fdfFileName ? `<span>${escapeHtml(item.fdfFileName)}</span>` : ''}
      </div>
      <table>
        <thead>
          <tr>
            <th>Reviewer action</th>
            <th>PDF field</th>
            <th>Safe value</th>
            <th>Field checks</th>
          </tr>
        </thead>
        <tbody>
          ${fieldRows}
        </tbody>
      </table>
      <div class="split">
        <div>
          <h3>Review checks</h3>
          ${renderList(item.reviewChecklist)}
        </div>
        <div>
          <h3>Blockers</h3>
          ${renderList(blockers)}
        </div>
      </div>
    </section>
  `;
}

function buildReviewIndexHtml({ bundleManifest, intakeGapReport, reviewPacket }) {
  const answerResponseSummary = bundleManifest.summary.intakeAnswerResponse;
  const answerApplySummary = bundleManifest.summary.intakeAnswerApply;
  const answerResponseSummaryHtml = answerResponseSummary
    ? `<div><span>Filled answers</span><strong>${escapeHtml(answerResponseSummary.answerFields)}</strong></div>`
    : '';
  const answerApplySummaryHtml = answerApplySummary
    ? `<div><span>Answers applied</span><strong>${escapeHtml(answerApplySummary.appliedAnswers)}</strong></div>`
    : '';
  const answerApplyFilesHtml = bundleManifest.files.answerApplyReportPath
    ? `
        <p><code>${escapeHtml(bundleManifest.files.answerApplyReportPath)}</code></p>
      `
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DayOf Name Change Review Bundle</title>
  <style>
    :root {
      color-scheme: light;
      --text: #172033;
      --muted: #667085;
      --line: #d9deea;
      --surface: #f7f8fb;
      --ready: #087443;
      --blocked: #b42318;
      --guided: #475467;
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
    h1, h2, h3, p {
      margin: 0;
    }
    header {
      border-bottom: 1px solid var(--line);
      padding-bottom: 20px;
    }
    header p {
      color: var(--muted);
      margin-top: 8px;
      max-width: 720px;
    }
    .summary {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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
    .files {
      background: var(--surface);
      border-radius: 8px;
      margin-top: 20px;
      padding: 14px;
    }
    .files code, td code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 12px;
    }
    .form-grid {
      display: grid;
      gap: 16px;
      margin-top: 20px;
    }
    .form-head {
      align-items: flex-start;
      display: flex;
      gap: 16px;
      justify-content: space-between;
    }
    .form-head p, .next, .empty, li {
      color: var(--muted);
      font-size: 13px;
    }
    .next {
      margin-top: 12px;
    }
    .status {
      border-radius: 999px;
      font-size: 12px;
      padding: 5px 9px;
      white-space: nowrap;
    }
    .status.ready {
      background: #ecfdf3;
      color: var(--ready);
    }
    .status.blocked {
      background: #fef3f2;
      color: var(--blocked);
    }
    .status.guided {
      background: #f2f4f7;
      color: var(--guided);
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    .meta a, .meta span {
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--muted);
      font-size: 12px;
      padding: 5px 9px;
      text-decoration: none;
    }
    table {
      border-collapse: collapse;
      margin-top: 14px;
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
    .split {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      margin-top: 14px;
    }
    .split h3 {
      font-size: 14px;
      margin-bottom: 8px;
    }
    ul {
      margin: 0;
      padding-left: 18px;
    }
    li + li {
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>DayOf Name Change Review Bundle</h1>
      <p>Review-only output for official form draft preparation. Nothing here submits a form, signs a form, or replaces official agency instructions.</p>
      <div class="summary">
        <div><span>Ready packets</span><strong>${escapeHtml(reviewPacket.summary.readyPackets)}</strong></div>
        <div><span>Blocked packets</span><strong>${escapeHtml(reviewPacket.summary.blockedPackets)}</strong></div>
        <div><span>Guided online</span><strong>${escapeHtml(reviewPacket.summary.guidedOnline)}</strong></div>
        <div><span>Intake gaps</span><strong>${escapeHtml(intakeGapReport.summary.totalGaps)}</strong></div>
        <div><span>Answer fields</span><strong>${escapeHtml(bundleManifest.summary.intakeAnswerTemplate.totalFields)}</strong></div>
        ${answerResponseSummaryHtml}
        ${answerApplySummaryHtml}
        <div><span>FDF files</span><strong>${escapeHtml(bundleManifest.summary.fdf.exportedFdfFiles)}</strong></div>
      </div>
      <div class="files">
        <p><strong>Bundle files</strong></p>
        <p><code>${escapeHtml(bundleManifest.files.mappedPopulationPath)}</code></p>
        ${bundleManifest.files.filledTemplateConversionReportPath ? `<p><code>${escapeHtml(bundleManifest.files.filledTemplateConversionReportPath)}</code></p>` : ''}
        ${bundleManifest.files.filledTemplateReadinessIndexPath ? `<p><code>${escapeHtml(bundleManifest.files.filledTemplateReadinessIndexPath)}</code></p>` : ''}
        ${answerApplyFilesHtml}
        <p><code>${escapeHtml(bundleManifest.files.intakeGapReportPath)}</code></p>
        <p><code>${escapeHtml(bundleManifest.files.intakeGapIndexPath)}</code></p>
        <p><code>${escapeHtml(bundleManifest.files.intakeAnswerTemplatePath)}</code></p>
        <p><code>${escapeHtml(bundleManifest.files.intakeAnswerIndexPath)}</code></p>
        <p><code>${escapeHtml(bundleManifest.files.draftPayloadPath)}</code></p>
        <p><code>${escapeHtml(bundleManifest.files.fdfManifestPath)}</code></p>
        <p><code>${escapeHtml(bundleManifest.files.reviewPacketPath)}</code></p>
      </div>
    </header>
    <div class="form-grid">
      ${reviewPacket.items.map(renderReviewPacketItem).join('\n')}
    </div>
  </main>
</body>
</html>
`;
}

async function runNodeScript(scriptName, args) {
  const scriptPath = join(scriptDir, scriptName);
  const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath, ...args], {
    maxBuffer: 1024 * 1024 * 10,
  });

  if (stderr.trim()) {
    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
    };
  }

  return {
    stdout: stdout.trim(),
    stderr: null,
  };
}

async function preparePopulation({ populationPath, catalogPath, outputPath }) {
  if (catalogPath) {
    const result = await runNodeScript('v1-apply-name-change-pdf-adapter-catalog.mjs', [
      '--population',
      populationPath,
      '--catalog',
      catalogPath,
      '--output',
      outputPath,
    ]);

    return {
      mode: 'catalog_applied',
      commandOutput: result.stdout,
      commandError: result.stderr,
    };
  }

  const populationPayload = await readJson(populationPath);
  validatePopulationPayload(populationPayload);
  await writeFile(outputPath, JSON.stringify({
    ...populationPayload,
    generatedAt: populationPayload.generatedAt ?? new Date().toISOString(),
  }, null, 2), 'utf8');

  return {
    mode: 'existing_population_used',
    commandOutput: null,
    commandError: null,
  };
}

async function main() {
  const { populationPath, catalogPath, answersPath, filledTemplatePath, outputDir } = parseArgs(process.argv.slice(2));
  if (!populationPath || !outputDir) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }
  if (answersPath && filledTemplatePath) {
    throw new Error('Use either --answers or --filled-template, not both.');
  }

  const absoluteOutputDir = resolve(outputDir);
  const absolutePopulationPath = resolve(populationPath);
  const absoluteCatalogPath = catalogPath ? resolve(catalogPath) : null;
  const absoluteAnswersPath = answersPath ? resolve(answersPath) : null;
  const absoluteFilledTemplatePath = filledTemplatePath ? resolve(filledTemplatePath) : null;
  const hasAnswerInput = Boolean(absoluteAnswersPath || absoluteFilledTemplatePath);
  const mappedPopulationPath = join(absoluteOutputDir, 'dayof-name-change-population-plan.mapped.json');
  const answeredPopulationPath = hasAnswerInput
    ? join(absoluteOutputDir, 'dayof-name-change-population-plan.answered.json')
    : null;
  const answerApplyReportPath = hasAnswerInput
    ? join(absoluteOutputDir, 'dayof-name-change-intake-answer-apply-report.json')
    : null;
  const filledTemplateConversionReportPath = absoluteFilledTemplatePath
    ? join(absoluteOutputDir, 'dayof-name-change-filled-template-conversion-report.json')
    : null;
  const filledTemplateReadinessIndexPath = absoluteFilledTemplatePath
    ? join(absoluteOutputDir, 'dayof-name-change-filled-template-readiness.html')
    : null;
  const intakeGapReportPath = join(absoluteOutputDir, 'dayof-name-change-intake-gap-report.json');
  const intakeGapIndexPath = join(absoluteOutputDir, 'dayof-name-change-intake-gap-report.html');
  const intakeAnswerTemplatePath = join(absoluteOutputDir, 'dayof-name-change-intake-answer-template.json');
  const intakeAnswerIndexPath = join(absoluteOutputDir, 'dayof-name-change-intake-answer-template.html');
  const draftPayloadPath = join(absoluteOutputDir, 'dayof-name-change-draft-output-payload.json');
  const fdfOutputDir = join(absoluteOutputDir, 'fdf');
  const fdfManifestPath = join(fdfOutputDir, 'dayof-name-change-fdf-export-manifest.json');
  const reviewPacketPath = join(absoluteOutputDir, 'dayof-name-change-pdf-review-packet.json');
  const reviewIndexPath = join(absoluteOutputDir, 'dayof-name-change-review-index.html');
  const validationReportPath = join(absoluteOutputDir, 'dayof-name-change-review-bundle-validation.json');
  const bundleManifestPath = join(absoluteOutputDir, 'dayof-name-change-review-bundle-manifest.json');

  await mkdir(absoluteOutputDir, { recursive: true });

  const populationStep = await preparePopulation({
    populationPath: absolutePopulationPath,
    catalogPath: absoluteCatalogPath,
    outputPath: mappedPopulationPath,
  });

  let activePopulationPath = mappedPopulationPath;
  let activeAnswersPath = absoluteAnswersPath;
  let temporaryAnswerResponseDir = null;
  let intakeAnswerResponseStep = null;
  let intakeAnswerResponseReport = null;
  let intakeAnswerApplyStep = null;
  let intakeAnswerApplyReport = null;

  try {
    if (absoluteFilledTemplatePath) {
      temporaryAnswerResponseDir = await mkdtemp(join(tmpdir(), 'dayof-name-change-answer-response-'));
      activeAnswersPath = join(temporaryAnswerResponseDir, 'dayof-name-change-intake-answer-response.json');
      try {
        intakeAnswerResponseStep = await runNodeScript('v1-build-name-change-intake-answer-response.mjs', [
          '--template',
          absoluteFilledTemplatePath,
          '--output',
          activeAnswersPath,
          '--report',
          filledTemplateConversionReportPath,
          '--index',
          filledTemplateReadinessIndexPath,
        ]);
      } catch (error) {
        await rewriteJsonIfExists(filledTemplateConversionReportPath, sanitizeFilledTemplateConversionReport);
        throw error;
      }
      intakeAnswerResponseReport = await rewriteJsonIfExists(filledTemplateConversionReportPath, sanitizeFilledTemplateConversionReport);
    }

    if (activeAnswersPath) {
      try {
        intakeAnswerApplyStep = await runNodeScript('v1-apply-name-change-intake-answers.mjs', [
          '--population',
          mappedPopulationPath,
          '--answers',
          activeAnswersPath,
          '--output',
          answeredPopulationPath,
          '--report',
          answerApplyReportPath,
        ]);
      } catch (error) {
        await rewriteJsonIfExists(
          answerApplyReportPath,
          absoluteFilledTemplatePath ? sanitizeFilledTemplateApplyReport : sanitizeAnswerApplyReport,
        );
        throw error;
      }
      activePopulationPath = answeredPopulationPath;
      intakeAnswerApplyReport = absoluteFilledTemplatePath
        ? await rewriteJsonIfExists(answerApplyReportPath, sanitizeFilledTemplateApplyReport)
        : await rewriteJsonIfExists(answerApplyReportPath, sanitizeAnswerApplyReport);
    }
  } finally {
    if (temporaryAnswerResponseDir) {
      await rm(temporaryAnswerResponseDir, { recursive: true, force: true });
    }
  }

  const intakeGapStep = await runNodeScript('v1-build-name-change-intake-gap-report.mjs', [
    '--population',
    activePopulationPath,
    '--output',
    intakeGapReportPath,
    '--index',
    intakeGapIndexPath,
  ]);
  const intakeAnswerStep = await runNodeScript('v1-build-name-change-intake-answer-template.mjs', [
    '--gaps',
    intakeGapReportPath,
    '--output',
    intakeAnswerTemplatePath,
    '--index',
    intakeAnswerIndexPath,
  ]);
  const draftStep = await runNodeScript('v1-build-name-change-draft-output.mjs', [
    '--population',
    activePopulationPath,
    '--output',
    draftPayloadPath,
  ]);
  const fdfStep = await runNodeScript('v1-export-name-change-fdf.mjs', [
    '--input',
    draftPayloadPath,
    '--outdir',
    fdfOutputDir,
  ]);
  const reviewPacketStep = await runNodeScript('v1-build-name-change-pdf-review-packet.mjs', [
    '--population',
    activePopulationPath,
    '--draft',
    draftPayloadPath,
    '--fdf-manifest',
    fdfManifestPath,
    '--output',
    reviewPacketPath,
  ]);

  const populationPayload = await readJson(activePopulationPath);
  const intakeGapReport = await readJson(intakeGapReportPath);
  const intakeAnswerTemplate = await readJson(intakeAnswerTemplatePath);
  const draftPayload = await readJson(draftPayloadPath);
  const fdfManifest = await readJson(fdfManifestPath);
  const reviewPacket = await readJson(reviewPacketPath);
  const bundleManifest = {
    reviewOnly: true,
    safePayload: true,
    generatedAt: new Date().toISOString(),
    source: 'DayOf name-change review bundle',
    inputs: {
      populationPath: absolutePopulationPath,
      catalogPath: absoluteCatalogPath,
      answersPath: absoluteAnswersPath,
      filledTemplatePath: absoluteFilledTemplatePath,
    },
    files: {
      mappedPopulationPath,
      activePopulationPath,
      answeredPopulationPath,
      answerApplyReportPath,
      filledTemplateConversionReportPath,
      filledTemplateReadinessIndexPath,
      intakeGapReportPath,
      intakeGapIndexPath,
      intakeAnswerTemplatePath,
      intakeAnswerIndexPath,
      draftPayloadPath,
      fdfManifestPath,
      reviewPacketPath,
      reviewIndexPath,
      validationReportPath,
      bundleManifestPath,
      fdfOutputDir,
    },
    steps: [
      {
        step: 'population',
        mode: populationStep.mode,
        stderr: populationStep.commandError,
      },
      ...(intakeAnswerResponseStep
        ? [{
          step: 'intake_answer_response',
          stderr: intakeAnswerResponseStep.stderr,
        }]
        : []),
      ...(intakeAnswerApplyStep
        ? [{
          step: 'intake_answer_apply',
          stderr: intakeAnswerApplyStep.stderr,
        }]
        : []),
      {
        step: 'intake_gap_report',
        stderr: intakeGapStep.stderr,
      },
      {
        step: 'intake_answer_template',
        stderr: intakeAnswerStep.stderr,
      },
      {
        step: 'draft_output',
        stderr: draftStep.stderr,
      },
      {
        step: 'fdf_export',
        stderr: fdfStep.stderr,
      },
      {
        step: 'pdf_review_packet',
        stderr: reviewPacketStep.stderr,
      },
    ],
    summary: {
      population: populationPayload.answerApplySummary ?? populationPayload.applySummary ?? populationPayload.summary ?? null,
      intakeAnswerResponse: intakeAnswerResponseReport?.summary ?? null,
      intakeAnswerApply: intakeAnswerApplyReport?.summary ?? null,
      intakeGaps: intakeGapReport.summary,
      intakeAnswerTemplate: intakeAnswerTemplate.summary,
      draft: draftPayload.summary,
      fdf: fdfManifest.summary,
      reviewPacket: reviewPacket.summary,
    },
  };

  await writeFile(reviewIndexPath, buildReviewIndexHtml({
    bundleManifest,
    intakeGapReport,
    reviewPacket,
  }), 'utf8');
  await writeFile(bundleManifestPath, JSON.stringify(bundleManifest, null, 2), 'utf8');
  await runNodeScript('v1-validate-name-change-review-bundle.mjs', [
    '--manifest',
    bundleManifestPath,
    '--output',
    validationReportPath,
  ]);
  const validationReport = await readJson(validationReportPath);

  console.log(JSON.stringify({
    reviewOnly: true,
    safePayload: true,
    outputDir: absoluteOutputDir,
    manifestPath: bundleManifestPath,
    validationPath: validationReportPath,
    validation: validationReport.status,
    summary: bundleManifest.summary,
  }, null, 2));
}

await main().catch((error) => {
  console.error(sanitizeTemporaryAnswerResponsePath(error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
