#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

function usage() {
  return [
    'Usage:',
    '  node scripts/v1-build-name-change-intake-gap-report.mjs --population /tmp/dayof-name-change-population-plan.json --output /tmp/dayof-name-change-intake-gap-report.json',
    '',
    'Builds a no-values intake gap report from a review-only population plan.',
  ].join('\n');
}

function parseArgs(argv) {
  const parsed = {
    populationPath: null,
    outputPath: null,
    indexPath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--population') {
      parsed.populationPath = argv[index + 1] ?? null;
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

function validatePopulationPayload(payload) {
  if (!payload || typeof payload !== 'object' || payload.reviewOnly !== true || !Array.isArray(payload.items)) {
    throw new Error('Population payload must be reviewOnly JSON with an items array.');
  }
}

function uniq(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getCategory(field) {
  if (field.redactionPolicy === 'requires_secure_session') return 'secure_session';
  if (field.redactionPolicy === 'requires_consent') return 'consent';
  if (!field.hasValue || field.valueStatus === 'missing' || field.mappingStatus === 'blocked') return 'user_info';
  if (field.mappingStatus === 'needs_pdf_field_probe') return 'pdf_mapping';
  return null;
}

function getPriority(category) {
  if (category === 'user_info') return 0;
  if (category === 'secure_session') return 1;
  if (category === 'consent') return 2;
  return 3;
}

function getStatusLabel(category) {
  if (category === 'user_info') return 'Needs answer';
  if (category === 'secure_session') return 'Secure session';
  if (category === 'consent') return 'Consent needed';
  return 'PDF mapping';
}

function lowerFirst(value) {
  return value ? `${value.charAt(0).toLowerCase()}${value.slice(1)}` : value;
}

function getPrompt(field, category) {
  if (category === 'secure_session') return `Enter ${lowerFirst(field.officialFieldLabel)} in a secure session.`;
  if (category === 'consent' && field.hasValue) return `May DayOf use saved ${lowerFirst(field.officialFieldLabel)} for this review-only draft?`;
  if (category === 'consent') return `Collect ${lowerFirst(field.officialFieldLabel)} with explicit consent.`;
  if (category === 'pdf_mapping') return `Which official PDF field should receive ${lowerFirst(field.officialFieldLabel)}?`;
  return `What should DayOf use for ${lowerFirst(field.officialFieldLabel)}?`;
}

function getHelperText(category) {
  if (category === 'secure_session') return 'Use the value only during draft generation. Do not store it in the normal planner.';
  if (category === 'consent') return 'Use or save this sensitive value only after explicit consent for the current review-only draft.';
  if (category === 'pdf_mapping') return 'Map this semantic field to a visually reviewed official PDF field before generating drafts.';
  return 'Ask once, then reuse the answer anywhere this field is needed.';
}

function getNextAction(field, category) {
  if (category === 'secure_session') return `Open secure intake for ${field.officialFieldLabel}.`;
  if (category === 'consent' && field.hasValue) return `Capture consent to use saved ${field.officialFieldLabel}.`;
  if (category === 'consent') return `Collect ${field.officialFieldLabel} and capture save/use consent.`;
  if (category === 'pdf_mapping') return `Visually map ${field.officialFieldLabel} to the official PDF field.`;
  return `Ask for ${field.officialFieldLabel} once and refresh the population plan.`;
}

function buildGap(field, category, item) {
  return {
    gapKey: `${category}:${field.fieldKey}`,
    category,
    statusLabel: getStatusLabel(category),
    fieldKey: field.fieldKey,
    label: field.officialFieldLabel,
    prompt: getPrompt(field, category),
    helperText: getHelperText(category),
    formCodes: [item.formCode],
    formLabels: [item.formLabel],
    officialRevisionLabels: [item.officialRevisionLabel],
    sources: [field.source],
    redactionPolicy: field.redactionPolicy,
    currentValueKnown: Boolean(field.hasValue),
    priority: getPriority(category),
    nextAction: getNextAction(field, category),
  };
}

function mergeGap(existing, field, item) {
  return {
    ...existing,
    formCodes: uniq([...existing.formCodes, item.formCode]),
    formLabels: uniq([...existing.formLabels, item.formLabel]),
    officialRevisionLabels: uniq([...existing.officialRevisionLabels, item.officialRevisionLabel]),
    sources: uniq([...existing.sources, field.source]),
    currentValueKnown: existing.currentValueKnown || Boolean(field.hasValue),
  };
}

function getPrimaryAction(summary) {
  if (summary.userInfo > 0) return 'Collect missing user answers once, then refresh the population plan.';
  if (summary.secureSession > 0) return 'Open secure intake for values that should not live in normal planner state.';
  if (summary.consent > 0) return 'Capture consent before using sensitive saved values in review-only drafts.';
  if (summary.pdfMapping > 0) return 'Finish visually reviewed PDF field mappings before generating drafts.';
  return 'No intake gaps are blocking the current population plan.';
}

function buildReport(populationPayload) {
  const grouped = new Map();

  for (const item of populationPayload.items) {
    for (const field of item.fieldMappings ?? []) {
      const category = getCategory(field);
      if (!category) continue;
      const gapKey = `${category}:${field.fieldKey}`;
      const current = grouped.get(gapKey);
      grouped.set(gapKey, current ? mergeGap(current, field, item) : buildGap(field, category, item));
    }
  }

  const gaps = Array.from(grouped.values()).sort((left, right) => {
    if (left.priority !== right.priority) return left.priority - right.priority;
    if (right.formCodes.length !== left.formCodes.length) return right.formCodes.length - left.formCodes.length;
    return left.label.localeCompare(right.label);
  });
  const summary = {
    totalGaps: gaps.length,
    userInfo: gaps.filter((gap) => gap.category === 'user_info').length,
    secureSession: gaps.filter((gap) => gap.category === 'secure_session').length,
    consent: gaps.filter((gap) => gap.category === 'consent').length,
    pdfMapping: gaps.filter((gap) => gap.category === 'pdf_mapping').length,
    impactedForms: uniq(gaps.flatMap((gap) => gap.formCodes)).length,
  };

  return {
    reviewOnly: true,
    safePayload: true,
    containsUserValues: false,
    generatedAt: new Date().toISOString(),
    primaryAction: getPrimaryAction(summary),
    summary,
    gaps,
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

function getCategoryClass(category) {
  if (category === 'user_info') return 'info';
  if (category === 'secure_session') return 'secure';
  if (category === 'consent') return 'consent';
  return 'mapping';
}

function renderGap(gap) {
  return `
    <section class="gap ${getCategoryClass(gap.category)}">
      <div class="gap-head">
        <div>
          <h2>${escapeHtml(gap.label)}</h2>
          <p><code>${escapeHtml(gap.fieldKey)}</code></p>
        </div>
        <span>${escapeHtml(gap.statusLabel)}</span>
      </div>
      <p class="prompt">${escapeHtml(gap.prompt)}</p>
      <p>${escapeHtml(gap.helperText)}</p>
      <div class="meta">
        <span>${escapeHtml(gap.formCodes.join(', '))}</span>
        <span>${gap.currentValueKnown ? 'Value known, not shown' : 'No value shown'}</span>
      </div>
      <p class="next">${escapeHtml(gap.nextAction)}</p>
    </section>
  `;
}

function buildIndexHtml(report) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DayOf Name Change Intake Gap Report</title>
  <style>
    :root {
      color-scheme: light;
      --text: #172033;
      --muted: #667085;
      --line: #d0d5dd;
      --surface: #f8fafc;
      --info: #175cd3;
      --secure: #b42318;
      --consent: #93370d;
      --mapping: #344054;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body { background: #ffffff; color: var(--text); margin: 0; }
    main { margin: 0 auto; max-width: 1040px; padding: 32px 20px 48px; }
    h1, h2, p { margin: 0; }
    header { border-bottom: 1px solid var(--line); padding-bottom: 20px; }
    header p, .gap p { color: var(--muted); font-size: 13px; margin-top: 7px; }
    .summary { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); margin-top: 20px; }
    .summary div, .gap { border: 1px solid var(--line); border-radius: 8px; padding: 14px; }
    .summary span { color: var(--muted); display: block; font-size: 12px; }
    .summary strong { display: block; font-size: 20px; margin-top: 4px; }
    .gap-grid { display: grid; gap: 14px; margin-top: 20px; }
    .gap-head { align-items: flex-start; display: flex; gap: 12px; justify-content: space-between; }
    .gap-head h2 { font-size: 17px; }
    .gap-head span, .meta span { border-radius: 999px; font-size: 12px; padding: 5px 9px; white-space: nowrap; }
    .gap.info .gap-head span { background: #eff8ff; color: var(--info); }
    .gap.secure .gap-head span { background: #fef3f2; color: var(--secure); }
    .gap.consent .gap-head span { background: #fff6ed; color: var(--consent); }
    .gap.mapping .gap-head span { background: #f2f4f7; color: var(--mapping); }
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
      <h1>DayOf Name Change Intake Gap Report</h1>
      <p>No-values checklist for collecting each missing answer once before generating review-only form drafts.</p>
      <div class="summary">
        <div><span>Total gaps</span><strong>${escapeHtml(report.summary.totalGaps)}</strong></div>
        <div><span>Needs answer</span><strong>${escapeHtml(report.summary.userInfo)}</strong></div>
        <div><span>Secure session</span><strong>${escapeHtml(report.summary.secureSession)}</strong></div>
        <div><span>Consent</span><strong>${escapeHtml(report.summary.consent)}</strong></div>
        <div><span>PDF mapping</span><strong>${escapeHtml(report.summary.pdfMapping)}</strong></div>
      </div>
    </header>
    <div class="gap-grid">
      ${report.gaps.length ? report.gaps.map(renderGap).join('\n') : '<p class="empty">No intake gaps found.</p>'}
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
  const { populationPath, outputPath, indexPath } = parseArgs(process.argv.slice(2));
  if (!populationPath || !outputPath) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  const absolutePopulationPath = resolve(populationPath);
  const absoluteOutputPath = resolve(outputPath);
  const absoluteIndexPath = resolve(indexPath ?? getDefaultIndexPath(absoluteOutputPath));
  const populationPayload = JSON.parse(await readFile(absolutePopulationPath, 'utf8'));
  validatePopulationPayload(populationPayload);
  const report = buildReport(populationPayload);

  await mkdir(dirname(absoluteOutputPath), { recursive: true });
  await mkdir(dirname(absoluteIndexPath), { recursive: true });
  await writeFile(absoluteOutputPath, JSON.stringify(report, null, 2), 'utf8');
  await writeFile(absoluteIndexPath, buildIndexHtml(report), 'utf8');

  console.log(JSON.stringify({
    reviewOnly: true,
    safePayload: true,
    containsUserValues: false,
    outputPath: absoluteOutputPath,
    indexPath: absoluteIndexPath,
    summary: report.summary,
  }, null, 2));
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
