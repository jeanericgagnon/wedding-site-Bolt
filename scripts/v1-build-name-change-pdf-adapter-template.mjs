#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

function usage() {
  return [
    'Usage:',
    '  node scripts/v1-build-name-change-pdf-adapter-template.mjs --population /path/dayof-name-change-population-plan.json --probe /path/probe-results.json --output /tmp/name-change-pdf-adapter-template.json',
    '  node scripts/v1-build-name-change-pdf-adapter-template.mjs --population /path/dayof-name-change-population-plan.json --probe /path/probe-results.json --output /tmp/name-change-pdf-adapter-template.json --index /tmp/name-change-pdf-adapter-template.html --selections /tmp/name-change-pdf-adapter-selections.json --todo /tmp/name-change-pdf-adapter-selection-todo.json --todo-md /tmp/name-change-pdf-adapter-selection-todo.md --todo-html /tmp/name-change-pdf-adapter-selection-todo.html',
    '',
    'Population input should be copied from the Population readiness adapter JSON.',
    'Probe input should be output from scripts/v1-probe-name-change-pdf-fields.mjs.',
  ].join('\n');
}

function parseArgs(argv) {
  const parsed = {
    populationPath: null,
    probePath: null,
    outputPath: null,
    indexPath: null,
    selectionsPath: null,
    todoPath: null,
    todoMarkdownPath: null,
    todoHtmlPath: null,
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
    if (arg === '--output') {
      parsed.outputPath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--index') {
      parsed.indexPath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--selections') {
      parsed.selectionsPath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--todo') {
      parsed.todoPath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--todo-md') {
      parsed.todoMarkdownPath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--todo-html') {
      parsed.todoHtmlPath = argv[index + 1] ?? null;
      index += 1;
    }
  }

  return parsed;
}

function normalize(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function splitTokens(value) {
  return String(value)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function getAliasTokens(field) {
  const key = String(field.fieldKey ?? '').toLowerCase();
  const label = String(field.officialFieldLabel ?? '').toLowerCase();
  const aliases = [];

  if (key.includes('dateofbirth') || label.includes('date of birth')) aliases.push('dob', 'birth');
  if (key.includes('socialsecurity') || label.includes('social security')) aliases.push('ssn', 'social', 'security');
  if (key.includes('firstname') || label.includes('first name')) aliases.push('first', 'given');
  if (key.includes('middlename') || label.includes('middle name')) aliases.push('middle');
  if (key.includes('lastname') || label.includes('last name')) aliases.push('last', 'surname', 'family');
  if (key.includes('address') || label.includes('address')) aliases.push('address', 'street', 'city', 'state', 'zip');
  if (key.includes('phone') || label.includes('phone')) aliases.push('phone', 'telephone');
  if (key.includes('email') || label.includes('email')) aliases.push('email');
  if (key.includes('passport')) aliases.push('passport');
  if (key.includes('marriage')) aliases.push('marriage');

  return aliases;
}

function scoreCandidate(field, pdfFieldName) {
  const fieldKey = String(field.fieldKey ?? '');
  const label = String(field.officialFieldLabel ?? '');
  const normalizedPdf = normalize(pdfFieldName);
  const normalizedLabel = normalize(label);
  const fieldKeyTail = normalize(fieldKey.split('.').at(-1) ?? fieldKey);
  const tokens = Array.from(new Set([
    ...splitTokens(fieldKey),
    ...splitTokens(label),
    ...getAliasTokens(field),
  ]));
  const reasons = [];
  let score = 0;

  if (normalizedPdf && normalizedLabel && (normalizedPdf.includes(normalizedLabel) || normalizedLabel.includes(normalizedPdf))) {
    score += 45;
    reasons.push('label overlap');
  }
  if (fieldKeyTail && normalizedPdf.includes(fieldKeyTail)) {
    score += 30;
    reasons.push('field key overlap');
  }
  tokens.forEach((token) => {
    const normalizedToken = normalize(token);
    if (!normalizedToken || !normalizedPdf.includes(normalizedToken)) return;
    score += 10;
    reasons.push(`${token} token`);
  });

  if (score === 0) return null;
  return {
    pdfFieldName,
    score,
    reasons: Array.from(new Set(reasons)),
  };
}

function getCandidates(field, fieldNames) {
  return fieldNames
    .map((fieldName) => scoreCandidate(field, fieldName))
    .filter(Boolean)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.pdfFieldName.localeCompare(right.pdfFieldName);
    })
    .slice(0, 5);
}

function validatePopulationPayload(payload) {
  if (!payload || typeof payload !== 'object' || payload.reviewOnly !== true || !Array.isArray(payload.items)) {
    throw new Error('Population payload must be reviewOnly JSON with an items array.');
  }
}

function validateProbePayload(payload) {
  if (!payload || typeof payload !== 'object' || payload.reviewOnly !== true || !Array.isArray(payload.results)) {
    throw new Error('Probe payload must be reviewOnly JSON with a results array.');
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

function getDefaultIndexPath(outputPath) {
  if (outputPath.endsWith('.json')) return `${outputPath.slice(0, -5)}.html`;
  return join(dirname(outputPath), 'name-change-pdf-adapter-template.html');
}

function getDefaultSelectionsPath(outputPath) {
  if (outputPath.endsWith('.json')) return `${outputPath.slice(0, -5)}.selections.json`;
  return join(dirname(outputPath), 'name-change-pdf-adapter-selections.json');
}

function getDefaultTodoPath(outputPath) {
  if (outputPath.endsWith('.json')) return `${outputPath.slice(0, -5)}.selection-todo.json`;
  return join(dirname(outputPath), 'name-change-pdf-adapter-selection-todo.json');
}

function getDefaultTodoMarkdownPath(todoPath) {
  if (todoPath.endsWith('.json')) return `${todoPath.slice(0, -5)}.md`;
  return join(dirname(todoPath), 'name-change-pdf-adapter-selection-todo.md');
}

function getDefaultTodoHtmlPath(todoPath) {
  if (todoPath.endsWith('.json')) return `${todoPath.slice(0, -5)}.html`;
  return join(dirname(todoPath), 'name-change-pdf-adapter-selection-todo.html');
}

function getStatusClass(status) {
  if (status === 'ready_for_review') return 'ready';
  if (status === 'guided_online') return 'guided';
  return 'needs';
}

function renderCandidateRows(field) {
  if (!field.candidatePdfFields.length) {
    return '<tr><td colspan="3" class="empty">No likely candidates. Check the raw PDF fields below.</td></tr>';
  }

  return field.candidatePdfFields.map((candidate) => `
    <tr>
      <td><code>${escapeHtml(candidate.pdfFieldName)}</code></td>
      <td>${escapeHtml(candidate.score)}</td>
      <td>${escapeHtml(candidate.reasons.join(', '))}</td>
    </tr>
  `).join('\n');
}

function renderField(field) {
  return `
    <section class="field-card">
      <div class="field-head">
        <div>
          <h3>${escapeHtml(field.officialFieldLabel)}</h3>
          <p><code>${escapeHtml(field.fieldKey)}</code></p>
        </div>
        <span>${escapeHtml(field.candidatePdfFields.length)} candidates</span>
      </div>
      <div class="meta">
        <span>${escapeHtml(field.source)}</span>
        <span>${escapeHtml(field.valueStatus)}</span>
        <span>${escapeHtml(field.redactionPolicy)}</span>
      </div>
      <p class="selected">selectedPdfFieldName: <code>${escapeHtml(field.selectedPdfFieldName ?? '')}</code></p>
      <p class="note">${escapeHtml(field.note)}</p>
      <table>
        <thead>
          <tr>
            <th>Candidate PDF field</th>
            <th>Score</th>
            <th>Why it matched</th>
          </tr>
        </thead>
        <tbody>
          ${renderCandidateRows(field)}
        </tbody>
      </table>
    </section>
  `;
}

function renderUnmappedFields(fieldNames) {
  if (!fieldNames.length) return '<p class="empty">No extra raw PDF fields outside the candidate lists.</p>';

  return `
    <details>
      <summary>${escapeHtml(fieldNames.length)} raw PDF fields not suggested above</summary>
      <div class="raw-fields">
        ${fieldNames.slice(0, 80).map((fieldName) => `<code>${escapeHtml(fieldName)}</code>`).join('\n')}
      </div>
    </details>
  `;
}

function renderItem(item) {
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
        <span>${escapeHtml(item.officialRevisionLabel)}</span>
        <span>${escapeHtml(item.probeStatus)}</span>
        <span>${escapeHtml(item.probeSourceLabel)}</span>
      </div>
      <div class="fields">
        ${item.fields.length > 0 ? item.fields.map(renderField).join('\n') : '<p class="empty">No PDF fields need manual mapping for this form.</p>'}
      </div>
      ${renderUnmappedFields(item.unmappedPdfFieldNames)}
    </section>
  `;
}

function buildTemplateIndexHtml(template) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DayOf PDF Adapter Mapping Review</title>
  <style>
    :root {
      color-scheme: light;
      --text: #182230;
      --muted: #667085;
      --line: #d0d5dd;
      --surface: #f8fafc;
      --ready: #067647;
      --needs: #b54708;
      --guided: #475467;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body {
      background: #ffffff;
      color: var(--text);
      margin: 0;
    }
    main {
      margin: 0 auto;
      max-width: 1180px;
      padding: 32px 20px 48px;
    }
    h1, h2, h3, p {
      margin: 0;
    }
    header {
      border-bottom: 1px solid var(--line);
      padding-bottom: 20px;
    }
    header p, .next, .note, .empty {
      color: var(--muted);
      font-size: 13px;
      margin-top: 8px;
    }
    .summary {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      margin-top: 20px;
    }
    .summary div, .form-card, .field-card {
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
    .form-grid {
      display: grid;
      gap: 18px;
      margin-top: 20px;
    }
    .form-head, .field-head {
      align-items: flex-start;
      display: flex;
      gap: 14px;
      justify-content: space-between;
    }
    .form-head p, .field-head p {
      color: var(--muted);
      font-size: 13px;
      margin-top: 4px;
    }
    .field-head span, .status {
      border-radius: 999px;
      font-size: 12px;
      padding: 5px 9px;
      white-space: nowrap;
    }
    .field-head span {
      background: var(--surface);
      color: var(--muted);
    }
    .status.ready {
      background: #ecfdf3;
      color: var(--ready);
    }
    .status.needs {
      background: #fffaeb;
      color: var(--needs);
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
    .meta span, .selected {
      background: var(--surface);
      border-radius: 999px;
      color: var(--muted);
      font-size: 12px;
      padding: 5px 9px;
    }
    .fields {
      display: grid;
      gap: 12px;
      margin-top: 14px;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 12px;
    }
    .selected {
      display: inline-block;
      margin-top: 12px;
    }
    table {
      border-collapse: collapse;
      margin-top: 12px;
      width: 100%;
    }
    th, td {
      border-top: 1px solid var(--line);
      font-size: 13px;
      padding: 9px 8px;
      text-align: left;
      vertical-align: top;
    }
    th {
      color: var(--muted);
      font-weight: 600;
    }
    details {
      background: var(--surface);
      border-radius: 8px;
      margin-top: 14px;
      padding: 12px;
    }
    summary {
      color: var(--muted);
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
    }
    .raw-fields {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    .raw-fields code {
      background: #ffffff;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 5px 8px;
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>DayOf PDF Adapter Mapping Review</h1>
      <p>Use this local review page beside the JSON template. Confirm each selected PDF field against the visual official PDF before promoting the template to an adapter catalog.</p>
      <div class="summary">
        <div><span>Forms ready</span><strong>${escapeHtml(template.summary.readyForReview)}</strong></div>
        <div><span>Needs probe</span><strong>${escapeHtml(template.summary.needsPdfProbe)}</strong></div>
        <div><span>Fields to map</span><strong>${escapeHtml(template.summary.fieldsToMap)}</strong></div>
        <div><span>Candidate matches</span><strong>${escapeHtml(template.summary.candidateMatches)}</strong></div>
      </div>
    </header>
    <div class="form-grid">
      ${template.items.map(renderItem).join('\n')}
    </div>
  </main>
</body>
</html>
`;
}

function getStatusLabel(status) {
  if (status === 'ready_for_review') return 'Ready for review';
  if (status === 'guided_online') return 'Guided online';
  return 'Needs PDF probe';
}

function getNextAction(status) {
  if (status === 'ready_for_review') return 'Review each suggested PDF field, then save confirmed mappings into a PDF adapter catalog.';
  if (status === 'guided_online') return 'Use guided online entry for this agency flow instead of PDF field mapping.';
  return 'Run the PDF probe script on the official downloaded PDF before building a mapping template.';
}

function buildTemplate(populationPayload, probePayload) {
  const probeByFormCode = new Map(probePayload.results.map((probe) => [probe.formCode, probe]));
  const items = populationPayload.items.map((item) => {
    if (item.adapterKind === 'guided_online_entry') {
      return {
        formCode: item.formCode,
        formLabel: item.formLabel,
        officialRevisionLabel: item.officialRevisionLabel,
        probeStatus: 'guided_online',
        probeSourceLabel: 'No PDF probe needed',
        status: 'guided_online',
        statusLabel: getStatusLabel('guided_online'),
        nextAction: getNextAction('guided_online'),
        fields: [],
        unmappedPdfFieldNames: [],
      };
    }

    const probe = probeByFormCode.get(item.formCode);
    const fieldNames = Array.isArray(probe?.fieldNames) ? probe.fieldNames : [];
    const hasRawFields = probe?.probeStatus === 'raw_fields_found' && fieldNames.length > 0;
    const status = hasRawFields ? 'ready_for_review' : 'needs_pdf_probe';
    const fields = hasRawFields ? item.fieldMappings
      .filter((field) => field.mappingStatus !== 'blocked')
      .map((field) => {
        const candidatePdfFields = getCandidates(field, fieldNames);
        return {
          fieldKey: field.fieldKey,
          officialFieldLabel: field.officialFieldLabel,
          source: field.source,
          redactionPolicy: field.redactionPolicy,
          valueStatus: field.valueStatus,
          selectedPdfFieldName: null,
          mappingConfidence: 'manual_review',
          candidatePdfFields,
          note: candidatePdfFields.length > 0
            ? 'Review candidates against the visual official PDF before accepting a mapping.'
            : 'No likely PDF field candidate was found. Review raw PDF fields manually.',
        };
      }) : [];
    const candidateNames = new Set(fields.flatMap((field) => field.candidatePdfFields.map((candidate) => candidate.pdfFieldName)));

    return {
      formCode: item.formCode,
      formLabel: item.formLabel,
      officialRevisionLabel: item.officialRevisionLabel,
      probeStatus: probe?.probeStatus ?? 'missing_probe',
      probeSourceLabel: probe?.filePath ? `PDF probe: ${probe.filePath}` : probe ? `PDF probe for ${probe.formCode}` : 'No PDF probe result supplied',
      status,
      statusLabel: getStatusLabel(status),
      nextAction: getNextAction(status),
      fields,
      unmappedPdfFieldNames: fieldNames.filter((fieldName) => !candidateNames.has(fieldName)),
    };
  });
  const summary = {
    totalForms: items.length,
    readyForReview: items.filter((item) => item.status === 'ready_for_review').length,
    needsPdfProbe: items.filter((item) => item.status === 'needs_pdf_probe').length,
    guidedOnline: items.filter((item) => item.status === 'guided_online').length,
    fieldsToMap: items.reduce((sum, item) => sum + item.fields.length, 0),
    candidateMatches: items.reduce((sum, item) => (
      sum + item.fields.reduce((fieldSum, field) => fieldSum + field.candidatePdfFields.length, 0)
    ), 0),
  };

  return {
    reviewOnly: true,
    generatedAt: new Date().toISOString(),
    summary,
    items,
  };
}

function buildSelectionsStarter(template) {
  const selections = template.items.flatMap((item) => {
    if (item.status !== 'ready_for_review') return [];

    return (item.fields ?? []).map((field) => ({
      formCode: item.formCode,
      officialRevisionLabel: item.officialRevisionLabel,
      fieldKey: field.fieldKey,
      officialFieldLabel: field.officialFieldLabel,
      selectedPdfFieldName: null,
      visualReviewConfirmed: false,
      reviewedAt: null,
      reviewerNote: null,
      candidatePdfFields: field.candidatePdfFields,
      note: field.note,
    }));
  });

  return {
    reviewOnly: true,
    generatedAt: new Date().toISOString(),
    instructions: [
      'Review candidatePdfFields against the visual official PDF.',
      'Set selectedPdfFieldName to the exact PDF field name to use.',
      'Set visualReviewConfirmed to true only after comparing the candidate against the official PDF.',
      'Set reviewedAt to the visual review date in YYYY-MM-DD format when visualReviewConfirmed is true.',
      'Leave unknown fields null until a human confirms the correct PDF field.',
    ],
    summary: {
      formsReadyForReview: template.summary.readyForReview,
      selectionsToFill: selections.length,
      candidateMatches: template.summary.candidateMatches,
    },
    selections,
  };
}

function buildSelectionTodo(template) {
  const items = template.items.flatMap((item) => {
    if (item.status !== 'ready_for_review') return [];

    return (item.fields ?? []).map((field) => {
      const bestCandidate = field.candidatePdfFields[0] ?? null;

      return {
        formCode: item.formCode,
        formLabel: item.formLabel,
        officialRevisionLabel: item.officialRevisionLabel,
        fieldKey: field.fieldKey,
        officialFieldLabel: field.officialFieldLabel,
        candidateCount: field.candidatePdfFields.length,
        bestCandidatePdfFieldName: bestCandidate?.pdfFieldName ?? null,
        bestCandidateScore: bestCandidate?.score ?? null,
        candidatePdfFields: field.candidatePdfFields,
        suggestedSelectedPdfFieldName: bestCandidate?.pdfFieldName ?? null,
        reviewRequired: true,
        nextAction: bestCandidate
          ? 'Confirm the suggested PDF field against the visual official PDF, copy it into selectedPdfFieldName, then set visualReviewConfirmed to true and reviewedAt to the YYYY-MM-DD review date.'
          : 'Review the raw PDF field list manually before choosing selectedPdfFieldName, setting visualReviewConfirmed to true, and adding reviewedAt in YYYY-MM-DD format.',
      };
    });
  });

  return {
    reviewOnly: true,
    safePayload: true,
    generatedAt: new Date().toISOString(),
    source: 'DayOf PDF adapter selection todo',
    instructions: [
      'This todo contains PDF field names and mapping candidates only. It does not contain user-entered form values.',
      'Use suggestedSelectedPdfFieldName only after visual confirmation against the official PDF.',
      'Copy confirmed PDF field names into the selections JSON as selectedPdfFieldName, set visualReviewConfirmed to true, and set reviewedAt to the YYYY-MM-DD review date.',
    ],
    summary: {
      formsReadyForReview: template.summary.readyForReview,
      fieldsToMap: items.length,
      fieldsWithCandidates: items.filter((item) => item.candidateCount > 0).length,
      fieldsWithoutCandidates: items.filter((item) => item.candidateCount === 0).length,
      strongCandidateFields: items.filter((item) => (item.bestCandidateScore ?? 0) >= 45).length,
    },
    items,
  };
}

function formatMarkdownCandidate(candidate) {
  if (!candidate) return '`none`';
  return `\`${candidate.pdfFieldName}\` (${candidate.score}; ${candidate.reasons.join(', ')})`;
}

function buildSelectionTodoMarkdown(todo) {
  const grouped = new Map();
  for (const item of todo.items) {
    const key = `${item.formCode}::${item.officialRevisionLabel}`;
    const group = grouped.get(key) ?? {
      formCode: item.formCode,
      formLabel: item.formLabel,
      officialRevisionLabel: item.officialRevisionLabel,
      items: [],
    };
    group.items.push(item);
    grouped.set(key, group);
  }

  const formSections = Array.from(grouped.values()).map((group) => [
    `## ${group.formCode}`,
    '',
    `${group.formLabel} - ${group.officialRevisionLabel}`,
    '',
    ...group.items.flatMap((item) => [
      `- ${item.officialFieldLabel} (\`${item.fieldKey}\`)`,
      `  - Suggested PDF field: ${formatMarkdownCandidate(item.candidatePdfFields[0] ?? null)}`,
      `  - Candidates: ${item.candidatePdfFields.length ? item.candidatePdfFields.map(formatMarkdownCandidate).join(', ') : '`none`'}`,
      '  - Confirm: set `visualReviewConfirmed` to `true` and `reviewedAt` to the YYYY-MM-DD review date after visual review.',
      `  - Next: ${item.nextAction}`,
    ]),
  ].join('\n'));

  return [
    '# DayOf PDF Adapter Selection Todo',
    '',
    `Generated: ${todo.generatedAt}`,
    '',
    'Review-only mapping aid. It contains PDF field candidates only, not user form values.',
    '',
    '## Summary',
    '',
    `- Fields to map: ${todo.summary.fieldsToMap}`,
    `- Fields with candidates: ${todo.summary.fieldsWithCandidates}`,
    `- Fields without candidates: ${todo.summary.fieldsWithoutCandidates}`,
    `- Strong candidate fields: ${todo.summary.strongCandidateFields}`,
    '',
    ...formSections,
    '',
  ].join('\n');
}

function getTodoPriorityClass(item) {
  if (item.candidateCount === 0) return 'needs';
  if ((item.bestCandidateScore ?? 0) >= 45) return 'strong';
  return 'review';
}

function getTodoPriorityLabel(item) {
  if (item.candidateCount === 0) return 'Manual lookup';
  if ((item.bestCandidateScore ?? 0) >= 45) return 'Strong candidate';
  return 'Needs review';
}

function renderTodoCandidateRows(item) {
  if (!item.candidatePdfFields.length) {
    return '<tr><td colspan="3" class="empty">No candidates. Use the full mapping review page and raw PDF field list.</td></tr>';
  }

  return item.candidatePdfFields.map((candidate) => `
    <tr>
      <td><code>${escapeHtml(candidate.pdfFieldName)}</code></td>
      <td>${escapeHtml(candidate.score)}</td>
      <td>${escapeHtml(candidate.reasons.join(', '))}</td>
    </tr>
  `).join('\n');
}

function renderTodoItem(item) {
  const priorityClass = getTodoPriorityClass(item);

  return `
    <section class="todo-card ${priorityClass}">
      <div class="todo-head">
        <div>
          <h2>${escapeHtml(item.officialFieldLabel)}</h2>
          <p><code>${escapeHtml(item.fieldKey)}</code></p>
        </div>
        <span class="priority ${priorityClass}">${escapeHtml(getTodoPriorityLabel(item))}</span>
      </div>
      <div class="meta">
        <span>${escapeHtml(item.formCode)}</span>
        <span>${escapeHtml(item.officialRevisionLabel)}</span>
        <span>${escapeHtml(item.candidateCount)} candidates</span>
      </div>
      <p class="suggestion">Suggested selectedPdfFieldName: <code>${escapeHtml(item.suggestedSelectedPdfFieldName ?? '')}</code></p>
      <p class="suggestion">Required confirmation: <code>visualReviewConfirmed: true</code> and <code>reviewedAt: YYYY-MM-DD</code></p>
      <p class="next">${escapeHtml(item.nextAction)}</p>
      <table>
        <thead>
          <tr>
            <th>Candidate PDF field</th>
            <th>Score</th>
            <th>Why it matched</th>
          </tr>
        </thead>
        <tbody>
          ${renderTodoCandidateRows(item)}
        </tbody>
      </table>
    </section>
  `;
}

function buildSelectionTodoHtml(todo) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DayOf PDF Adapter Selection Todo</title>
  <style>
    :root {
      color-scheme: light;
      --text: #182230;
      --muted: #667085;
      --line: #d0d5dd;
      --surface: #f8fafc;
      --strong: #067647;
      --review: #175cd3;
      --needs: #b54708;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body {
      background: #ffffff;
      color: var(--text);
      margin: 0;
    }
    main {
      margin: 0 auto;
      max-width: 1080px;
      padding: 32px 20px 48px;
    }
    h1, h2, p {
      margin: 0;
    }
    header {
      border-bottom: 1px solid var(--line);
      padding-bottom: 20px;
    }
    header p, .next, .empty {
      color: var(--muted);
      font-size: 13px;
      margin-top: 8px;
    }
    .summary {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      margin-top: 20px;
    }
    .summary div, .notice, .todo-card {
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
      margin-top: 20px;
    }
    .todo-grid {
      display: grid;
      gap: 14px;
      margin-top: 20px;
    }
    .todo-card.strong {
      border-color: #abefc6;
    }
    .todo-card.review {
      border-color: #b2ddff;
    }
    .todo-card.needs {
      border-color: #fedf89;
    }
    .todo-head {
      align-items: flex-start;
      display: flex;
      gap: 12px;
      justify-content: space-between;
    }
    .todo-head p {
      color: var(--muted);
      font-size: 13px;
      margin-top: 4px;
    }
    .priority {
      border-radius: 999px;
      font-size: 12px;
      padding: 5px 9px;
      white-space: nowrap;
    }
    .priority.strong {
      background: #ecfdf3;
      color: var(--strong);
    }
    .priority.review {
      background: #eff8ff;
      color: var(--review);
    }
    .priority.needs {
      background: #fffaeb;
      color: var(--needs);
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    .meta span, .suggestion {
      background: var(--surface);
      border-radius: 999px;
      color: var(--muted);
      font-size: 12px;
      padding: 5px 9px;
    }
    .suggestion {
      display: inline-block;
      margin-top: 12px;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 12px;
    }
    table {
      border-collapse: collapse;
      margin-top: 12px;
      width: 100%;
    }
    th, td {
      border-top: 1px solid var(--line);
      font-size: 13px;
      padding: 9px 8px;
      text-align: left;
      vertical-align: top;
    }
    th {
      color: var(--muted);
      font-weight: 600;
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>DayOf PDF Adapter Selection Todo</h1>
      <p>Review-only mapping checklist. It contains PDF field candidates only, not user form values.</p>
      <div class="summary">
        <div><span>Fields to map</span><strong>${escapeHtml(todo.summary.fieldsToMap)}</strong></div>
        <div><span>With candidates</span><strong>${escapeHtml(todo.summary.fieldsWithCandidates)}</strong></div>
        <div><span>Without candidates</span><strong>${escapeHtml(todo.summary.fieldsWithoutCandidates)}</strong></div>
        <div><span>Strong candidates</span><strong>${escapeHtml(todo.summary.strongCandidateFields)}</strong></div>
      </div>
    </header>
    <section class="notice">Confirm every suggested PDF field against the visual official PDF before copying it into selectedPdfFieldName in the selections JSON, then set visualReviewConfirmed to true and reviewedAt to the YYYY-MM-DD review date.</section>
    <div class="todo-grid">
      ${todo.items.map(renderTodoItem).join('\n')}
    </div>
  </main>
</body>
</html>
`;
}

async function main() {
  const { populationPath, probePath, outputPath, indexPath, selectionsPath, todoPath, todoMarkdownPath, todoHtmlPath } = parseArgs(process.argv.slice(2));
  if (!populationPath || !probePath || !outputPath) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  const populationPayload = JSON.parse(await readFile(populationPath, 'utf8'));
  const probePayload = JSON.parse(await readFile(probePath, 'utf8'));
  validatePopulationPayload(populationPayload);
  validateProbePayload(probePayload);

  const template = buildTemplate(populationPayload, probePayload);
  const absoluteOutputPath = resolve(outputPath);
  const absoluteIndexPath = resolve(indexPath ?? getDefaultIndexPath(absoluteOutputPath));
  const absoluteSelectionsPath = resolve(selectionsPath ?? getDefaultSelectionsPath(absoluteOutputPath));
  const absoluteTodoPath = resolve(todoPath ?? getDefaultTodoPath(absoluteOutputPath));
  const absoluteTodoMarkdownPath = resolve(todoMarkdownPath ?? getDefaultTodoMarkdownPath(absoluteTodoPath));
  const absoluteTodoHtmlPath = resolve(todoHtmlPath ?? getDefaultTodoHtmlPath(absoluteTodoPath));
  const selectionsStarter = buildSelectionsStarter(template);
  const selectionTodo = buildSelectionTodo(template);
  await mkdir(dirname(absoluteOutputPath), { recursive: true });
  await mkdir(dirname(absoluteIndexPath), { recursive: true });
  await mkdir(dirname(absoluteSelectionsPath), { recursive: true });
  await mkdir(dirname(absoluteTodoPath), { recursive: true });
  await mkdir(dirname(absoluteTodoMarkdownPath), { recursive: true });
  await mkdir(dirname(absoluteTodoHtmlPath), { recursive: true });
  await writeFile(absoluteOutputPath, JSON.stringify(template, null, 2), 'utf8');
  await writeFile(absoluteIndexPath, buildTemplateIndexHtml(template), 'utf8');
  await writeFile(absoluteSelectionsPath, JSON.stringify(selectionsStarter, null, 2), 'utf8');
  await writeFile(absoluteTodoPath, JSON.stringify(selectionTodo, null, 2), 'utf8');
  await writeFile(absoluteTodoMarkdownPath, buildSelectionTodoMarkdown(selectionTodo), 'utf8');
  await writeFile(absoluteTodoHtmlPath, buildSelectionTodoHtml(selectionTodo), 'utf8');

  console.log(JSON.stringify({
    reviewOnly: true,
    outputPath: absoluteOutputPath,
    indexPath: absoluteIndexPath,
    selectionsPath: absoluteSelectionsPath,
    todoPath: absoluteTodoPath,
    todoMarkdownPath: absoluteTodoMarkdownPath,
    todoHtmlPath: absoluteTodoHtmlPath,
    summary: template.summary,
  }, null, 2));
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
