#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

function usage() {
  return [
    'Usage:',
    '  node scripts/v1-apply-name-change-intake-answers.mjs --population /tmp/dayof-name-change-population-plan.json --answers /tmp/dayof-name-change-intake-answer-response.json --output /tmp/dayof-name-change-population-plan.answered.json',
    '',
    'Applies completed intake answers to a review-only population plan. Answer files contain user values and should not be stored as blank templates.',
  ].join('\n');
}

function parseArgs(argv) {
  const parsed = {
    populationPath: null,
    answersPath: null,
    outputPath: null,
    reportPath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--population') {
      parsed.populationPath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--answers') {
      parsed.answersPath = argv[index + 1] ?? null;
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
    }
  }

  return parsed;
}

function validatePopulationPayload(payload) {
  if (!payload || typeof payload !== 'object' || payload.reviewOnly !== true || !Array.isArray(payload.items)) {
    throw new Error('Population payload must be reviewOnly JSON with an items array.');
  }
}

function validateAnswersPayload(payload) {
  if (!payload || typeof payload !== 'object' || payload.reviewOnly !== true || payload.containsUserValues !== true || !Array.isArray(payload.answers)) {
    throw new Error('Answers payload must be reviewOnly JSON with containsUserValues: true and an answers array.');
  }
}

function normalizeValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isAnswerRecord(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
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

function answerLookupKeys(answer) {
  return [answer.answerKey, answer.gapKey, answer.fieldKey].filter(Boolean);
}

function buildDuplicateAnswerIssue(answer, duplicateKey) {
  return {
    code: 'duplicate_answer',
    fieldKey: answer.fieldKey,
    answerKey: answer.answerKey ?? null,
    message: `${answer.fieldKey} appears more than once in the completed answer response through ${duplicateKey}. Keep one answer per template field before applying answers.`,
  };
}

function buildAnswerMap(answers) {
  const map = new Map();
  const duplicateAnswers = new Set();
  const duplicateIssues = [];
  for (const answer of answers) {
    const duplicateKey = answerLookupKeys(answer).find((key) => map.has(key) && map.get(key) !== answer);
    if (duplicateKey) {
      const originalAnswer = map.get(duplicateKey);
      if (originalAnswer) duplicateAnswers.add(originalAnswer);
      duplicateAnswers.add(answer);
      duplicateIssues.push(buildDuplicateAnswerIssue(answer, duplicateKey));
      continue;
    }
    for (const key of answerLookupKeys(answer)) {
      map.set(key, answer);
    }
  }
  for (const duplicateAnswer of duplicateAnswers) {
    for (const key of answerLookupKeys(duplicateAnswer)) {
      if (map.get(key) === duplicateAnswer) map.delete(key);
    }
  }
  return {
    map,
    duplicateAnswers,
    duplicateIssues,
  };
}

function buildMalformedAnswerIssue(answer, index) {
  const answerRecord = isAnswerRecord(answer) ? answer : null;
  return {
    code: 'malformed_answer',
    fieldKey: typeof answerRecord?.fieldKey === 'string' && answerRecord.fieldKey ? answerRecord.fieldKey : `answers[${index}]`,
    answerKey: typeof answerRecord?.answerKey === 'string' && answerRecord.answerKey ? answerRecord.answerKey : null,
    message: `Answer ${index + 1} is missing a usable field identity or answer kind. Regenerate the completed answer response from the current blank template before applying answers.`,
  };
}

function getValidAnswers(answers) {
  const validAnswers = [];
  const malformedIssues = [];

  answers.forEach((answer, index) => {
    if (
      isAnswerRecord(answer)
        && answerLookupKeys(answer).length > 0
        && isValidAnswerKind(answer.kind)
    ) {
      validAnswers.push(answer);
      return;
    }

    malformedIssues.push(buildMalformedAnswerIssue(answer, index));
  });

  return {
    validAnswers,
    malformedIssues,
  };
}

function getFieldAnswer(answerMap, field) {
  return answerMap.get(field.fieldKey)
    ?? answerMap.get(`answer:user_info:${field.fieldKey}`)
    ?? answerMap.get(`answer:consent:${field.fieldKey}`)
    ?? answerMap.get(`answer:secure_session:${field.fieldKey}`)
    ?? null;
}

function getUpdatedValueStatus(field) {
  return field.source === 'supplemental_intake' ? 'available' : 'ready';
}

function getUpdatedMappingStatus(item, field) {
  if (field.adapterFieldName) return 'mapped';
  if (item.adapterKind === 'guided_online_entry') return 'guided_online_only';
  return 'needs_pdf_field_probe';
}

function getExpectedAnswerKind(field) {
  if (field.redactionPolicy === 'requires_secure_session') return 'secure_session_answer';
  if (field.redactionPolicy === 'requires_consent') return 'consent_answer';
  return 'standard_answer';
}

function getExpectedRetentionPolicy(kind) {
  if (kind === 'secure_session_answer') return 'ephemeral_only';
  if (kind === 'consent_answer') return 'save_or_use_only_with_consent';
  if (kind === 'pdf_mapping_task') return 'not_user_answer';
  return 'normal_planner';
}

function getAnswerIssue(answer, item, field) {
  if (answer.kind === 'pdf_mapping_task') return null;
  const expectedKind = getExpectedAnswerKind(field);
  if (answer.kind !== expectedKind) {
    return {
      code: 'answer_kind_mismatch',
      fieldKey: field.fieldKey,
      answerKey: answer.answerKey ?? null,
      message: `${field.fieldKey} requires ${expectedKind} for this population plan, but the completed answer response supplied ${answer.kind}. Regenerate the blank answer template before applying answers.`,
    };
  }
  const expectedRetentionPolicy = getExpectedRetentionPolicy(answer.kind);
  if (answer.retentionPolicy && answer.retentionPolicy !== expectedRetentionPolicy) {
    return {
      code: answer.kind === 'secure_session_answer' ? 'secure_retention_policy_invalid' : 'answer_retention_mismatch',
      fieldKey: field.fieldKey,
      answerKey: answer.answerKey ?? null,
      message: `${field.fieldKey} requires ${expectedRetentionPolicy} retention for ${answer.kind}, but the completed answer response supplied ${answer.retentionPolicy}. Regenerate the blank answer template before applying answers.`,
    };
  }
  const context = answer.answerContext;
  if (
    !context
      || !hasNonEmptyArray(context.formCodes)
      || !hasNonEmptyArray(context.officialRevisionLabels)
      || !hasNonEmptyArray(context.sources)
  ) {
    return {
      code: 'answer_context_missing',
      fieldKey: field.fieldKey,
      answerKey: answer.answerKey ?? null,
      message: `${field.fieldKey} answer is missing form, revision, or source context. Regenerate the blank answer template from the current population plan before applying answers.`,
    };
  }
  const formMismatch = !context.formCodes.includes(item.formCode);
  const revisionMismatch = !context.officialRevisionLabels.includes(item.officialRevisionLabel);
  const sourceMismatch = !context.sources.includes(field.source);
  if (formMismatch || revisionMismatch || sourceMismatch) {
    return {
      code: 'answer_context_mismatch',
      fieldKey: field.fieldKey,
      answerKey: answer.answerKey ?? null,
      message: `${field.fieldKey} answer context does not match ${item.formCode} ${item.officialRevisionLabel}. Regenerate the blank answer template from the current population plan before applying answers.`,
    };
  }
  if (!normalizeValue(answer.answerValue)) {
    return {
      code: 'answer_value_missing',
      fieldKey: field.fieldKey,
      answerKey: answer.answerKey ?? null,
      message: `${field.officialFieldLabel} needs a non-empty answer before it can update the population plan.`,
    };
  }
  if ((answer.kind === 'consent_answer' || answer.kind === 'secure_session_answer') && answer.consentToUseInDraft !== true) {
    return {
      code: 'draft_use_consent_missing',
      fieldKey: field.fieldKey,
      answerKey: answer.answerKey ?? null,
      message: `${field.officialFieldLabel} needs consentToUseInDraft: true before DayOf can place it into a review-only draft.`,
    };
  }
  return null;
}

function buildAppliedNote(field, answer) {
  const parts = [
    field.note,
    `Intake answer applied from ${answer.kind}.`,
  ];
  if (answer.kind === 'consent_answer') parts.push('Draft-use consent recorded for this review-only draft.');
  if (answer.kind === 'secure_session_answer') parts.push('Secure-session value is marked ephemeral for draft generation.');
  return parts.filter(Boolean).join(' ');
}

function applyFieldAnswer(item, field, answer) {
  if (!answer) return { field, applied: false, skippedMappingTask: false, issue: null };
  if (answer.kind === 'pdf_mapping_task') return { field, applied: false, skippedMappingTask: true, issue: null };

  const issue = getAnswerIssue(answer, item, field);
  if (issue) return { field, applied: false, skippedMappingTask: false, issue };

  const answerValue = normalizeValue(answer.answerValue);
  const updatedField = {
    ...field,
    value: answerValue,
    hasValue: true,
    valueStatus: getUpdatedValueStatus(field),
    redactionPolicy: 'none',
    mappingStatus: getUpdatedMappingStatus(item, field),
    note: buildAppliedNote(field, answer),
    intakeAnswerAudit: {
      answerKey: answer.answerKey ?? null,
      kind: answer.kind,
      retentionPolicy: answer.retentionPolicy ?? getExpectedRetentionPolicy(answer.kind),
      consentToUseInDraft: answer.consentToUseInDraft === true,
      consentToSave: answer.consentToSave === true,
      answeredAt: answer.answeredAt ?? null,
    },
  };

  return {
    field: updatedField,
    applied: field.value !== answerValue || field.redactionPolicy !== updatedField.redactionPolicy || field.mappingStatus !== updatedField.mappingStatus,
    skippedMappingTask: false,
    issue: null,
  };
}

function buildUnmatchedAnswerIssue(answer) {
  return {
    code: 'unmatched_answer',
    fieldKey: answer.fieldKey,
    answerKey: answer.answerKey ?? null,
    message: `${answer.fieldKey} does not match any field in the current population plan. Regenerate the blank answer template, then apply answers from that current template.`,
  };
}

function getFieldBlocker(field) {
  if (field.redactionPolicy === 'requires_secure_session') return `${field.officialFieldLabel} requires a secure form session.`;
  if (field.redactionPolicy === 'requires_consent') return `${field.officialFieldLabel} requires consent before draft use.`;
  if (!field.hasValue) return `${field.officialFieldLabel} is missing.`;
  return null;
}

function getStatusLabel(status) {
  if (status === 'needs_input') return 'Needs info';
  if (status === 'needs_secure_session') return 'Needs secure session';
  if (status === 'needs_adapter_mapping') return 'Needs PDF mapping';
  if (status === 'guided_online') return 'Guided online';
  return 'Ready for population';
}

function getItemStatus(item, blockers, fields) {
  if (blockers.some((blocker) => blocker.includes('secure form session'))) return 'needs_secure_session';
  if (blockers.length > 0) return 'needs_input';
  if (item.adapterKind === 'guided_online_entry') return 'guided_online';
  if (fields.some((field) => field.mappingStatus === 'needs_pdf_field_probe')) return 'needs_adapter_mapping';
  if (fields.some((field) => field.mappingStatus === 'blocked')) return 'needs_input';
  return 'ready_for_population';
}

function getNextAction(status, blockers, fields) {
  if (status === 'needs_input') return blockers[0] ?? 'Collect missing user information before population.';
  if (status === 'needs_secure_session') return blockers[0] ?? 'Collect secure-session values before generating drafts.';
  if (status === 'guided_online') return 'Use the fill payload as copy guidance while the user completes the official online flow.';
  if (status === 'needs_adapter_mapping') {
    const firstUnmappedField = fields.find((field) => field.mappingStatus === 'needs_pdf_field_probe');
    return firstUnmappedField
      ? `Map ${firstUnmappedField.officialFieldLabel} to an official PDF field name before generating a filled draft.`
      : 'Review the official source/version before enabling a production population adapter.';
  }
  return 'Generate a review-only draft, then require the user to inspect, sign, and submit through official instructions.';
}

function getPrimaryAction(summary) {
  if (summary.needsInput > 0) return 'Collect the missing user information first, then refresh the population plan.';
  if (summary.needsSecureSession > 0) return 'Collect secure-session-only values before generating review drafts.';
  if (summary.needsAdapterMapping > 0) return 'Probe official PDF field names for the PDF candidates before generating filled PDFs.';
  if (summary.guidedOnline > 0) return 'Use guided online copy support for agency flows that do not expose a production PDF path.';
  return 'Generate review-only draft outputs and require user review before submission.';
}

function applyAnswers(populationPayload, answersPayload) {
  const normalizedAnswers = getValidAnswers(answersPayload.answers);
  const answerIndex = buildAnswerMap(normalizedAnswers.validAnswers);
  const answerMap = answerIndex.map;
  const matchedAnswers = new Set();
  const issues = [
    ...normalizedAnswers.malformedIssues,
    ...answerIndex.duplicateIssues,
  ];
  let appliedAnswers = 0;
  let unchangedAnswers = 0;
  let contextMissingAnswers = 0;
  let contextMismatchedAnswers = 0;
  let kindMismatchedAnswers = 0;
  let retentionMismatchedAnswers = 0;
  let skippedMappingTasks = 0;

  const items = populationPayload.items.map((item) => {
    const fieldMappings = (item.fieldMappings ?? []).map((field) => {
      const answer = getFieldAnswer(answerMap, field);
      if (answer) matchedAnswers.add(answer);
      const result = applyFieldAnswer(item, field, answer);
      if (result.issue) issues.push(result.issue);
      if (result.issue?.code === 'answer_context_missing') contextMissingAnswers += 1;
      if (result.issue?.code === 'answer_context_mismatch') contextMismatchedAnswers += 1;
      if (result.issue?.code === 'answer_kind_mismatch') kindMismatchedAnswers += 1;
      if (result.issue?.code === 'answer_retention_mismatch' || result.issue?.code === 'secure_retention_policy_invalid') retentionMismatchedAnswers += 1;
      if (result.applied) appliedAnswers += 1;
      if (result.skippedMappingTask) skippedMappingTasks += 1;
      if (answer && !result.issue && !result.applied && !result.skippedMappingTask) unchangedAnswers += 1;
      return result.field;
    });
    const blockers = fieldMappings.map(getFieldBlocker).filter(Boolean);
    const status = getItemStatus(item, blockers, fieldMappings);

    return {
      ...item,
      status,
      statusLabel: getStatusLabel(status),
      nextAction: getNextAction(status, blockers, fieldMappings),
      blockers,
      fieldMappings,
    };
  });
  const unmatchedAnswers = normalizedAnswers.validAnswers.filter((answer) => !matchedAnswers.has(answer) && !answerIndex.duplicateAnswers.has(answer));
  issues.push(...unmatchedAnswers.map(buildUnmatchedAnswerIssue));
  const summary = {
    totalForms: items.length,
    readyForPopulation: items.filter((item) => item.status === 'ready_for_population').length,
    needsAdapterMapping: items.filter((item) => item.status === 'needs_adapter_mapping').length,
    guidedOnline: items.filter((item) => item.status === 'guided_online').length,
    needsInput: items.filter((item) => item.status === 'needs_input').length,
    needsSecureSession: items.filter((item) => item.status === 'needs_secure_session').length,
    pdfFillCandidates: items.filter((item) => item.adapterKind === 'official_pdf_fill').length,
  };

  return {
    reviewOnly: true,
    generatedAt: new Date().toISOString(),
    primaryAction: getPrimaryAction(summary),
    summary,
    answerApplySummary: {
      ...summary,
      answers: answersPayload.answers.length,
      matchedAnswers: matchedAnswers.size,
      appliedAnswers,
      unchangedAnswers,
      contextMissingAnswers,
      contextMismatchedAnswers,
      duplicateAnswers: answerIndex.duplicateIssues.length,
      kindMismatchedAnswers,
      malformedAnswers: normalizedAnswers.malformedIssues.length,
      retentionMismatchedAnswers,
      skippedMappingTasks,
      unmatchedAnswers: unmatchedAnswers.length,
      issues: issues.length,
    },
    answerApplyIssues: issues,
    items,
  };
}

function getDefaultReportPath(outputPath) {
  return outputPath.endsWith('.json') ? outputPath.replace(/\.json$/, '.intake-answer-report.json') : `${outputPath}.intake-answer-report.json`;
}

async function readJsonInput(path, label) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`${label} is not valid JSON.`);
    }
    throw new Error(`Unable to read ${label}.`);
  }
}

async function main() {
  const { populationPath, answersPath, outputPath, reportPath } = parseArgs(process.argv.slice(2));
  if (!populationPath || !answersPath || !outputPath) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  const absolutePopulationPath = resolve(populationPath);
  const absoluteAnswersPath = resolve(answersPath);
  const absoluteOutputPath = resolve(outputPath);
  const absoluteReportPath = resolve(reportPath ?? getDefaultReportPath(absoluteOutputPath));
  const populationPayload = await readJsonInput(absolutePopulationPath, 'population input');
  const answersPayload = await readJsonInput(absoluteAnswersPath, 'answer response input');
  validatePopulationPayload(populationPayload);
  validateAnswersPayload(answersPayload);
  const refreshedPopulation = applyAnswers(populationPayload, answersPayload);
  const report = {
    reviewOnly: true,
    containsUserValues: false,
    generatedAt: new Date().toISOString(),
    status: refreshedPopulation.answerApplyIssues.length === 0 ? 'passed' : 'failed',
    populationPath: null,
    answersPath: null,
    outputPath: null,
    valueBearingPathsOmitted: true,
    summary: refreshedPopulation.answerApplySummary,
    issues: refreshedPopulation.answerApplyIssues,
  };

  await mkdir(dirname(absoluteReportPath), { recursive: true });
  await writeFile(absoluteReportPath, JSON.stringify(report, null, 2), 'utf8');

  if (report.status === 'passed') {
    await mkdir(dirname(absoluteOutputPath), { recursive: true });
    await writeFile(absoluteOutputPath, JSON.stringify(refreshedPopulation, null, 2), 'utf8');
  }

  console.log(JSON.stringify({
    reviewOnly: true,
    containsUserValues: false,
    status: report.status,
    outputWritten: report.status === 'passed',
    valueBearingOutputPathOmitted: true,
    reportPath: absoluteReportPath,
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
