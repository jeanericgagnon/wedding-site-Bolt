#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

function usage() {
  return [
    'Usage:',
    '  node scripts/v1-build-name-change-intake-answer-response.mjs --template /tmp/dayof-name-change-intake-answer-template.filled.json --output /tmp/dayof-name-change-intake-answer-response.json',
    '  node scripts/v1-build-name-change-intake-answer-response.mjs --template /tmp/dayof-name-change-intake-answer-template.filled.json --report /tmp/dayof-name-change-intake-answer-preflight-report.json --index /tmp/dayof-name-change-intake-answer-preflight.html --dry-run',
    '',
    'Converts a filled intake answer template into the apply-ready answer response. The output contains user values; the report does not.',
    'Use --dry-run to preflight the filled template and write only the no-values report.',
  ].join('\n');
}

function parseArgs(argv) {
  const parsed = {
    templatePath: null,
    outputPath: null,
    reportPath: null,
    indexPath: null,
    dryRun: false,
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
    if (arg === '--report') {
      parsed.reportPath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--index') {
      parsed.indexPath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--dry-run') {
      parsed.dryRun = true;
    }
  }

  return parsed;
}

function validateFilledTemplate(payload) {
  if (!payload || typeof payload !== 'object' || payload.reviewOnly !== true || payload.containsUserValues !== true || !Array.isArray(payload.fields)) {
    throw new Error('Filled answer template must be reviewOnly JSON with containsUserValues: true and a fields array.');
  }
  if (payload.safePayload === true) {
    throw new Error('Filled answer template cannot be marked safePayload: true because it contains user values.');
  }
}

function normalizeValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function answerLookupKeys(field) {
  return [field.answerKey, field.gapKey, field.fieldKey].filter(Boolean);
}

function isValidAnswerKind(kind) {
  return kind === 'standard_answer'
    || kind === 'consent_answer'
    || kind === 'secure_session_answer'
    || kind === 'pdf_mapping_task';
}

function hasNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function isTemplateFieldRecord(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function hasAnswerContext(field) {
  return Boolean(
    field.answerContext
      && hasNonEmptyArray(field.answerContext.formCodes)
      && hasNonEmptyArray(field.answerContext.officialRevisionLabels)
      && hasNonEmptyArray(field.answerContext.sources),
  );
}

function getExpectedRetentionPolicy(kind) {
  if (kind === 'secure_session_answer') return 'ephemeral_only';
  if (kind === 'consent_answer') return 'save_or_use_only_with_consent';
  if (kind === 'pdf_mapping_task') return 'not_user_answer';
  return 'normal_planner';
}

function buildDuplicateTemplateFieldIssue(field, duplicateKey) {
  return {
    code: 'duplicate_template_field',
    fieldKey: field.fieldKey,
    answerKey: field.answerKey ?? null,
    message: `${field.fieldKey} appears more than once in the filled answer template through ${duplicateKey}. Keep one filled template field before building an answer response.`,
  };
}

function buildDuplicateTemplateFieldIndex(fields) {
  const map = new Map();
  const duplicateFields = new Set();
  const duplicateIssues = [];

  for (const field of fields) {
    const duplicateKey = answerLookupKeys(field).find((key) => map.has(key) && map.get(key) !== field);
    if (duplicateKey) {
      const originalField = map.get(duplicateKey);
      if (originalField) duplicateFields.add(originalField);
      duplicateFields.add(field);
      duplicateIssues.push(buildDuplicateTemplateFieldIssue(field, duplicateKey));
      continue;
    }
    for (const key of answerLookupKeys(field)) {
      map.set(key, field);
    }
  }

  return {
    duplicateFields,
    duplicateIssues,
  };
}

function getTemplateFieldIssue(field, answerValue) {
  if (!field.answerKey || !field.gapKey || !field.fieldKey) {
    return {
      code: 'template_field_missing_identity',
      fieldKey: field.fieldKey,
      answerKey: field.answerKey ?? null,
      message: 'A filled answer template field is missing answerKey, gapKey, or fieldKey. Regenerate the blank answer template before building an answer response.',
    };
  }
  if (!isValidAnswerKind(field.kind)) {
    return {
      code: 'invalid_answer_kind',
      fieldKey: field.fieldKey,
      answerKey: field.answerKey ?? null,
      message: `${field.fieldKey} has an unsupported answer kind. Regenerate the blank answer template before building an answer response.`,
    };
  }
  if (field.kind !== 'pdf_mapping_task' && answerValue && !hasAnswerContext(field)) {
    return {
      code: 'answer_context_missing',
      fieldKey: field.fieldKey,
      answerKey: field.answerKey ?? null,
      message: `${field.fieldKey} is missing form, revision, or source context. Regenerate the blank answer template before building an answer response.`,
    };
  }
  return null;
}

function getFieldIssue(field, answerValue) {
  const expectedRetentionPolicy = getExpectedRetentionPolicy(field.kind);
  if (field.kind === 'pdf_mapping_task') {
    if (!answerValue) return null;
    return {
      code: 'pdf_mapping_answer_not_supported',
      fieldKey: field.fieldKey,
      answerKey: field.answerKey ?? null,
      message: `${field.fieldKey} is a reviewer PDF mapping task, not a user intake answer. Complete visual PDF mapping before building an answer response.`,
    };
  }
  if (!answerValue) return null;
  if (field.retentionPolicy !== expectedRetentionPolicy) {
    return {
      code: field.kind === 'secure_session_answer' ? 'secure_retention_policy_invalid' : 'answer_retention_mismatch',
      fieldKey: field.fieldKey,
      answerKey: field.answerKey ?? null,
      message: `${field.fieldKey} requires ${expectedRetentionPolicy} retention for ${field.kind}. Regenerate the blank answer template before building an answer response.`,
    };
  }
  if ((field.kind === 'consent_answer' || field.kind === 'secure_session_answer') && field.consentToUseInDraft !== true) {
    return {
      code: 'draft_use_consent_missing',
      fieldKey: field.fieldKey,
      answerKey: field.answerKey ?? null,
      message: `${field.fieldKey} needs consentToUseInDraft: true before DayOf can place it into a review-only draft.`,
    };
  }
  return null;
}

function buildAnswer(field, answerValue) {
  return {
    answerKey: field.answerKey,
    gapKey: field.gapKey,
    fieldKey: field.fieldKey,
    kind: field.kind,
    answerContext: field.answerContext,
    answerValue,
    consentToUseInDraft: field.consentToUseInDraft,
    consentToSave: field.consentToSave,
    retentionPolicy: field.retentionPolicy,
  };
}

function getReadinessState(field, answerValue, issueCodes) {
  if (issueCodes.length > 0) return 'blocked';
  if (field.kind === 'pdf_mapping_task') return 'reviewer_mapping_task';
  if (answerValue) return 'ready_to_convert';
  if (field.kind === 'secure_session_answer') return 'needs_secure_entry';
  if (field.kind === 'consent_answer') return 'needs_consent';
  return 'needs_answer';
}

function getReadinessNextAction(field, state) {
  if (state === 'blocked') return `${field.label ?? field.fieldKey} needs correction before DayOf can build a review-only answer response.`;
  if (state === 'ready_to_convert') return `${field.label ?? field.fieldKey} is ready to place into review-only drafts.`;
  if (state === 'needs_secure_entry') return `Collect ${field.label ?? field.fieldKey} in a secure session only.`;
  if (state === 'needs_consent') return `Collect ${field.label ?? field.fieldKey} with explicit consent before using it in a draft.`;
  if (state === 'reviewer_mapping_task') return `${field.label ?? field.fieldKey} stays with reviewer PDF mapping, not user intake.`;
  return `Ask the user for ${field.label ?? field.fieldKey}.`;
}

function buildFieldReadiness(field, answerValue, issueCodes) {
  const state = getReadinessState(field, answerValue, issueCodes);

  return {
    answerKey: field.answerKey,
    gapKey: field.gapKey,
    fieldKey: field.fieldKey,
    kind: String(field.kind ?? 'unknown'),
    label: field.label ?? field.fieldKey ?? 'Unknown field',
    formCodes: field.formCodes ?? [],
    officialRevisionLabels: field.officialRevisionLabels ?? [],
    state,
    issueCodes,
    nextAction: getReadinessNextAction(field, state),
  };
}

function buildInvalidTemplateFieldIssue(index) {
  return {
    code: 'template_field_invalid_entry',
    fieldKey: `template.fields[${index}]`,
    answerKey: null,
    message: `Template field ${index + 1} is not a field object. Regenerate the filled answer template before building an answer response.`,
  };
}

function buildInvalidTemplateFieldReadiness(index) {
  return {
    kind: 'unknown',
    label: `Template field ${index + 1}`,
    formCodes: [],
    officialRevisionLabels: [],
    state: 'blocked',
    issueCodes: ['template_field_invalid_entry'],
    nextAction: 'Regenerate the filled answer template before building a review-only answer response.',
  };
}

function buildAnswerResponse(template) {
  const issues = [];
  const answers = [];
  const fieldReadiness = [];
  let malformedFields = 0;
  let contextMissingFields = 0;
  let skippedBlankFields = 0;
  let skippedMappingTasks = 0;
  const validFields = [];

  template.fields.forEach((field, index) => {
    if (isTemplateFieldRecord(field)) {
      validFields.push(field);
      return;
    }

    issues.push(buildInvalidTemplateFieldIssue(index));
    fieldReadiness.push(buildInvalidTemplateFieldReadiness(index));
    malformedFields += 1;
  });

  const duplicateIndex = buildDuplicateTemplateFieldIndex(validFields);
  issues.push(...duplicateIndex.duplicateIssues);

  for (const field of validFields) {
    const answerValue = normalizeValue(field.answerValue);
    const fieldIssueCodes = [];
    const templateFieldIssue = getTemplateFieldIssue(field, answerValue);
    if (templateFieldIssue) {
      issues.push(templateFieldIssue);
      fieldIssueCodes.push(templateFieldIssue.code);
      if (templateFieldIssue.code === 'answer_context_missing') contextMissingFields += 1;
      if (templateFieldIssue.code === 'template_field_missing_identity' || templateFieldIssue.code === 'invalid_answer_kind') malformedFields += 1;
      if (duplicateIndex.duplicateFields.has(field)) fieldIssueCodes.push('duplicate_template_field');
      fieldReadiness.push(buildFieldReadiness(field, answerValue, fieldIssueCodes));
      continue;
    }
    if (duplicateIndex.duplicateFields.has(field)) {
      fieldIssueCodes.push('duplicate_template_field');
      fieldReadiness.push(buildFieldReadiness(field, answerValue, fieldIssueCodes));
      continue;
    }
    const issue = getFieldIssue(field, answerValue);
    if (issue) {
      issues.push(issue);
      fieldIssueCodes.push(issue.code);
    }
    fieldReadiness.push(buildFieldReadiness(field, answerValue, fieldIssueCodes));
    if (field.kind === 'pdf_mapping_task') {
      skippedMappingTasks += 1;
      continue;
    }
    if (!answerValue) {
      skippedBlankFields += 1;
      continue;
    }
    if (issue) continue;
    answers.push(buildAnswer(field, answerValue));
  }

  const safeAnswers = issues.length === 0 ? answers : [];
  const answerPayload = {
    reviewOnly: true,
    containsUserValues: true,
    source: template.source ?? 'DayOf name-change intake answer response',
    answers: safeAnswers,
  };
  const report = {
    reviewOnly: true,
    containsUserValues: false,
    status: issues.length === 0 ? 'passed' : 'failed',
    source: template.source ?? 'DayOf name-change intake answer response',
    summary: {
      totalFields: template.fields.length,
      answerFields: safeAnswers.length,
      standardAnswers: safeAnswers.filter((answer) => answer.kind === 'standard_answer').length,
      consentAnswers: safeAnswers.filter((answer) => answer.kind === 'consent_answer').length,
      secureSessionAnswers: safeAnswers.filter((answer) => answer.kind === 'secure_session_answer').length,
      duplicateTemplateFields: duplicateIndex.duplicateFields.size,
      malformedFields,
      contextMissingFields,
      readyToConvertFields: fieldReadiness.filter((field) => field.state === 'ready_to_convert').length,
      blockedFields: fieldReadiness.filter((field) => field.state === 'blocked').length,
      missingAnswerFields: fieldReadiness.filter((field) => field.state === 'needs_answer').length,
      consentPendingFields: fieldReadiness.filter((field) => field.state === 'needs_consent').length,
      secureSessionPendingFields: fieldReadiness.filter((field) => field.state === 'needs_secure_entry').length,
      reviewerMappingTasks: fieldReadiness.filter((field) => field.state === 'reviewer_mapping_task').length,
      skippedBlankFields,
      skippedMappingTasks,
      issues: issues.length,
    },
    issues,
    fieldReadiness,
  };

  return { answerPayload, report };
}

function getDefaultReportPath(outputPath) {
  return outputPath.endsWith('.json') ? outputPath.replace(/\.json$/, '.answer-response-report.json') : `${outputPath}.answer-response-report.json`;
}

function getDefaultDryRunReportPath(templatePath) {
  return templatePath.endsWith('.json') ? templatePath.replace(/\.json$/, '.answer-response-preflight-report.json') : `${templatePath}.answer-response-preflight-report.json`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getReadinessClass(state) {
  if (state === 'ready_to_convert') return 'ready';
  if (state === 'blocked') return 'blocked';
  if (state === 'needs_secure_entry') return 'secure';
  if (state === 'needs_consent') return 'consent';
  if (state === 'reviewer_mapping_task') return 'mapping';
  return 'needed';
}

function renderFieldReadiness(field) {
  return `
    <tr>
      <td>
        <strong>${escapeHtml(field.label)}</strong>
        <code>${escapeHtml(field.fieldKey)}</code>
      </td>
      <td><span class="status ${getReadinessClass(field.state)}">${escapeHtml(field.state)}</span></td>
      <td>${escapeHtml(field.kind)}</td>
      <td>${escapeHtml((field.formCodes ?? []).join(', '))}</td>
      <td>${escapeHtml((field.issueCodes ?? []).join(', ') || 'None')}</td>
      <td>${escapeHtml(field.nextAction)}</td>
    </tr>
  `;
}

function buildIndexHtml(report) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DayOf Name Change Intake Readiness</title>
  <style>
    :root {
      color-scheme: light;
      --text: #172033;
      --muted: #667085;
      --line: #d0d5dd;
      --surface: #f8fafc;
      --ready: #087443;
      --blocked: #b42318;
      --needed: #175cd3;
      --secure: #93370d;
      --mapping: #344054;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body { background: #ffffff; color: var(--text); margin: 0; }
    main { margin: 0 auto; max-width: 1120px; padding: 32px 20px 48px; }
    h1, h2, p { margin: 0; }
    header { border-bottom: 1px solid var(--line); padding-bottom: 20px; }
    header p { color: var(--muted); margin-top: 8px; max-width: 760px; }
    .summary { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); margin-top: 20px; }
    .summary div, .notice { border: 1px solid var(--line); border-radius: 8px; padding: 14px; }
    .summary span { color: var(--muted); display: block; font-size: 12px; }
    .summary strong { display: block; font-size: 20px; margin-top: 4px; }
    .notice { background: var(--surface); color: var(--muted); line-height: 1.5; margin-top: 20px; }
    table { border-collapse: collapse; margin-top: 20px; width: 100%; }
    th, td { border-top: 1px solid var(--line); font-size: 13px; padding: 10px 8px; text-align: left; vertical-align: top; }
    th { color: var(--muted); font-weight: 600; }
    td strong, td code { display: block; }
    code { color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-size: 12px; margin-top: 4px; overflow-wrap: anywhere; }
    .status { border-radius: 999px; display: inline-flex; font-size: 12px; padding: 5px 9px; white-space: nowrap; }
    .status.ready { background: #ecfdf3; color: var(--ready); }
    .status.blocked { background: #fef3f2; color: var(--blocked); }
    .status.needed { background: #eff8ff; color: var(--needed); }
    .status.secure { background: #fff6ed; color: var(--secure); }
    .status.consent { background: #fff6ed; color: var(--secure); }
    .status.mapping { background: #f2f4f7; color: var(--mapping); }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>DayOf Name Change Intake Readiness</h1>
      <p>No-values preflight view for the filled intake template. This checks whether DayOf can build a review-only answer response before creating any value-bearing output.</p>
      <div class="summary">
        <div><span>Status</span><strong>${escapeHtml(report.status)}</strong></div>
        <div><span>Ready</span><strong>${escapeHtml(report.summary.readyToConvertFields)}</strong></div>
        <div><span>Needs answer</span><strong>${escapeHtml(report.summary.missingAnswerFields)}</strong></div>
        <div><span>Needs consent</span><strong>${escapeHtml(report.summary.consentPendingFields)}</strong></div>
        <div><span>Secure session</span><strong>${escapeHtml(report.summary.secureSessionPendingFields)}</strong></div>
        <div><span>Reviewer mapping</span><strong>${escapeHtml(report.summary.reviewerMappingTasks)}</strong></div>
        <div><span>Blocked</span><strong>${escapeHtml(report.summary.blockedFields)}</strong></div>
      </div>
    </header>
    <section class="notice">No user-entered values, value-bearing input paths, or answer-response output paths are shown here.</section>
    <section>
      <h2>Fields</h2>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>State</th>
            <th>Lane</th>
            <th>Forms</th>
            <th>Issues</th>
            <th>Next action</th>
          </tr>
        </thead>
        <tbody>
          ${(report.fieldReadiness ?? []).map(renderFieldReadiness).join('\n') || '<tr><td colspan="6">No fields</td></tr>'}
        </tbody>
      </table>
    </section>
  </main>
</body>
</html>
`;
}

async function main() {
  const { templatePath, outputPath, reportPath, indexPath, dryRun } = parseArgs(process.argv.slice(2));
  if (!templatePath || (!outputPath && !dryRun)) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }
  if (dryRun && outputPath) {
    throw new Error('Use --dry-run without --output so preflight cannot be confused with a value-bearing answer response.');
  }

  const absoluteTemplatePath = resolve(templatePath);
  const absoluteOutputPath = outputPath ? resolve(outputPath) : null;
  const absoluteReportPath = resolve(reportPath ?? (absoluteOutputPath ? getDefaultReportPath(absoluteOutputPath) : getDefaultDryRunReportPath(absoluteTemplatePath)));
  const absoluteIndexPath = indexPath ? resolve(indexPath) : null;
  const template = JSON.parse(await readFile(absoluteTemplatePath, 'utf8'));
  validateFilledTemplate(template);
  const { answerPayload, report } = buildAnswerResponse(template);
  const answerResponseReady = report.status === 'passed';
  const answerResponseWritten = answerResponseReady && !dryRun;
  const reportWithMetadata = {
    ...report,
    filledTemplateInputUsed: true,
    dryRun,
    answerResponseReady,
    answerResponseWritten,
    valueBearingPathsOmitted: true,
  };

  await mkdir(dirname(absoluteReportPath), { recursive: true });
  await writeFile(absoluteReportPath, JSON.stringify(reportWithMetadata, null, 2), 'utf8');
  if (absoluteIndexPath) {
    await mkdir(dirname(absoluteIndexPath), { recursive: true });
    await writeFile(absoluteIndexPath, buildIndexHtml(reportWithMetadata), 'utf8');
  }

  if (answerResponseWritten && absoluteOutputPath) {
    await mkdir(dirname(absoluteOutputPath), { recursive: true });
    await writeFile(absoluteOutputPath, JSON.stringify(answerPayload, null, 2), 'utf8');
  }

  console.log(JSON.stringify({
    reviewOnly: true,
    containsUserValues: false,
    status: report.status,
    dryRun,
    answerResponseReady,
    answerResponseWritten,
    valueBearingOutputPathOmitted: true,
    reportPath: absoluteReportPath,
    indexPath: absoluteIndexPath,
    summary: report.summary,
  }, null, 2));

  if (report.status !== 'passed') {
    process.exitCode = 1;
  }
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
