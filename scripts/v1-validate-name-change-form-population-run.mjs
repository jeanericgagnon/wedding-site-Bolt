#!/usr/bin/env node
import { access, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

function usage() {
  return [
    'Usage:',
    '  node scripts/v1-validate-name-change-form-population-run.mjs --manifest /tmp/name-change-form-population-run/dayof-name-change-form-population-run-manifest.json',
    '  node scripts/v1-validate-name-change-form-population-run.mjs --dir /tmp/name-change-form-population-run --output /tmp/name-change-form-population-run/dayof-name-change-form-population-run-validation.json',
    '',
    'Validates that a full population run folder is review-only, internally consistent, and actionable whether the run passed or failed cleanly.',
  ].join('\n');
}

function parseArgs(argv) {
  const parsed = {
    manifestPath: null,
    runDir: null,
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
      parsed.runDir = argv[index + 1] ?? null;
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

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function pushIf(issues, condition, code, message, details = {}) {
  if (!condition) return;
  issues.push({
    code,
    message,
    details,
  });
}

function localizePath(runDir, path, subdir = null) {
  if (!path) return path;
  return subdir ? join(runDir, subdir, basename(path)) : join(runDir, basename(path));
}

function localizeRunManifestPaths(manifest, manifestPath) {
  const runDir = dirname(manifestPath);
  const files = manifest.files ?? {};

  return {
    ...manifest,
    files: {
      ...files,
      adapterTemplatePath: localizePath(runDir, files.adapterTemplatePath, 'pdf-adapter'),
      adapterTemplateIndexPath: localizePath(runDir, files.adapterTemplateIndexPath, 'pdf-adapter'),
      adapterTemplateStarterSelectionsPath: localizePath(runDir, files.adapterTemplateStarterSelectionsPath, 'pdf-adapter'),
      adapterSelectionTodoPath: localizePath(runDir, files.adapterSelectionTodoPath, 'pdf-adapter'),
      adapterSelectionTodoMarkdownPath: localizePath(runDir, files.adapterSelectionTodoMarkdownPath, 'pdf-adapter'),
      adapterSelectionTodoHtmlPath: localizePath(runDir, files.adapterSelectionTodoHtmlPath, 'pdf-adapter'),
      adapterPromotionDir: files.adapterPromotionDir ? join(runDir, 'pdf-adapter-promotion') : files.adapterPromotionDir,
      adapterReviewedTemplatePath: localizePath(runDir, files.adapterReviewedTemplatePath, 'pdf-adapter-promotion'),
      adapterSelectionReportPath: localizePath(runDir, files.adapterSelectionReportPath, 'pdf-adapter-promotion'),
      adapterSelectionReportIndexPath: localizePath(runDir, files.adapterSelectionReportIndexPath, 'pdf-adapter-promotion'),
      adapterValidationReportPath: localizePath(runDir, files.adapterValidationReportPath, 'pdf-adapter-promotion'),
      adapterValidationReportIndexPath: localizePath(runDir, files.adapterValidationReportIndexPath, 'pdf-adapter-promotion'),
      adapterCatalogPath: localizePath(runDir, files.adapterCatalogPath, 'pdf-adapter-promotion'),
      adapterPromotionManifestPath: localizePath(runDir, files.adapterPromotionManifestPath, 'pdf-adapter-promotion'),
      reviewBundleDir: files.reviewBundleDir ? join(runDir, 'review-bundle') : files.reviewBundleDir,
      reviewBundleIndexPath: localizePath(runDir, files.reviewBundleIndexPath, 'review-bundle'),
      reviewBundleManifestPath: localizePath(runDir, files.reviewBundleManifestPath, 'review-bundle'),
      reviewBundleAnsweredPopulationPath: localizePath(runDir, files.reviewBundleAnsweredPopulationPath, 'review-bundle'),
      reviewBundleAnswerApplyReportPath: localizePath(runDir, files.reviewBundleAnswerApplyReportPath, 'review-bundle'),
      reviewBundleFilledTemplateConversionReportPath: localizePath(runDir, files.reviewBundleFilledTemplateConversionReportPath, 'review-bundle'),
      reviewBundleFilledTemplateReadinessIndexPath: localizePath(runDir, files.reviewBundleFilledTemplateReadinessIndexPath, 'review-bundle'),
      runIndexPath: localizePath(runDir, files.runIndexPath),
      runHandoffPath: localizePath(runDir, files.runHandoffPath),
      runValidationPath: localizePath(runDir, files.runValidationPath),
      runManifestPath: manifestPath,
    },
  };
}

function getDerivedRunStatus(steps) {
  return steps.every((step) => step.status === 'passed' || step.status === 'skipped') ? 'passed' : 'failed';
}

function getStep(manifest, stepName) {
  return (manifest.steps ?? []).find((step) => step.step === stepName) ?? null;
}

function getRawPopulationValues(populationPayload) {
  return (populationPayload.items ?? [])
    .flatMap((item) => item.fieldMappings ?? [])
    .map((field) => field.value)
    .filter((value) => typeof value === 'string' && value.length >= 4);
}

function includesPathReference(text, path) {
  return Boolean(path && (text.includes(path) || text.includes(basename(path))));
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

function getFailedStep(manifest) {
  return (manifest.steps ?? []).find((step) => step.status === 'failed') ?? null;
}

async function requireFile({ issues, path, code, message, details = {} }) {
  pushIf(issues, !path || !(await fileExists(path)), code, message, {
    ...details,
    path,
  });
}

function validateCoreManifest({ issues, manifest }) {
  const steps = manifest.steps ?? [];
  const nextActions = manifest.nextActions ?? [];

  pushIf(issues, manifest.reviewOnly !== true, 'run_not_review_only', 'Run manifest must be reviewOnly.');
  pushIf(issues, manifest.safePayload !== true, 'run_not_safe_payload', 'Run manifest must be safePayload.');
  pushIf(issues, !['passed', 'failed'].includes(manifest.status), 'invalid_run_status', 'Run status must be passed or failed.', {
    status: manifest.status,
  });
  pushIf(issues, !Array.isArray(steps) || steps.length === 0, 'missing_run_steps', 'Run manifest must include step results.');
  pushIf(issues, steps.some((step) => !['passed', 'failed', 'skipped'].includes(step.status)), 'invalid_step_status', 'Each run step must be passed, failed, or skipped.');
  pushIf(issues, steps.length > 0 && manifest.status !== getDerivedRunStatus(steps), 'run_status_mismatch', 'Run status does not match step statuses.', {
    status: manifest.status,
    derivedStatus: getDerivedRunStatus(steps),
  });
  pushIf(issues, !Array.isArray(nextActions) || nextActions.length === 0, 'missing_next_actions', 'Run manifest must include at least one next action.');
  pushIf(issues, nextActions.length > 0 && nextActions[0].priority !== 'primary', 'missing_primary_next_action', 'The first next action should be primary.');

  for (const action of nextActions) {
    pushIf(issues, !action.id || !action.label || !action.detail, 'incomplete_next_action', 'Every next action must include id, label, and detail.', {
      action,
    });
  }

  const answerFileEntries = Object.entries(manifest.files ?? {}).filter(([name, value]) => {
    if (!value) return false;
    return value === manifest.inputs?.answersPath || name.toLowerCase().includes('answerresponse');
  });
  pushIf(
    issues,
    answerFileEntries.length > 0,
    'answer_response_in_run_files',
    'Run files must not point to the raw completed answer response.',
    { fileKeys: answerFileEntries.map(([name]) => name) },
  );
  pushIf(
    issues,
    JSON.stringify(manifest).includes('dayof-name-change-answer-response-'),
    'temporary_answer_response_path_leak',
    'Run manifest must not include temporary answer-response paths in step output or file metadata.',
  );
}

function validateActionSemantics({ issues, manifest }) {
  const firstAction = manifest.nextActions?.[0] ?? null;
  const selectionIssues = manifest.summary?.selectionIssues ?? [];
  const answerResponseIssues = manifest.summary?.answerResponseIssues ?? [];
  const answerApplyIssues = manifest.summary?.answerApplyIssues ?? [];
  const failedStep = getFailedStep(manifest);

  if (manifest.status === 'passed') {
    pushIf(issues, firstAction?.id !== 'open_final_review_bundle', 'wrong_success_next_action', 'Passed runs should point first to the final review bundle.', {
      firstActionId: firstAction?.id,
    });
    pushIf(issues, selectionIssues.length > 0, 'passed_run_has_selection_issues', 'Passed runs should not carry selection issues.');
    return;
  }

  pushIf(issues, !failedStep, 'failed_run_without_failed_step', 'Failed runs must identify the failed step.');

  if (selectionIssues.length > 0) {
    pushIf(issues, firstAction?.id !== 'review_selection_todo', 'wrong_selection_failure_next_action', 'Runs with selection issues should point first to the selection todo.', {
      firstActionId: firstAction?.id,
    });
  }
  if (failedStep?.step === 'build_review_bundle' && answerResponseIssues.length > 0) {
    pushIf(
      issues,
      firstAction?.id !== 'review_filled_template_conversion_report',
      'wrong_filled_template_failure_next_action',
      'Runs with filled-template conversion issues should point first to the conversion report.',
      { firstActionId: firstAction?.id },
    );
  }
  if (failedStep?.step === 'build_review_bundle' && answerResponseIssues.length === 0 && answerApplyIssues.length > 0) {
    pushIf(
      issues,
      firstAction?.id !== 'review_intake_answer_apply_report',
      'wrong_answer_apply_failure_next_action',
      'Runs with answer-apply issues should point first to the answer apply report.',
      { firstActionId: firstAction?.id },
    );
  }
}

async function validateRunFiles({ issues, manifest }) {
  await requireFile({
    issues,
    path: manifest.files?.runManifestPath,
    code: 'missing_run_manifest',
    message: 'Run manifest file is missing.',
  });
  await requireFile({
    issues,
    path: manifest.files?.runIndexPath,
    code: 'missing_run_index',
    message: 'Run index HTML is missing.',
  });
  await requireFile({
    issues,
    path: manifest.files?.runHandoffPath,
    code: 'missing_run_handoff',
    message: 'Run handoff Markdown is missing.',
  });

  if (getStep(manifest, 'build_adapter_template')?.status === 'passed') {
    await requireFile({
      issues,
      path: manifest.files?.adapterTemplatePath,
      code: 'missing_adapter_template',
      message: 'Adapter template JSON is missing after the template step passed.',
    });
    await requireFile({
      issues,
      path: manifest.files?.adapterTemplateIndexPath,
      code: 'missing_adapter_template_index',
      message: 'Adapter template HTML index is missing after the template step passed.',
    });
    await requireFile({
      issues,
      path: manifest.files?.adapterTemplateStarterSelectionsPath,
      code: 'missing_adapter_starter_selections',
      message: 'Adapter starter selections JSON is missing after the template step passed.',
    });
    await requireFile({
      issues,
      path: manifest.files?.adapterSelectionTodoPath,
      code: 'missing_adapter_selection_todo',
      message: 'Adapter selection todo JSON is missing after the template step passed.',
    });
    await requireFile({
      issues,
      path: manifest.files?.adapterSelectionTodoMarkdownPath,
      code: 'missing_adapter_selection_todo_markdown',
      message: 'Adapter selection todo Markdown is missing after the template step passed.',
    });
    await requireFile({
      issues,
      path: manifest.files?.adapterSelectionTodoHtmlPath,
      code: 'missing_adapter_selection_todo_html',
      message: 'Adapter selection todo HTML is missing after the template step passed.',
    });
  }

  if (getStep(manifest, 'promote_adapter_catalog')?.status === 'passed') {
    await requireFile({
      issues,
      path: manifest.files?.adapterPromotionManifestPath,
      code: 'missing_adapter_promotion_manifest',
      message: 'Adapter promotion manifest is missing after promotion passed.',
    });
    await requireFile({
      issues,
      path: manifest.files?.adapterCatalogPath,
      code: 'missing_adapter_catalog',
      message: 'Adapter catalog is missing after promotion passed.',
    });
  }

  if ((manifest.summary?.answerResponseIssues ?? []).length > 0) {
    await requireFile({
      issues,
      path: manifest.files?.reviewBundleFilledTemplateConversionReportPath,
      code: 'missing_filled_template_conversion_report',
      message: 'Filled-template conversion report is missing after conversion issues were reported.',
    });
    await requireFile({
      issues,
      path: manifest.files?.reviewBundleFilledTemplateReadinessIndexPath,
      code: 'missing_filled_template_readiness_index',
      message: 'Filled-template readiness HTML is missing after conversion issues were reported.',
    });
  }
  if ((manifest.summary?.answerApplyIssues ?? []).length > 0) {
    await requireFile({
      issues,
      path: manifest.files?.reviewBundleAnswerApplyReportPath,
      code: 'missing_answer_apply_report',
      message: 'Answer apply report is missing after answer-apply issues were reported.',
    });
  }

  if (getStep(manifest, 'build_review_bundle')?.status === 'passed') {
    await requireFile({
      issues,
      path: manifest.files?.reviewBundleIndexPath,
      code: 'missing_review_bundle_index',
      message: 'Final review bundle index is missing after bundle generation passed.',
    });
    await requireFile({
      issues,
      path: manifest.files?.reviewBundleManifestPath,
      code: 'missing_review_bundle_manifest',
      message: 'Final review bundle manifest is missing after bundle generation passed.',
    });
    if (manifest.inputs?.answersPath || manifest.inputs?.filledTemplatePath) {
      await requireFile({
        issues,
        path: manifest.files?.reviewBundleAnsweredPopulationPath,
        code: 'missing_answered_population',
        message: 'Answered population is missing after bundle generation with answers passed.',
      });
      await requireFile({
        issues,
        path: manifest.files?.reviewBundleAnswerApplyReportPath,
        code: 'missing_answer_apply_report',
        message: 'Answer apply report is missing after bundle generation with answers passed.',
      });
      if (manifest.inputs?.filledTemplatePath) {
        await requireFile({
          issues,
          path: manifest.files?.reviewBundleFilledTemplateConversionReportPath,
          code: 'missing_filled_template_conversion_report',
          message: 'Filled-template conversion report is missing after bundle generation with a filled template passed.',
        });
        await requireFile({
          issues,
          path: manifest.files?.reviewBundleFilledTemplateReadinessIndexPath,
          code: 'missing_filled_template_readiness_index',
          message: 'Filled-template readiness HTML is missing after bundle generation with a filled template passed.',
        });
      }
    }
  }
}

async function validateRunIndex({ issues, manifest }) {
  if (!manifest.files?.runIndexPath || !(await fileExists(manifest.files.runIndexPath))) return;
  const html = await readFile(manifest.files.runIndexPath, 'utf8');
  const selectionTodoHtmlExists = Boolean(manifest.files?.adapterSelectionTodoHtmlPath && await fileExists(manifest.files.adapterSelectionTodoHtmlPath));
  const answerApplyReportExists = Boolean(manifest.files?.reviewBundleAnswerApplyReportPath && await fileExists(manifest.files.reviewBundleAnswerApplyReportPath));
  const filledTemplateConversionReportExists = Boolean(manifest.files?.reviewBundleFilledTemplateConversionReportPath && await fileExists(manifest.files.reviewBundleFilledTemplateConversionReportPath));
  const filledTemplateReadinessIndexExists = Boolean(manifest.files?.reviewBundleFilledTemplateReadinessIndexPath && await fileExists(manifest.files.reviewBundleFilledTemplateReadinessIndexPath));
  pushIf(issues, !html.includes('DayOf Name Change Form Population Run'), 'run_index_missing_title', 'Run index is missing its title.');
  pushIf(issues, !html.includes('Next Actions'), 'run_index_missing_next_actions', 'Run index is missing the next-actions section.');
  pushIf(issues, !html.includes('Run handoff Markdown'), 'run_index_missing_handoff_link', 'Run index does not link the Markdown handoff.');
  pushIf(issues, !html.includes('Run validation JSON'), 'run_index_missing_validation_link', 'Run index does not link the validation report.');
  pushIf(issues, selectionTodoHtmlExists && !html.includes('Selection todo HTML'), 'run_index_missing_selection_todo_link', 'Run index does not link the existing selection todo.');
  pushIf(issues, !html.includes('Nothing here submits'), 'run_index_missing_review_only_warning', 'Run index is missing the review-only warning.');
  pushIf(
    issues,
    answerApplyReportExists && !html.includes('Answer apply report JSON'),
    'run_index_missing_answer_apply_link',
    'Run index does not link the existing answer apply report for an answer-backed run.',
  );
  pushIf(
    issues,
    filledTemplateConversionReportExists && !html.includes('Filled-template conversion report JSON'),
    'run_index_missing_filled_template_conversion_link',
    'Run index does not link the existing filled-template conversion report for a filled-template-backed run.',
  );
  pushIf(
    issues,
    filledTemplateReadinessIndexExists && !html.includes('Filled-template readiness HTML'),
    'run_index_missing_filled_template_readiness_link',
    'Run index does not link the existing filled-template readiness page for a filled-template-backed run.',
  );
  pushIf(
    issues,
    html.includes('dayof-name-change-answer-response-'),
    'run_index_temporary_answer_response_path_leak',
    'Run index must not include temporary answer-response paths.',
  );
  pushIf(
    issues,
    manifest.inputs?.answersPath && html.includes(manifest.inputs.answersPath),
    'run_index_answer_response_path_leak',
    'Run index must not include the value-bearing answer response input path.',
  );
  pushIf(
    issues,
    includesPathReference(html, manifest.files?.reviewBundleAnsweredPopulationPath),
    'run_index_answered_population_path_leak',
    'Run index must not link the value-bearing answered population file.',
  );
  pushIf(
    issues,
    manifest.inputs?.filledTemplatePath && html.includes(manifest.inputs.filledTemplatePath),
    'run_index_filled_template_path_leak',
    'Run index must not include the value-bearing filled-template input path.',
  );

  for (const action of manifest.nextActions ?? []) {
    pushIf(issues, !html.includes(action.label), 'run_index_missing_next_action', 'Run index is missing a next action label.', {
      actionId: action.id,
    });
  }
}

async function validateRunHandoff({ issues, manifest }) {
  if (!manifest.files?.runHandoffPath || !(await fileExists(manifest.files.runHandoffPath))) return;
  const handoff = await readFile(manifest.files.runHandoffPath, 'utf8');
  const answerApplyReportExists = Boolean(manifest.files?.reviewBundleAnswerApplyReportPath && await fileExists(manifest.files.reviewBundleAnswerApplyReportPath));
  const filledTemplateConversionReportExists = Boolean(manifest.files?.reviewBundleFilledTemplateConversionReportPath && await fileExists(manifest.files.reviewBundleFilledTemplateConversionReportPath));
  const filledTemplateReadinessIndexExists = Boolean(manifest.files?.reviewBundleFilledTemplateReadinessIndexPath && await fileExists(manifest.files.reviewBundleFilledTemplateReadinessIndexPath));
  pushIf(issues, !handoff.includes('DayOf Name Change Form Population Run Handoff'), 'handoff_missing_title', 'Markdown handoff is missing its title.');
  pushIf(issues, !handoff.includes('Review-only output'), 'handoff_missing_review_only_warning', 'Markdown handoff is missing the review-only warning.');
  pushIf(issues, !handoff.includes('## Next Actions'), 'handoff_missing_next_actions', 'Markdown handoff is missing next actions.');
  pushIf(issues, !handoff.includes(`Status: ${manifest.status}`), 'handoff_status_mismatch', 'Markdown handoff status does not match the run manifest.');
  pushIf(
    issues,
    answerApplyReportExists && !handoff.includes('Answer apply report'),
    'handoff_missing_answer_apply_report',
    'Markdown handoff does not link the existing answer apply report for an answer-backed run.',
  );
  pushIf(
    issues,
    filledTemplateConversionReportExists && !handoff.includes('Filled-template conversion report'),
    'handoff_missing_filled_template_conversion_report',
    'Markdown handoff does not link the existing filled-template conversion report for a filled-template-backed run.',
  );
  pushIf(
    issues,
    filledTemplateReadinessIndexExists && !handoff.includes('Filled-template readiness HTML'),
    'handoff_missing_filled_template_readiness_index',
    'Markdown handoff does not link the existing filled-template readiness page for a filled-template-backed run.',
  );
  pushIf(
    issues,
    handoff.includes('dayof-name-change-answer-response-'),
    'handoff_temporary_answer_response_path_leak',
    'Markdown handoff must not include temporary answer-response paths.',
  );
  pushIf(
    issues,
    manifest.inputs?.answersPath && handoff.includes(manifest.inputs.answersPath),
    'handoff_answer_response_path_leak',
    'Markdown handoff must not include the value-bearing answer response input path.',
  );
  pushIf(
    issues,
    includesPathReference(handoff, manifest.files?.reviewBundleAnsweredPopulationPath),
    'handoff_answered_population_path_leak',
    'Markdown handoff must not link the value-bearing answered population file.',
  );
  pushIf(
    issues,
    manifest.inputs?.filledTemplatePath && handoff.includes(manifest.inputs.filledTemplatePath),
    'handoff_filled_template_path_leak',
    'Markdown handoff must not include the value-bearing filled-template input path.',
  );

  for (const action of manifest.nextActions ?? []) {
    pushIf(issues, !handoff.includes(action.label), 'handoff_missing_next_action', 'Markdown handoff is missing a next action label.', {
      actionId: action.id,
    });
  }
}

async function validateNestedManifests({ issues, manifest }) {
  if (getStep(manifest, 'promote_adapter_catalog')?.status === 'passed' && manifest.files?.adapterPromotionManifestPath && await fileExists(manifest.files.adapterPromotionManifestPath)) {
    const adapterPromotion = await readJson(manifest.files.adapterPromotionManifestPath);
    pushIf(issues, adapterPromotion.reviewOnly !== true, 'adapter_promotion_not_review_only', 'Adapter promotion manifest must be reviewOnly.');
    pushIf(issues, adapterPromotion.status !== 'passed', 'adapter_promotion_not_passed', 'Adapter promotion manifest should be passed when the run step passed.', {
      status: adapterPromotion.status,
    });
    pushIf(issues, manifest.summary?.adapterPromotion?.catalog?.mappedFields !== adapterPromotion.summary?.catalog?.mappedFields, 'adapter_promotion_summary_mismatch', 'Run manifest adapter promotion summary does not match the promotion manifest.');
  }

  if (getStep(manifest, 'build_review_bundle')?.status === 'passed' && manifest.files?.reviewBundleManifestPath && await fileExists(manifest.files.reviewBundleManifestPath)) {
    const reviewBundle = await readJson(manifest.files.reviewBundleManifestPath);
    pushIf(issues, reviewBundle.reviewOnly !== true || reviewBundle.safePayload !== true, 'review_bundle_not_safe_payload', 'Review bundle manifest must be reviewOnly and safePayload.');
    pushIf(issues, manifest.summary?.reviewBundle?.reviewPacket?.readyPackets !== reviewBundle.summary?.reviewPacket?.readyPackets, 'review_bundle_summary_mismatch', 'Run manifest review bundle summary does not match the review bundle manifest.');
    if (manifest.inputs?.answersPath || manifest.inputs?.filledTemplatePath) {
      if (manifest.inputs?.answersPath) {
        pushIf(issues, reviewBundle.inputs?.answersPath !== manifest.inputs.answersPath, 'review_bundle_answers_input_mismatch', 'Nested review bundle answers input does not match the run manifest.');
      }
      if (manifest.inputs?.filledTemplatePath) {
        pushIf(issues, reviewBundle.inputs?.filledTemplatePath !== manifest.inputs.filledTemplatePath, 'review_bundle_filled_template_input_mismatch', 'Nested review bundle filled-template input does not match the run manifest.');
        pushIf(issues, reviewBundle.summary?.intakeAnswerResponse?.issues !== 0, 'review_bundle_answer_response_issues', 'Nested review bundle should have zero filled-template conversion issues after a passed filled-template-backed run.');
        pushIf(
          issues,
          manifest.summary?.answerResponse?.answerFields !== reviewBundle.summary?.intakeAnswerResponse?.answerFields,
          'answer_response_summary_mismatch',
          'Run manifest filled-template conversion summary does not match the nested review bundle.',
        );
      }
      pushIf(issues, reviewBundle.summary?.intakeAnswerApply?.issues !== 0, 'review_bundle_answer_apply_issues', 'Nested review bundle should have zero answer-apply issues after a passed answer-backed run.');
      pushIf(
        issues,
        manifest.summary?.answerApply?.appliedAnswers !== reviewBundle.summary?.intakeAnswerApply?.appliedAnswers,
        'answer_apply_summary_mismatch',
        'Run manifest answer-apply summary does not match the nested review bundle.',
      );
    }
  }
}

function validateFilledTemplateReadinessContract({ issues, report }) {
  if (!report) return;

  const fieldReadiness = report.fieldReadiness;
  pushIf(
    issues,
    !Array.isArray(fieldReadiness),
    'filled_template_readiness_missing_contract',
    'Filled-template conversion report must include fieldReadiness as an array.',
  );
  if (!Array.isArray(fieldReadiness)) return;

  const summary = report.summary ?? {};
  const reportIssues = Array.isArray(report.issues) ? report.issues : [];
  const stateCounts = Object.fromEntries([...FILLED_TEMPLATE_READINESS_STATES].map((state) => [state, 0]));
  const readinessIssueCodes = new Set();

  pushIf(
    issues,
    !Array.isArray(report.issues),
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

async function validateFilledTemplateConversionReport({ issues, manifest }) {
  if (!manifest.inputs?.filledTemplatePath || !manifest.files?.reviewBundleFilledTemplateConversionReportPath) return;
  if (!(await fileExists(manifest.files.reviewBundleFilledTemplateConversionReportPath))) return;

  const report = await readJson(manifest.files.reviewBundleFilledTemplateConversionReportPath);
  const reviewBundlePassed = getStep(manifest, 'build_review_bundle')?.status === 'passed';

  pushIf(issues, report.reviewOnly !== true, 'filled_template_conversion_not_review_only', 'Filled-template conversion report must be reviewOnly.');
  pushIf(issues, report.containsUserValues !== false, 'filled_template_conversion_contains_values', 'Filled-template conversion report must declare that it contains no user values.');
  validateFilledTemplateReadinessContract({ issues, report });

  if (!reviewBundlePassed) return;

  pushIf(issues, report.status !== 'passed', 'filled_template_conversion_failed', 'Filled-template conversion report must pass before a filled-template-backed run can pass.');
  pushIf(issues, report.summary?.issues !== 0, 'filled_template_conversion_has_issues', 'Filled-template conversion report must have zero issues after a passed filled-template-backed run.');
  pushIf(issues, report.dryRun !== false, 'filled_template_conversion_was_dry_run', 'Passed filled-template-backed runs must use a conversion report from an answer-response write, not dry-run preflight.');
  pushIf(issues, report.answerResponseReady !== true, 'filled_template_conversion_not_ready', 'Filled-template conversion report must mark the answer response ready.');
  pushIf(issues, report.answerResponseWritten !== true, 'filled_template_conversion_not_written', 'Filled-template conversion report must confirm the temporary answer response was written before apply.');
  pushIf(
    issues,
    manifest.summary?.answerResponse?.answerFields !== report.summary?.answerFields,
    'answer_response_report_summary_mismatch',
    'Run manifest filled-template conversion summary does not match the conversion report.',
  );
}

async function validateReviewBundleAnswerApplyReport({ issues, manifest }) {
  if (!manifest.files?.reviewBundleAnswerApplyReportPath || !(await fileExists(manifest.files.reviewBundleAnswerApplyReportPath))) return;

  const report = await readJson(manifest.files.reviewBundleAnswerApplyReportPath);
  pushIf(issues, report.reviewOnly !== true, 'answer_apply_report_not_review_only', 'Nested answer-apply report must be reviewOnly.');
  pushIf(issues, report.containsUserValues !== false, 'answer_apply_report_contains_values', 'Nested answer-apply report must declare that it contains no user values.');
  pushIf(issues, report.answersPath, 'answer_apply_report_answer_path_leak', 'Nested answer-apply report must not include the value-bearing answer response path.');
  pushIf(issues, report.outputPath, 'answer_apply_report_output_path_leak', 'Nested answer-apply report must not include the value-bearing answered population path.');
  pushIf(issues, report.valueBearingPathsOmitted !== true, 'answer_apply_report_paths_not_omitted', 'Nested answer-apply report must declare that value-bearing paths were omitted.');
}

async function validateFilledTemplateReadinessIndex({ issues, manifest }) {
  if (!manifest.inputs?.filledTemplatePath || !manifest.files?.reviewBundleFilledTemplateReadinessIndexPath) return;
  if (!(await fileExists(manifest.files.reviewBundleFilledTemplateReadinessIndexPath))) return;

  const html = await readFile(manifest.files.reviewBundleFilledTemplateReadinessIndexPath, 'utf8');
  const conversionReport = manifest.files?.reviewBundleFilledTemplateConversionReportPath && await fileExists(manifest.files.reviewBundleFilledTemplateConversionReportPath)
    ? await readJson(manifest.files.reviewBundleFilledTemplateConversionReportPath)
    : null;
  const answeredPopulation = manifest.files?.reviewBundleAnsweredPopulationPath && await fileExists(manifest.files.reviewBundleAnsweredPopulationPath)
    ? await readJson(manifest.files.reviewBundleAnsweredPopulationPath)
    : { items: [] };

  pushIf(issues, !html.includes('DayOf Name Change Intake Readiness'), 'filled_template_readiness_missing_title', 'Filled-template readiness HTML is missing its title.');
  pushIf(issues, !html.includes('No user-entered values'), 'filled_template_readiness_missing_safety_note', 'Filled-template readiness HTML is missing its no-values safety note.');
  pushIf(issues, html.includes('answerValue'), 'filled_template_readiness_answer_value_key_leak', 'Filled-template readiness HTML must not include answerValue fields.');
  pushIf(issues, html.includes('dayof-name-change-answer-response-'), 'filled_template_readiness_temporary_answer_response_path_leak', 'Filled-template readiness HTML must not include temporary answer-response paths.');
  pushIf(issues, html.includes(manifest.inputs.filledTemplatePath), 'filled_template_readiness_input_path_leak', 'Filled-template readiness HTML must not include the value-bearing filled-template input path.');

  for (const field of conversionReport?.fieldReadiness ?? []) {
    if (!field || typeof field !== 'object' || Array.isArray(field)) continue;

    pushIf(
      issues,
      !html.includes(String(field.fieldKey)) || !html.includes(String(field.state)),
      'filled_template_readiness_missing_field',
      'Filled-template readiness HTML is missing a field or state from the conversion report.',
      { fieldKey: field.fieldKey, state: field.state },
    );
  }

  for (const value of getRawPopulationValues(answeredPopulation)) {
    pushIf(
      issues,
      html.includes(value),
      'filled_template_readiness_value_leak',
      'Filled-template readiness HTML includes a raw population value.',
      {},
    );
  }
}

async function validateSelectionIssues({ issues, manifest }) {
  if (!manifest.files?.adapterSelectionReportPath || !(await fileExists(manifest.files.adapterSelectionReportPath))) return;
  const selectionReport = await readJson(manifest.files.adapterSelectionReportPath);
  const reportIssues = selectionReport.issues ?? [];
  const manifestIssues = manifest.summary?.selectionIssues ?? [];

  pushIf(issues, reportIssues.length !== manifestIssues.length, 'selection_issue_summary_mismatch', 'Run manifest selection issues do not match the selection report.', {
    manifestIssues: manifestIssues.length,
    reportIssues: reportIssues.length,
  });
}

async function validateSelectionTodo({ issues, manifest }) {
  if (!manifest.files?.adapterSelectionTodoPath || !(await fileExists(manifest.files.adapterSelectionTodoPath))) return;
  const todo = await readJson(manifest.files.adapterSelectionTodoPath);
  const adapterTemplate = manifest.summary?.adapterTemplate ?? {};

  pushIf(issues, todo.reviewOnly !== true || todo.safePayload !== true, 'selection_todo_not_safe_payload', 'Selection todo must be reviewOnly and safePayload.');
  pushIf(issues, todo.summary?.fieldsToMap !== adapterTemplate.fieldsToMap, 'selection_todo_summary_mismatch', 'Selection todo field count does not match the adapter template summary.', {
    todoFieldsToMap: todo.summary?.fieldsToMap,
    templateFieldsToMap: adapterTemplate.fieldsToMap,
  });
  pushIf(
    issues,
    (todo.items ?? []).some((item) => Object.hasOwn(item, 'value') || Object.hasOwn(item, 'fieldValue')),
    'selection_todo_contains_values',
    'Selection todo must not contain user form values.',
  );

  if (manifest.files?.adapterSelectionTodoMarkdownPath && await fileExists(manifest.files.adapterSelectionTodoMarkdownPath)) {
    const markdown = await readFile(manifest.files.adapterSelectionTodoMarkdownPath, 'utf8');
    pushIf(issues, !markdown.includes('DayOf PDF Adapter Selection Todo'), 'selection_todo_markdown_missing_title', 'Selection todo Markdown is missing its title.');
    pushIf(issues, !markdown.includes('not user form values'), 'selection_todo_markdown_missing_safety_note', 'Selection todo Markdown is missing its no-values safety note.');
  }

  if (manifest.files?.adapterSelectionTodoHtmlPath && await fileExists(manifest.files.adapterSelectionTodoHtmlPath)) {
    const html = await readFile(manifest.files.adapterSelectionTodoHtmlPath, 'utf8');
    pushIf(issues, !html.includes('DayOf PDF Adapter Selection Todo'), 'selection_todo_html_missing_title', 'Selection todo HTML is missing its title.');
    pushIf(issues, !html.includes('not user form values'), 'selection_todo_html_missing_safety_note', 'Selection todo HTML is missing its no-values safety note.');
    pushIf(issues, !html.includes('selectedPdfFieldName'), 'selection_todo_html_missing_selection_target', 'Selection todo HTML should name selectedPdfFieldName as the review target.');
  }
}

async function validateRun(manifestPath) {
  const issues = [];
  const manifest = localizeRunManifestPaths(await readJson(manifestPath), manifestPath);

  validateCoreManifest({ issues, manifest });
  validateActionSemantics({ issues, manifest });
  await validateRunFiles({ issues, manifest });
  await validateRunIndex({ issues, manifest });
  await validateRunHandoff({ issues, manifest });
  await validateNestedManifests({ issues, manifest });
  await validateReviewBundleAnswerApplyReport({ issues, manifest });
  await validateFilledTemplateConversionReport({ issues, manifest });
  await validateFilledTemplateReadinessIndex({ issues, manifest });
  await validateSelectionIssues({ issues, manifest });
  await validateSelectionTodo({ issues, manifest });

  return {
    reviewOnly: true,
    safePayload: true,
    validatedAt: new Date().toISOString(),
    manifestPath,
    status: issues.length === 0 ? 'passed' : 'failed',
    runStatus: manifest.status,
    summary: {
      issues: issues.length,
      runStatus: manifest.status,
      steps: (manifest.steps ?? []).length,
      nextActions: (manifest.nextActions ?? []).length,
      selectionIssues: (manifest.summary?.selectionIssues ?? []).length,
      readyPackets: manifest.summary?.reviewBundle?.reviewPacket?.readyPackets ?? 0,
      exportedFdfFiles: manifest.summary?.reviewBundle?.fdf?.exportedFdfFiles ?? 0,
    },
    issues,
  };
}

async function main() {
  const { manifestPath, runDir, outputPath } = parseArgs(process.argv.slice(2));
  const resolvedManifestPath = manifestPath
    ? resolve(manifestPath)
    : runDir
      ? join(resolve(runDir), 'dayof-name-change-form-population-run-manifest.json')
      : null;

  if (!resolvedManifestPath) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  const validation = await validateRun(resolvedManifestPath);
  const resolvedOutputPath = outputPath
    ? resolve(outputPath)
    : join(dirname(resolvedManifestPath), 'dayof-name-change-form-population-run-validation.json');
  await writeFile(resolvedOutputPath, JSON.stringify(validation, null, 2), 'utf8');

  console.log(JSON.stringify({
    reviewOnly: true,
    safePayload: true,
    outputPath: resolvedOutputPath,
    status: validation.status,
    runStatus: validation.runStatus,
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
