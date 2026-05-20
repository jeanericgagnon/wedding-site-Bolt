import type { NameChangePopulationIntakeAnswer, NameChangePopulationIntakeAnswerPayload } from './formPopulationIntakeAnswerApply';
import type {
  NameChangePopulationIntakeAnswerKind,
  NameChangePopulationIntakeAnswerRetention,
  NameChangePopulationIntakeAnswerTemplateField,
} from './formPopulationIntakeAnswerTemplate';

export type NameChangePopulationFilledIntakeAnswerTemplateField =
  Omit<NameChangePopulationIntakeAnswerTemplateField, 'answerValue' | 'consentToUseInDraft' | 'consentToSave'> & {
    answerValue?: string | null;
    consentToUseInDraft?: boolean | null;
    consentToSave?: boolean | null;
  };

export interface NameChangePopulationIntakeAnswerResponseIssue {
  code: string;
  fieldKey?: string;
  answerKey?: string;
  message: string;
}

export type NameChangePopulationIntakeAnswerReadinessState =
  | 'ready_to_convert'
  | 'needs_answer'
  | 'needs_consent'
  | 'needs_secure_entry'
  | 'reviewer_mapping_task'
  | 'blocked';

export interface NameChangePopulationIntakeAnswerFieldReadiness {
  answerKey?: string;
  gapKey?: string;
  fieldKey?: string;
  kind: string;
  label: string;
  formCodes: string[];
  officialRevisionLabels: string[];
  state: NameChangePopulationIntakeAnswerReadinessState;
  issueCodes: string[];
  nextAction: string;
}

export interface NameChangePopulationIntakeAnswerResponseReport {
  reviewOnly: true;
  containsUserValues: false;
  status: 'passed' | 'failed';
  source: string;
  summary: {
    totalFields: number;
    answerFields: number;
    standardAnswers: number;
    consentAnswers: number;
    secureSessionAnswers: number;
    duplicateTemplateFields: number;
    malformedFields: number;
    contextMissingFields: number;
    readyToConvertFields: number;
    blockedFields: number;
    missingAnswerFields: number;
    consentPendingFields: number;
    secureSessionPendingFields: number;
    reviewerMappingTasks: number;
    skippedBlankFields: number;
    skippedMappingTasks: number;
    issues: number;
  };
  issues: NameChangePopulationIntakeAnswerResponseIssue[];
  fieldReadiness: NameChangePopulationIntakeAnswerFieldReadiness[];
}

export interface NameChangePopulationIntakeAnswerResponseBuildPlan {
  answerPayload: NameChangePopulationIntakeAnswerPayload;
  answerPayloadJson: string;
  report: NameChangePopulationIntakeAnswerResponseReport;
}

function normalizeValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function answerLookupKeys(field: NameChangePopulationFilledIntakeAnswerTemplateField) {
  return [field.answerKey, field.gapKey, field.fieldKey].filter((key): key is string => Boolean(key));
}

function isValidAnswerKind(kind: unknown): kind is NameChangePopulationIntakeAnswerKind {
  return kind === 'standard_answer'
    || kind === 'consent_answer'
    || kind === 'secure_session_answer'
    || kind === 'pdf_mapping_task';
}

function hasNonEmptyArray(value: unknown) {
  return Array.isArray(value) && value.length > 0;
}

function isTemplateFieldRecord(value: unknown): value is NameChangePopulationFilledIntakeAnswerTemplateField {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function hasAnswerContext(field: NameChangePopulationFilledIntakeAnswerTemplateField) {
  return Boolean(
    field.answerContext
      && hasNonEmptyArray(field.answerContext.formCodes)
      && hasNonEmptyArray(field.answerContext.officialRevisionLabels)
      && hasNonEmptyArray(field.answerContext.sources),
  );
}

function getExpectedRetentionPolicy(kind: NameChangePopulationIntakeAnswerKind): NameChangePopulationIntakeAnswerRetention {
  if (kind === 'secure_session_answer') return 'ephemeral_only';
  if (kind === 'consent_answer') return 'save_or_use_only_with_consent';
  if (kind === 'pdf_mapping_task') return 'not_user_answer';
  return 'normal_planner';
}

function buildDuplicateTemplateFieldIssue(
  field: NameChangePopulationFilledIntakeAnswerTemplateField,
  duplicateKey: string,
): NameChangePopulationIntakeAnswerResponseIssue {
  return {
    code: 'duplicate_template_field',
    fieldKey: field.fieldKey,
    answerKey: field.answerKey,
    message: `${field.fieldKey} appears more than once in the filled answer template through ${duplicateKey}. Keep one filled template field before building an answer response.`,
  };
}

function buildDuplicateTemplateFieldIndex(fields: NameChangePopulationFilledIntakeAnswerTemplateField[]) {
  const map = new Map<string, NameChangePopulationFilledIntakeAnswerTemplateField>();
  const duplicateFields = new Set<NameChangePopulationFilledIntakeAnswerTemplateField>();
  const duplicateIssues: NameChangePopulationIntakeAnswerResponseIssue[] = [];

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

function getTemplateFieldIssue(
  field: NameChangePopulationFilledIntakeAnswerTemplateField,
  answerValue: string,
): NameChangePopulationIntakeAnswerResponseIssue | null {
  if (!field.answerKey || !field.gapKey || !field.fieldKey) {
    return {
      code: 'template_field_missing_identity',
      fieldKey: field.fieldKey,
      answerKey: field.answerKey,
      message: 'A filled answer template field is missing answerKey, gapKey, or fieldKey. Regenerate the blank answer template before building an answer response.',
    };
  }
  if (!isValidAnswerKind(field.kind)) {
    return {
      code: 'invalid_answer_kind',
      fieldKey: field.fieldKey,
      answerKey: field.answerKey,
      message: `${field.fieldKey} has an unsupported answer kind. Regenerate the blank answer template before building an answer response.`,
    };
  }
  if (field.kind !== 'pdf_mapping_task' && answerValue && !hasAnswerContext(field)) {
    return {
      code: 'answer_context_missing',
      fieldKey: field.fieldKey,
      answerKey: field.answerKey,
      message: `${field.fieldKey} is missing form, revision, or source context. Regenerate the blank answer template before building an answer response.`,
    };
  }
  return null;
}

function getFieldIssue(
  field: NameChangePopulationFilledIntakeAnswerTemplateField,
  answerValue: string,
): NameChangePopulationIntakeAnswerResponseIssue | null {
  const expectedRetentionPolicy = getExpectedRetentionPolicy(field.kind);
  if (field.kind === 'pdf_mapping_task') {
    if (!answerValue) return null;
    return {
      code: 'pdf_mapping_answer_not_supported',
      fieldKey: field.fieldKey,
      answerKey: field.answerKey,
      message: `${field.fieldKey} is a reviewer PDF mapping task, not a user intake answer. Complete visual PDF mapping before building an answer response.`,
    };
  }
  if (!answerValue) return null;
  if (field.retentionPolicy !== expectedRetentionPolicy) {
    return {
      code: field.kind === 'secure_session_answer' ? 'secure_retention_policy_invalid' : 'answer_retention_mismatch',
      fieldKey: field.fieldKey,
      answerKey: field.answerKey,
      message: `${field.fieldKey} requires ${expectedRetentionPolicy} retention for ${field.kind}. Regenerate the blank answer template before building an answer response.`,
    };
  }
  if ((field.kind === 'consent_answer' || field.kind === 'secure_session_answer') && field.consentToUseInDraft !== true) {
    return {
      code: 'draft_use_consent_missing',
      fieldKey: field.fieldKey,
      answerKey: field.answerKey,
      message: `${field.fieldKey} needs consentToUseInDraft: true before DayOf can place it into a review-only draft.`,
    };
  }
  return null;
}

function buildAnswer(field: NameChangePopulationFilledIntakeAnswerTemplateField, answerValue: string): NameChangePopulationIntakeAnswer {
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

function getReadinessState(
  field: NameChangePopulationFilledIntakeAnswerTemplateField,
  answerValue: string,
  issueCodes: string[],
): NameChangePopulationIntakeAnswerReadinessState {
  if (issueCodes.length > 0) return 'blocked';
  if (field.kind === 'pdf_mapping_task') return 'reviewer_mapping_task';
  if (answerValue) return 'ready_to_convert';
  if (field.kind === 'secure_session_answer') return 'needs_secure_entry';
  if (field.kind === 'consent_answer') return 'needs_consent';
  return 'needs_answer';
}

function getReadinessNextAction(
  field: NameChangePopulationFilledIntakeAnswerTemplateField,
  state: NameChangePopulationIntakeAnswerReadinessState,
) {
  if (state === 'blocked') return `${field.label ?? field.fieldKey} needs correction before DayOf can build a review-only answer response.`;
  if (state === 'ready_to_convert') return `${field.label ?? field.fieldKey} is ready to place into review-only drafts.`;
  if (state === 'needs_secure_entry') return `Collect ${field.label ?? field.fieldKey} in a secure session only.`;
  if (state === 'needs_consent') return `Collect ${field.label ?? field.fieldKey} with explicit consent before using it in a draft.`;
  if (state === 'reviewer_mapping_task') return `${field.label ?? field.fieldKey} stays with reviewer PDF mapping, not user intake.`;
  return `Ask the user for ${field.label ?? field.fieldKey}.`;
}

function buildFieldReadiness(
  field: NameChangePopulationFilledIntakeAnswerTemplateField,
  answerValue: string,
  issueCodes: string[],
): NameChangePopulationIntakeAnswerFieldReadiness {
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

function buildInvalidTemplateFieldIssue(index: number): NameChangePopulationIntakeAnswerResponseIssue {
  return {
    code: 'template_field_invalid_entry',
    fieldKey: `template.fields[${index}]`,
    message: `Template field ${index + 1} is not a field object. Regenerate the filled answer template before building an answer response.`,
  };
}

function buildInvalidTemplateFieldReadiness(index: number): NameChangePopulationIntakeAnswerFieldReadiness {
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

export function buildNameChangePopulationIntakeAnswerResponse(
  template: {
    fields: NameChangePopulationFilledIntakeAnswerTemplateField[];
    source?: string;
  },
): NameChangePopulationIntakeAnswerResponseBuildPlan {
  const issues: NameChangePopulationIntakeAnswerResponseIssue[] = [];
  const answers: NameChangePopulationIntakeAnswer[] = [];
  const fieldReadiness: NameChangePopulationIntakeAnswerFieldReadiness[] = [];
  let malformedFields = 0;
  let contextMissingFields = 0;
  let skippedBlankFields = 0;
  let skippedMappingTasks = 0;
  const validFields: NameChangePopulationFilledIntakeAnswerTemplateField[] = [];

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
    const fieldIssueCodes: string[] = [];
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
    reviewOnly: true as const,
    containsUserValues: true as const,
    source: template.source ?? 'DayOf name-change intake answer response',
    answers: safeAnswers,
  };
  const report = {
    reviewOnly: true as const,
    containsUserValues: false as const,
    status: issues.length === 0 ? 'passed' as const : 'failed' as const,
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

  return {
    answerPayload,
    answerPayloadJson: JSON.stringify(answerPayload, null, 2),
    report,
  };
}
