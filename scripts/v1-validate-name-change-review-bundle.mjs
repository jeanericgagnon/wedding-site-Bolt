#!/usr/bin/env node
import { access, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

function usage() {
  return [
    'Usage:',
    '  node scripts/v1-validate-name-change-review-bundle.mjs --manifest /tmp/name-change-review-bundle/dayof-name-change-review-bundle-manifest.json',
    '  node scripts/v1-validate-name-change-review-bundle.mjs --dir /tmp/name-change-review-bundle --output /tmp/name-change-review-bundle/dayof-name-change-review-bundle-validation.json',
    '',
    'Validates that bundle files are review-only, internally consistent, and do not export blocked or sensitive fields.',
  ].join('\n');
}

function parseArgs(argv) {
  const parsed = {
    manifestPath: null,
    bundleDir: null,
    outputPath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--manifest') {
      parsed.manifestPath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--dir') {
      parsed.bundleDir = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--output') {
      parsed.outputPath = argv[index + 1] ?? null;
      index += 1;
    }
  }

  return parsed;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function escapePdfLiteral(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
}

function countBy(items, predicate) {
  return items.filter(predicate).length;
}

function pushIf(issues, condition, code, message, details = {}) {
  if (condition) {
    issues.push({
      code,
      message,
      details,
    });
  }
}

function itemKey(item) {
  return `${item.formCode ?? 'UNKNOWN'}::${item.officialRevisionLabel ?? 'UNKNOWN'}`;
}

function buildItemMap(items) {
  return new Map(items.map((item) => [itemKey(item), item]));
}

function getRawPopulationValues(populationPayload) {
  return (populationPayload.items ?? [])
    .flatMap((item) => item.fieldMappings ?? [])
    .map((field) => field.value)
    .filter((value) => typeof value === 'string' && value.length >= 4);
}

const FILLED_TEMPLATE_READINESS_STATES = new Set([
  'ready_to_convert',
  'needs_answer',
  'needs_consent',
  'needs_secure_entry',
  'reviewer_mapping_task',
  'blocked',
]);

const FILLED_TEMPLATE_READINESS_SUMMARY_KEYS = [
  ['ready_to_convert', 'readyToConvertFields'],
  ['needs_answer', 'missingAnswerFields'],
  ['needs_consent', 'consentPendingFields'],
  ['needs_secure_entry', 'secureSessionPendingFields'],
  ['reviewer_mapping_task', 'reviewerMappingTasks'],
  ['blocked', 'blockedFields'],
];

function localizeBundlePath(bundleDir, path, subdir = null) {
  if (!path) return path;

  return subdir ? join(bundleDir, subdir, basename(path)) : join(bundleDir, basename(path));
}

function localizeManifestPaths(manifest, manifestPath) {
  const bundleDir = dirname(manifestPath);
  const files = manifest.files ?? {};

  return {
    ...manifest,
    files: {
      ...files,
      mappedPopulationPath: localizeBundlePath(bundleDir, files.mappedPopulationPath),
      activePopulationPath: localizeBundlePath(bundleDir, files.activePopulationPath ?? files.mappedPopulationPath),
      answeredPopulationPath: localizeBundlePath(bundleDir, files.answeredPopulationPath),
      answerApplyReportPath: localizeBundlePath(bundleDir, files.answerApplyReportPath),
      filledTemplateConversionReportPath: localizeBundlePath(bundleDir, files.filledTemplateConversionReportPath),
      filledTemplateReadinessIndexPath: localizeBundlePath(bundleDir, files.filledTemplateReadinessIndexPath),
      intakeGapReportPath: localizeBundlePath(bundleDir, files.intakeGapReportPath),
      intakeGapIndexPath: localizeBundlePath(bundleDir, files.intakeGapIndexPath),
      intakeAnswerTemplatePath: localizeBundlePath(bundleDir, files.intakeAnswerTemplatePath),
      intakeAnswerIndexPath: localizeBundlePath(bundleDir, files.intakeAnswerIndexPath),
      draftPayloadPath: localizeBundlePath(bundleDir, files.draftPayloadPath),
      fdfManifestPath: localizeBundlePath(bundleDir, files.fdfManifestPath, 'fdf'),
      reviewPacketPath: localizeBundlePath(bundleDir, files.reviewPacketPath),
      reviewIndexPath: localizeBundlePath(bundleDir, files.reviewIndexPath),
      validationReportPath: localizeBundlePath(bundleDir, files.validationReportPath),
      bundleManifestPath: manifestPath,
      fdfOutputDir: files.fdfOutputDir ? join(bundleDir, 'fdf') : files.fdfOutputDir,
    },
  };
}

function localizeFdfManifestPaths(fdfManifest, fdfManifestPath) {
  const fdfDir = dirname(fdfManifestPath);

  return {
    ...fdfManifest,
    outputDir: fdfDir,
    manifestPath: fdfManifestPath,
    exports: (fdfManifest.exports ?? []).map((item) => ({
      ...item,
      fdfPath: item.fdfPath ? join(fdfDir, basename(item.fdfPath)) : item.fdfPath,
    })),
  };
}

function validateSummaryCounts({ issues, manifest, intakeGapReport, intakeAnswerTemplate, draftPayload, fdfManifest, reviewPacket }) {
  const draftItems = Array.isArray(draftPayload.items) ? draftPayload.items : [];
  const fdfExports = Array.isArray(fdfManifest.exports) ? fdfManifest.exports : [];
  const fdfSkipped = Array.isArray(fdfManifest.skipped) ? fdfManifest.skipped : [];
  const reviewItems = Array.isArray(reviewPacket.items) ? reviewPacket.items : [];
  const reviewFieldInstructions = reviewItems.flatMap((item) => item.fieldInstructions ?? []);

  pushIf(issues, draftPayload.summary?.readyDrafts !== countBy(draftItems, (item) => item.status === 'ready'), 'draft_summary_mismatch', 'Draft ready count does not match draft items.');
  pushIf(issues, draftPayload.summary?.blockedDrafts !== countBy(draftItems, (item) => item.status === 'blocked'), 'draft_summary_mismatch', 'Draft blocked count does not match draft items.');
  pushIf(issues, draftPayload.summary?.guidedOnline !== countBy(draftItems, (item) => item.status === 'guided_online'), 'draft_summary_mismatch', 'Draft guided-online count does not match draft items.');
  pushIf(issues, fdfManifest.summary?.exportedFdfFiles !== fdfExports.length, 'fdf_summary_mismatch', 'FDF exported count does not match exported files.');
  pushIf(issues, fdfManifest.summary?.skippedForms !== fdfSkipped.length, 'fdf_summary_mismatch', 'FDF skipped count does not match skipped forms.');
  pushIf(issues, reviewPacket.summary?.readyPackets !== countBy(reviewItems, (item) => item.status === 'ready_for_review'), 'review_summary_mismatch', 'Review ready count does not match review items.');
  pushIf(issues, reviewPacket.summary?.blockedPackets !== countBy(reviewItems, (item) => item.status === 'blocked'), 'review_summary_mismatch', 'Review blocked count does not match review items.');
  pushIf(issues, reviewPacket.summary?.guidedOnline !== countBy(reviewItems, (item) => item.status === 'guided_online'), 'review_summary_mismatch', 'Review guided-online count does not match review items.');
  pushIf(issues, reviewPacket.summary?.fieldInstructions !== reviewFieldInstructions.length, 'review_summary_mismatch', 'Review field instruction count does not match review items.');
  pushIf(
    issues,
    reviewPacket.summary?.fieldReviewSteps !== reviewFieldInstructions.reduce((sum, field) => sum + (field.reviewSteps?.length ?? 0), 0),
    'review_summary_mismatch',
    'Review field-step count does not match review items.',
  );
  pushIf(issues, intakeGapReport.summary?.totalGaps !== (intakeGapReport.gaps ?? []).length, 'intake_gap_summary_mismatch', 'Intake gap total does not match gap items.');
  pushIf(issues, intakeAnswerTemplate.summary?.totalFields !== (intakeAnswerTemplate.fields ?? []).length, 'intake_answer_summary_mismatch', 'Intake answer field total does not match template fields.');
  pushIf(issues, manifest.summary?.intakeGaps?.totalGaps !== intakeGapReport.summary?.totalGaps, 'manifest_summary_mismatch', 'Bundle manifest intake-gap summary does not match intake gap report.');
  pushIf(issues, manifest.summary?.intakeAnswerTemplate?.totalFields !== intakeAnswerTemplate.summary?.totalFields, 'manifest_summary_mismatch', 'Bundle manifest intake-answer summary does not match intake answer template.');
  pushIf(issues, manifest.summary?.draft?.readyDrafts !== draftPayload.summary?.readyDrafts, 'manifest_summary_mismatch', 'Bundle manifest draft summary does not match draft payload.');
  pushIf(issues, manifest.summary?.fdf?.exportedFdfFiles !== fdfManifest.summary?.exportedFdfFiles, 'manifest_summary_mismatch', 'Bundle manifest FDF summary does not match FDF manifest.');
  pushIf(issues, manifest.summary?.reviewPacket?.readyPackets !== reviewPacket.summary?.readyPackets, 'manifest_summary_mismatch', 'Bundle manifest review summary does not match review packet.');
}

function validateSafety({ issues, populationPayload, draftPayload, reviewPacket }) {
  for (const item of populationPayload.items ?? []) {
    for (const field of item.fieldMappings ?? []) {
      pushIf(
        issues,
        field.redactionPolicy !== 'none' && field.value !== null && field.value !== undefined,
        'sensitive_population_value',
        'Population payload includes a value for a consent-gated or secure-session-only field.',
        { formCode: item.formCode, fieldKey: field.fieldKey },
      );
    }
  }

  for (const item of draftPayload.items ?? []) {
    for (const assignment of item.assignments ?? []) {
      pushIf(
        issues,
        assignment.redactionPolicy !== 'none',
        'sensitive_draft_assignment',
        'Draft payload includes a non-exportable sensitive assignment.',
        { formCode: item.formCode, fieldKey: assignment.fieldKey },
      );
      pushIf(
        issues,
        item.status !== 'ready',
        'assignment_on_non_ready_draft',
        'Draft payload includes assignments on a non-ready draft item.',
        { formCode: item.formCode, status: item.status },
      );
    }
  }

  for (const item of reviewPacket.items ?? []) {
    pushIf(
      issues,
      item.status !== 'ready_for_review' && (item.fieldInstructions ?? []).length > 0,
      'instructions_on_non_ready_packet',
      'Review packet includes field instructions for a non-ready packet.',
      { formCode: item.formCode, status: item.status },
    );
  }
}

function validateIntakeGapReport({ issues, populationPayload, intakeGapReport }) {
  pushIf(issues, intakeGapReport.reviewOnly !== true, 'intake_gap_not_review_only', 'Intake gap report must be reviewOnly.');
  pushIf(issues, intakeGapReport.safePayload !== true, 'intake_gap_not_safe_payload', 'Intake gap report must be safePayload.');
  pushIf(issues, intakeGapReport.containsUserValues !== false, 'intake_gap_contains_values', 'Intake gap report must declare that it contains no user values.');

  for (const gap of intakeGapReport.gaps ?? []) {
    pushIf(
      issues,
      Object.hasOwn(gap, 'value') || Object.hasOwn(gap, 'currentValue') || Object.hasOwn(gap, 'formattedValue'),
      'intake_gap_value_key',
      'Intake gap report must not include raw value fields.',
      { fieldKey: gap.fieldKey },
    );
    pushIf(
      issues,
      !Array.isArray(gap.officialRevisionLabels) || gap.officialRevisionLabels.length === 0,
      'intake_gap_missing_revision_context',
      'Intake gap report must include official revision context for answer provenance.',
      { fieldKey: gap.fieldKey },
    );
  }

  const rawValues = getRawPopulationValues(populationPayload);
  const reportText = JSON.stringify(intakeGapReport);
  for (const value of rawValues) {
    pushIf(
      issues,
      reportText.includes(value),
      'intake_gap_value_leak',
      'Intake gap report includes a raw population value.',
      {},
    );
  }
}

function validateIntakeAnswerTemplate({ issues, populationPayload, intakeGapReport, intakeAnswerTemplate }) {
  pushIf(issues, intakeAnswerTemplate.reviewOnly !== true, 'intake_answer_not_review_only', 'Intake answer template must be reviewOnly.');
  pushIf(issues, intakeAnswerTemplate.safePayload !== true, 'intake_answer_not_safe_payload', 'Intake answer template must be safePayload.');
  pushIf(issues, intakeAnswerTemplate.containsUserValues !== false, 'intake_answer_contains_values', 'Intake answer template must declare that it contains no user values.');
  pushIf(
    issues,
    (intakeAnswerTemplate.fields ?? []).length !== (intakeGapReport.gaps ?? []).length,
    'intake_answer_gap_mismatch',
    'Intake answer template field count must match intake gap count.',
  );

  const gapKeys = new Set((intakeGapReport.gaps ?? []).map((gap) => gap.gapKey));
  for (const field of intakeAnswerTemplate.fields ?? []) {
    pushIf(issues, !gapKeys.has(field.gapKey), 'intake_answer_without_gap', 'Intake answer field does not match an intake gap.', {
      fieldKey: field.fieldKey,
    });
    pushIf(issues, field.answerValue !== null, 'intake_answer_value_present', 'Intake answer template must leave answerValue blank.', {
      fieldKey: field.fieldKey,
    });
    pushIf(
      issues,
      !field.answerContext || !Array.isArray(field.answerContext.formCodes) || field.answerContext.formCodes.join('|') !== (field.formCodes ?? []).join('|'),
      'intake_answer_context_form_mismatch',
      'Intake answer template must carry form context matching its no-values form codes.',
      { fieldKey: field.fieldKey },
    );
    pushIf(
      issues,
      !Array.isArray(field.answerContext?.officialRevisionLabels) || field.answerContext.officialRevisionLabels.join('|') !== (field.officialRevisionLabels ?? []).join('|'),
      'intake_answer_context_revision_mismatch',
      'Intake answer template must carry official revision context matching the gap report.',
      { fieldKey: field.fieldKey },
    );
    pushIf(
      issues,
      field.kind === 'secure_session_answer' && field.retentionPolicy !== 'ephemeral_only',
      'intake_answer_secure_policy_mismatch',
      'Secure-session answer fields must be ephemeral only.',
      { fieldKey: field.fieldKey },
    );
    pushIf(
      issues,
      field.kind === 'pdf_mapping_task' && field.mappingRequired !== true,
      'intake_answer_mapping_flag_missing',
      'PDF mapping tasks must be marked as mappingRequired.',
      { fieldKey: field.fieldKey },
    );
  }

  const templateText = JSON.stringify(intakeAnswerTemplate);
  for (const value of getRawPopulationValues(populationPayload)) {
    pushIf(
      issues,
      templateText.includes(value),
      'intake_answer_value_leak',
      'Intake answer template includes a raw population value.',
      {},
    );
  }
}

function validateFilledTemplateReadinessContract({ issues, filledTemplateConversionReport }) {
  if (!filledTemplateConversionReport) return;

  const fieldReadiness = filledTemplateConversionReport.fieldReadiness;
  pushIf(
    issues,
    !Array.isArray(fieldReadiness),
    'filled_template_readiness_missing_contract',
    'Filled-template conversion report must include fieldReadiness as an array.',
  );
  if (!Array.isArray(fieldReadiness)) return;

  const summary = filledTemplateConversionReport.summary ?? {};
  const reportIssues = Array.isArray(filledTemplateConversionReport.issues) ? filledTemplateConversionReport.issues : [];
  const stateCounts = Object.fromEntries([...FILLED_TEMPLATE_READINESS_STATES].map((state) => [state, 0]));
  const readinessIssueCodes = new Set();

  pushIf(
    issues,
    !Array.isArray(filledTemplateConversionReport.issues),
    'filled_template_readiness_issues_missing',
    'Filled-template conversion report must include issues as an array.',
  );
  pushIf(
    issues,
    fieldReadiness.length !== summary.totalFields,
    'filled_template_readiness_summary_mismatch',
    'Filled-template fieldReadiness count must match summary.totalFields.',
    { fieldReadinessFields: fieldReadiness.length, summaryTotalFields: summary.totalFields },
  );

  for (const field of fieldReadiness) {
    if (!field || typeof field !== 'object' || Array.isArray(field)) {
      pushIf(
        issues,
        true,
        'filled_template_readiness_invalid_entry',
        'Filled-template fieldReadiness entries must be objects.',
        { entryType: Array.isArray(field) ? 'array' : typeof field },
      );
      continue;
    }

    const state = field.state;
    const issueCodes = Array.isArray(field.issueCodes) ? field.issueCodes : [];

    if (FILLED_TEMPLATE_READINESS_STATES.has(state)) {
      stateCounts[state] += 1;
    } else {
      pushIf(
        issues,
        true,
        'filled_template_readiness_invalid_state',
        'Filled-template fieldReadiness includes an unknown state.',
        { fieldKey: field.fieldKey, state },
      );
    }

    pushIf(
      issues,
      !Array.isArray(field.issueCodes),
      'filled_template_readiness_issue_codes_missing',
      'Filled-template fieldReadiness entries must include issueCodes as an array.',
      { fieldKey: field.fieldKey, state },
    );
    pushIf(
      issues,
      Object.hasOwn(field, 'answerValue') || Object.hasOwn(field, 'value'),
      'filled_template_readiness_contains_value',
      'Filled-template fieldReadiness entries must not include user values.',
      { fieldKey: field.fieldKey, state },
    );
    pushIf(
      issues,
      state === 'blocked' && issueCodes.length === 0,
      'filled_template_readiness_blocked_issue_mismatch',
      'Blocked filled-template fieldReadiness entries must name at least one issue code.',
      { fieldKey: field.fieldKey },
    );
    pushIf(
      issues,
      state !== 'blocked' && issueCodes.length > 0,
      'filled_template_readiness_blocked_issue_mismatch',
      'Only blocked filled-template fieldReadiness entries may carry issue codes.',
      { fieldKey: field.fieldKey, state, issueCodes },
    );

    for (const code of issueCodes) {
      readinessIssueCodes.add(String(code));
    }
  }

  for (const [state, summaryKey] of FILLED_TEMPLATE_READINESS_SUMMARY_KEYS) {
    pushIf(
      issues,
      stateCounts[state] !== summary[summaryKey],
      'filled_template_readiness_summary_mismatch',
      'Filled-template fieldReadiness state counts must match the conversion summary.',
      { state, summaryKey, fieldReadinessCount: stateCounts[state], summaryCount: summary[summaryKey] },
    );
  }

  for (const reportIssue of reportIssues) {
    if (!reportIssue?.code) continue;
    pushIf(
      issues,
      !readinessIssueCodes.has(String(reportIssue.code)),
      'filled_template_readiness_issue_alignment_mismatch',
      'Every filled-template conversion issue must be represented by a blocked fieldReadiness entry.',
      { issueCode: reportIssue.code },
    );
  }
}

function validateIntakeAnswerApplyReport({ issues, manifest, populationPayload, answerApplyReport, filledTemplateConversionReport }) {
  const answersPath = manifest.inputs?.answersPath ?? null;
  const filledTemplatePath = manifest.inputs?.filledTemplatePath ?? null;
  const hasAnswerInput = Boolean(answersPath || filledTemplatePath);
  const answerFiles = Object.entries(manifest.files ?? {}).filter(([name, value]) => {
    if (!value) return false;
    const normalizedName = name.toLowerCase();
    return normalizedName.includes('answerresponse') || normalizedName.includes('answerspath') || value === answersPath;
  });

  pushIf(
    issues,
    answerFiles.length > 0,
    'answer_response_in_bundle_files',
    'Bundle files must not point to the raw completed answer response.',
    { fileKeys: answerFiles.map(([name]) => name) },
  );

  if (!hasAnswerInput) {
    pushIf(
      issues,
      Boolean(manifest.files?.answeredPopulationPath || manifest.files?.answerApplyReportPath || manifest.summary?.intakeAnswerApply),
      'answer_apply_without_answers_input',
      'Answer-apply outputs should only be present when the manifest has an answers input.',
    );
    return;
  }

  pushIf(issues, !manifest.files?.answeredPopulationPath, 'answered_population_missing', 'Bundle with answers must include an answered population path.');
  pushIf(issues, !manifest.files?.answerApplyReportPath, 'answer_apply_report_missing', 'Bundle with answers must include a no-values answer-apply report.');
  if (filledTemplatePath) {
    pushIf(
      issues,
      !manifest.files?.filledTemplateConversionReportPath,
      'filled_template_conversion_report_missing',
      'Bundle with a filled template must include a no-values conversion report.',
    );
    if (filledTemplateConversionReport) {
      pushIf(issues, filledTemplateConversionReport.reviewOnly !== true, 'filled_template_conversion_not_review_only', 'Filled-template conversion report must be reviewOnly.');
      pushIf(issues, filledTemplateConversionReport.containsUserValues !== false, 'filled_template_conversion_contains_values', 'Filled-template conversion report must declare that it contains no user values.');
      pushIf(issues, filledTemplateConversionReport.status !== 'passed', 'filled_template_conversion_failed', 'Filled-template conversion report must pass before the review bundle can pass.');
      pushIf(issues, filledTemplateConversionReport.summary?.issues !== 0, 'filled_template_conversion_has_issues', 'Filled-template conversion report must have zero issues.');
      pushIf(issues, filledTemplateConversionReport.dryRun !== false, 'filled_template_conversion_was_dry_run', 'Review bundle conversion report must come from an answer-response write, not dry-run preflight.');
      pushIf(issues, filledTemplateConversionReport.answerResponseReady !== true, 'filled_template_conversion_not_ready', 'Filled-template conversion report must mark the answer response ready.');
      pushIf(issues, filledTemplateConversionReport.answerResponseWritten !== true, 'filled_template_conversion_not_written', 'Filled-template conversion report must confirm the temporary answer response was written before apply.');
      pushIf(
        issues,
        manifest.summary?.intakeAnswerResponse?.answerFields !== filledTemplateConversionReport.summary?.answerFields,
        'manifest_answer_response_summary_mismatch',
        'Bundle manifest filled-template conversion summary does not match the conversion report.',
      );
      validateFilledTemplateReadinessContract({ issues, filledTemplateConversionReport });
    }
  }
  if (!answerApplyReport) return;

  pushIf(issues, answerApplyReport.reviewOnly !== true, 'answer_apply_report_not_review_only', 'Answer-apply report must be reviewOnly.');
  pushIf(issues, answerApplyReport.containsUserValues !== false, 'answer_apply_report_contains_values', 'Answer-apply report must declare that it contains no user values.');
  pushIf(issues, answerApplyReport.answersPath, 'answer_apply_report_answer_path_leak', 'Answer-apply report must not include the value-bearing answer response path.');
  pushIf(issues, answerApplyReport.outputPath, 'answer_apply_report_output_path_leak', 'Answer-apply report must not include the value-bearing answered population path.');
  pushIf(issues, answerApplyReport.valueBearingPathsOmitted !== true, 'answer_apply_report_paths_not_omitted', 'Answer-apply report must declare that value-bearing paths were omitted.');
  pushIf(issues, answerApplyReport.status !== 'passed', 'answer_apply_report_failed', 'Answer-apply report must pass before the review bundle can pass.');
  pushIf(issues, answerApplyReport.summary?.issues !== 0, 'answer_apply_report_has_issues', 'Answer-apply report must have zero issues.');
  pushIf(
    issues,
    manifest.summary?.intakeAnswerApply?.appliedAnswers !== answerApplyReport.summary?.appliedAnswers,
    'manifest_answer_apply_summary_mismatch',
    'Bundle manifest answer-apply summary does not match the answer-apply report.',
  );

  const reportText = JSON.stringify(answerApplyReport);
  const conversionReportText = JSON.stringify(filledTemplateConversionReport ?? {});
  for (const value of getRawPopulationValues(populationPayload)) {
    pushIf(
      issues,
      reportText.includes(value),
      'answer_apply_report_value_leak',
      'Answer-apply report includes a raw population value.',
      {},
    );
    pushIf(
      issues,
      conversionReportText.includes(value),
      'filled_template_conversion_value_leak',
      'Filled-template conversion report includes a raw population value.',
      {},
    );
  }
}

async function validateFilledTemplateReadinessIndex({ issues, manifest, populationPayload, filledTemplateConversionReport }) {
  if (!manifest.files?.filledTemplateReadinessIndexPath || !(await fileExists(manifest.files.filledTemplateReadinessIndexPath))) return;
  const html = await readFile(manifest.files.filledTemplateReadinessIndexPath, 'utf8');

  pushIf(issues, !html.includes('DayOf Name Change Intake Readiness'), 'filled_template_readiness_missing_title', 'Filled-template readiness HTML is missing its title.');
  pushIf(issues, !html.includes('No user-entered values'), 'filled_template_readiness_missing_safety_note', 'Filled-template readiness HTML is missing its no-values safety note.');
  pushIf(issues, html.includes('answerValue'), 'filled_template_readiness_answer_value_key_leak', 'Filled-template readiness HTML must not include answerValue fields.');
  pushIf(issues, html.includes('dayof-name-change-answer-response-'), 'filled_template_readiness_temporary_answer_response_path_leak', 'Filled-template readiness HTML must not include temporary answer-response paths.');
  if (manifest.inputs?.filledTemplatePath) {
    pushIf(issues, html.includes(manifest.inputs.filledTemplatePath), 'filled_template_readiness_input_path_leak', 'Filled-template readiness HTML must not include the value-bearing filled-template input path.');
  }

  for (const field of filledTemplateConversionReport?.fieldReadiness ?? []) {
    if (!field || typeof field !== 'object' || Array.isArray(field)) continue;

    pushIf(
      issues,
      !html.includes(String(field.fieldKey)) || !html.includes(String(field.state)),
      'filled_template_readiness_missing_field',
      'Filled-template readiness HTML is missing a field or state from the conversion report.',
      { fieldKey: field.fieldKey, state: field.state },
    );
  }

  for (const value of getRawPopulationValues(populationPayload)) {
    pushIf(
      issues,
      html.includes(value),
      'filled_template_readiness_value_leak',
      'Filled-template readiness HTML includes a raw population value.',
      {},
    );
  }
}

async function validateFiles({ issues, manifest, fdfManifest }) {
  const fileEntries = [
    ['mappedPopulationPath', manifest.files?.mappedPopulationPath],
    ['activePopulationPath', manifest.files?.activePopulationPath ?? manifest.files?.mappedPopulationPath],
    ['intakeGapReportPath', manifest.files?.intakeGapReportPath],
    ['intakeGapIndexPath', manifest.files?.intakeGapIndexPath],
    ['intakeAnswerTemplatePath', manifest.files?.intakeAnswerTemplatePath],
    ['intakeAnswerIndexPath', manifest.files?.intakeAnswerIndexPath],
    ['draftPayloadPath', manifest.files?.draftPayloadPath],
    ['fdfManifestPath', manifest.files?.fdfManifestPath],
    ['reviewPacketPath', manifest.files?.reviewPacketPath],
    ['reviewIndexPath', manifest.files?.reviewIndexPath],
    ['bundleManifestPath', manifest.files?.bundleManifestPath],
  ];

  for (const [name, path] of fileEntries) {
    pushIf(issues, !path || !(await fileExists(path)), 'missing_bundle_file', `Bundle file is missing: ${name}.`, { path });
  }

  if (manifest.inputs?.answersPath || manifest.inputs?.filledTemplatePath) {
    const answerFileEntries = [
      ['answeredPopulationPath', manifest.files?.answeredPopulationPath],
      ['answerApplyReportPath', manifest.files?.answerApplyReportPath],
    ];
    for (const [name, path] of answerFileEntries) {
      pushIf(issues, !path || !(await fileExists(path)), 'missing_bundle_file', `Bundle file is missing: ${name}.`, { path });
    }
    if (manifest.inputs?.filledTemplatePath) {
      pushIf(
        issues,
        !manifest.files?.filledTemplateConversionReportPath || !(await fileExists(manifest.files.filledTemplateConversionReportPath)),
        'missing_bundle_file',
        'Bundle file is missing: filledTemplateConversionReportPath.',
        { path: manifest.files?.filledTemplateConversionReportPath },
      );
      pushIf(
        issues,
        !manifest.files?.filledTemplateReadinessIndexPath || !(await fileExists(manifest.files.filledTemplateReadinessIndexPath)),
        'missing_bundle_file',
        'Bundle file is missing: filledTemplateReadinessIndexPath.',
        { path: manifest.files?.filledTemplateReadinessIndexPath },
      );
    }
  }

  for (const item of fdfManifest.exports ?? []) {
    pushIf(issues, !item.fdfPath || !(await fileExists(item.fdfPath)), 'missing_fdf_file', 'FDF export file is missing.', {
      formCode: item.formCode,
      fdfPath: item.fdfPath,
    });
  }
}

async function validateFdfContents({ issues, draftPayload, fdfManifest }) {
  const draftByKey = buildItemMap(draftPayload.items ?? []);

  for (const exported of fdfManifest.exports ?? []) {
    const draftItem = draftByKey.get(itemKey(exported));
    pushIf(issues, !draftItem, 'orphan_fdf_export', 'FDF export does not match any draft item.', {
      formCode: exported.formCode,
      officialRevisionLabel: exported.officialRevisionLabel,
    });
    pushIf(issues, draftItem && draftItem.status !== 'ready', 'fdf_for_non_ready_draft', 'FDF export was produced for a non-ready draft item.', {
      formCode: exported.formCode,
      status: draftItem?.status,
    });

    if (!exported.fdfPath || !(await fileExists(exported.fdfPath)) || !draftItem) continue;
    const fdfText = await readFile(exported.fdfPath, 'utf8');
    for (const assignment of draftItem.assignments ?? []) {
      const fieldNeedle = `/T (${escapePdfLiteral(assignment.pdfFieldName)})`;
      const valueNeedle = `/V (${escapePdfLiteral(assignment.value)})`;
      pushIf(issues, !fdfText.includes(fieldNeedle), 'fdf_missing_field', 'FDF file is missing an expected PDF field assignment.', {
        formCode: exported.formCode,
        pdfFieldName: assignment.pdfFieldName,
      });
      pushIf(issues, !fdfText.includes(valueNeedle), 'fdf_missing_value', 'FDF file is missing an expected safe value assignment.', {
        formCode: exported.formCode,
        fieldKey: assignment.fieldKey,
      });
    }
    pushIf(
      issues,
      exported.assignmentCount !== (draftItem.assignments ?? []).length,
      'fdf_assignment_count_mismatch',
      'FDF export assignment count does not match the ready draft item.',
      { formCode: exported.formCode },
    );
  }
}

function validateReviewPacket({ issues, draftPayload, fdfManifest, reviewPacket }) {
  const draftByKey = buildItemMap(draftPayload.items ?? []);
  const fdfByKey = buildItemMap(fdfManifest.exports ?? []);

  for (const item of reviewPacket.items ?? []) {
    const draftItem = draftByKey.get(itemKey(item));
    pushIf(issues, !draftItem, 'orphan_review_packet', 'Review packet item does not match any draft item.', {
      formCode: item.formCode,
      officialRevisionLabel: item.officialRevisionLabel,
    });
    if (!draftItem) continue;

    if (item.status === 'ready_for_review') {
      const fdfItem = fdfByKey.get(itemKey(item));
      pushIf(issues, draftItem.status !== 'ready', 'ready_packet_without_ready_draft', 'Ready review packet does not match a ready draft item.', {
        formCode: item.formCode,
        draftStatus: draftItem.status,
      });
      pushIf(issues, !fdfItem, 'ready_packet_without_fdf', 'Ready review packet does not have a matching FDF export.', {
        formCode: item.formCode,
      });
      pushIf(issues, (item.fieldInstructions ?? []).length !== (draftItem.assignments ?? []).length, 'review_instruction_count_mismatch', 'Review field instruction count does not match draft assignments.', {
        formCode: item.formCode,
      });

      const assignments = new Map((draftItem.assignments ?? []).map((assignment) => [assignment.fieldKey, assignment]));
      for (const instruction of item.fieldInstructions ?? []) {
        const assignment = assignments.get(instruction.fieldKey);
        pushIf(issues, !assignment, 'review_instruction_without_assignment', 'Review instruction does not match a draft assignment.', {
          formCode: item.formCode,
          fieldKey: instruction.fieldKey,
        });
        pushIf(
          issues,
          assignment && (assignment.pdfFieldName !== instruction.pdfFieldName || assignment.value !== instruction.value),
          'review_instruction_assignment_mismatch',
          'Review instruction PDF field or value does not match draft assignment.',
          { formCode: item.formCode, fieldKey: instruction.fieldKey },
        );
        pushIf(
          issues,
          typeof instruction.copyInstruction !== 'string'
            || !instruction.copyInstruction.includes(String(instruction.pdfFieldName))
            || !instruction.copyInstruction.includes(String(instruction.value)),
          'review_instruction_missing_copy_action',
          'Review instruction must include a plain-language copy action with the PDF field and value.',
          { formCode: item.formCode, fieldKey: instruction.fieldKey },
        );
        pushIf(
          issues,
          !Array.isArray(instruction.reviewSteps) || instruction.reviewSteps.length < 3,
          'review_instruction_missing_steps',
          'Review instruction must include field-level review steps.',
          { formCode: item.formCode, fieldKey: instruction.fieldKey },
        );
      }
    }

    if (item.status === 'blocked') {
      pushIf(issues, (item.blockers ?? []).length === 0, 'blocked_packet_without_blocker', 'Blocked review packet does not explain the blocker.', {
        formCode: item.formCode,
      });
    }
  }
}

async function validateReviewIndex({ issues, manifest, reviewPacket }) {
  if (!manifest.files?.reviewIndexPath || !(await fileExists(manifest.files.reviewIndexPath))) return;
  const html = await readFile(manifest.files.reviewIndexPath, 'utf8');
  pushIf(issues, !html.includes('DayOf Name Change Review Bundle'), 'review_index_missing_title', 'HTML review index is missing its title.');
  pushIf(issues, !html.includes('Intake gaps'), 'review_index_missing_intake_gaps', 'HTML review index is missing the intake gaps summary.');
  pushIf(issues, !html.includes('Answer fields'), 'review_index_missing_answer_fields', 'HTML review index is missing the intake answer-field summary.');
  pushIf(
    issues,
    manifest.summary?.intakeAnswerApply && !html.includes('Answers applied'),
    'review_index_missing_answers_applied',
    'HTML review index is missing the answer-apply summary.',
  );
  pushIf(
    issues,
    manifest.summary?.intakeAnswerResponse && !html.includes('Filled answers'),
    'review_index_missing_filled_answers',
    'HTML review index is missing the filled-template conversion summary.',
  );
  if (manifest.files?.filledTemplateReadinessIndexPath) {
    pushIf(
      issues,
      !html.includes(basename(manifest.files.filledTemplateReadinessIndexPath)),
      'review_index_missing_filled_template_readiness',
      'HTML review index does not link the filled-template readiness page.',
    );
  }
  if (manifest.files?.answeredPopulationPath) {
    pushIf(
      issues,
      html.includes(manifest.files.answeredPopulationPath) || html.includes(basename(manifest.files.answeredPopulationPath)),
      'review_index_answered_population_path_leak',
      'HTML review index must not link the value-bearing answered population file.',
    );
  }

  for (const item of reviewPacket.items ?? []) {
    pushIf(issues, !html.includes(String(item.formCode)), 'review_index_missing_form', 'HTML review index is missing a review packet form.', {
      formCode: item.formCode,
    });
  }
}

async function validateBundle(manifestPath) {
  const issues = [];
  const manifest = localizeManifestPaths(await readJson(manifestPath), manifestPath);
  pushIf(issues, manifest.reviewOnly !== true, 'manifest_not_review_only', 'Bundle manifest must be reviewOnly.');
  pushIf(issues, manifest.safePayload !== true, 'manifest_not_safe_payload', 'Bundle manifest must be safePayload.');

  const activePopulationPath = manifest.files?.activePopulationPath ?? manifest.files?.mappedPopulationPath;
  const populationPayload = activePopulationPath ? await readJson(activePopulationPath) : { items: [] };
  const answerApplyReport = manifest.files?.answerApplyReportPath && await fileExists(manifest.files.answerApplyReportPath)
    ? await readJson(manifest.files.answerApplyReportPath)
    : null;
  const filledTemplateConversionReport = manifest.files?.filledTemplateConversionReportPath && await fileExists(manifest.files.filledTemplateConversionReportPath)
    ? await readJson(manifest.files.filledTemplateConversionReportPath)
    : null;
  const intakeGapReport = manifest.files?.intakeGapReportPath ? await readJson(manifest.files.intakeGapReportPath) : { gaps: [], summary: {} };
  const intakeAnswerTemplate = manifest.files?.intakeAnswerTemplatePath ? await readJson(manifest.files.intakeAnswerTemplatePath) : { fields: [], summary: {} };
  const draftPayload = manifest.files?.draftPayloadPath ? await readJson(manifest.files.draftPayloadPath) : { items: [] };
  const fdfManifest = manifest.files?.fdfManifestPath
    ? localizeFdfManifestPaths(await readJson(manifest.files.fdfManifestPath), manifest.files.fdfManifestPath)
    : { exports: [], skipped: [] };
  const reviewPacket = manifest.files?.reviewPacketPath ? await readJson(manifest.files.reviewPacketPath) : { items: [] };

  pushIf(issues, populationPayload.reviewOnly !== true, 'population_not_review_only', 'Mapped population payload must be reviewOnly.');
  pushIf(issues, intakeGapReport.reviewOnly !== true || intakeGapReport.safePayload !== true, 'intake_gap_not_safe_payload', 'Intake gap report must be reviewOnly and safePayload.');
  pushIf(issues, intakeAnswerTemplate.reviewOnly !== true || intakeAnswerTemplate.safePayload !== true, 'intake_answer_not_safe_payload', 'Intake answer template must be reviewOnly and safePayload.');
  pushIf(issues, draftPayload.reviewOnly !== true || draftPayload.safePayload !== true, 'draft_not_safe_payload', 'Draft payload must be reviewOnly and safePayload.');
  pushIf(issues, fdfManifest.reviewOnly !== true, 'fdf_manifest_not_review_only', 'FDF manifest must be reviewOnly.');
  pushIf(issues, reviewPacket.reviewOnly !== true || reviewPacket.safePayload !== true, 'review_packet_not_safe_payload', 'Review packet must be reviewOnly and safePayload.');

  validateSummaryCounts({ issues, manifest, intakeGapReport, intakeAnswerTemplate, draftPayload, fdfManifest, reviewPacket });
  validateSafety({ issues, populationPayload, draftPayload, reviewPacket });
  validateIntakeGapReport({ issues, populationPayload, intakeGapReport });
  validateIntakeAnswerTemplate({ issues, populationPayload, intakeGapReport, intakeAnswerTemplate });
  validateIntakeAnswerApplyReport({ issues, manifest, populationPayload, answerApplyReport, filledTemplateConversionReport });
  await validateFilledTemplateReadinessIndex({ issues, manifest, populationPayload, filledTemplateConversionReport });
  await validateFiles({ issues, manifest, fdfManifest });
  await validateFdfContents({ issues, draftPayload, fdfManifest });
  validateReviewPacket({ issues, draftPayload, fdfManifest, reviewPacket });
  await validateReviewIndex({ issues, manifest, reviewPacket });

  return {
    reviewOnly: true,
    safePayload: true,
    validatedAt: new Date().toISOString(),
    manifestPath,
    status: issues.length === 0 ? 'passed' : 'failed',
    summary: {
      issues: issues.length,
      intakeGaps: intakeGapReport.summary?.totalGaps ?? 0,
      intakeAnswerFields: intakeAnswerTemplate.summary?.totalFields ?? 0,
      readyPackets: reviewPacket.summary?.readyPackets ?? 0,
      blockedPackets: reviewPacket.summary?.blockedPackets ?? 0,
      exportedFdfFiles: fdfManifest.summary?.exportedFdfFiles ?? 0,
    },
    issues,
  };
}

async function main() {
  const { manifestPath, bundleDir, outputPath } = parseArgs(process.argv.slice(2));
  const resolvedManifestPath = manifestPath
    ? resolve(manifestPath)
    : bundleDir
      ? join(resolve(bundleDir), 'dayof-name-change-review-bundle-manifest.json')
      : null;
  if (!resolvedManifestPath) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  const validation = await validateBundle(resolvedManifestPath);
  const resolvedOutputPath = outputPath
    ? resolve(outputPath)
    : join(dirname(resolvedManifestPath), 'dayof-name-change-review-bundle-validation.json');
  await writeFile(resolvedOutputPath, JSON.stringify(validation, null, 2), 'utf8');

  console.log(JSON.stringify({
    reviewOnly: true,
    safePayload: true,
    outputPath: resolvedOutputPath,
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
