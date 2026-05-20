import type { NameChangePopulationIntakeAnswerKind, NameChangePopulationIntakeAnswerRetention } from './formPopulationIntakeAnswerTemplate';
import type { NameChangeFormPopulationFieldMapping, NameChangeFormPopulationPlan, NameChangeFormPopulationPlanItem, NameChangeFormPopulationPlanItemStatus, NameChangeFormPopulationValueStatus } from './formPopulationPlan';

export interface NameChangePopulationIntakeAnswer {
  answerKey?: string;
  gapKey?: string;
  fieldKey: string;
  kind: NameChangePopulationIntakeAnswerKind;
  answerContext?: {
    formCodes?: string[];
    officialRevisionLabels?: string[];
    sources?: NameChangeFormPopulationFieldMapping['source'][];
  };
  answerValue?: string | null;
  consentToUseInDraft?: boolean | null;
  consentToSave?: boolean | null;
  retentionPolicy?: NameChangePopulationIntakeAnswerRetention;
  answeredAt?: string | null;
}

export interface NameChangePopulationIntakeAnswerPayload {
  reviewOnly: true;
  containsUserValues: true;
  source?: string;
  answers: NameChangePopulationIntakeAnswer[];
}

export interface NameChangePopulationIntakeAnswerIssue {
  code: string;
  fieldKey?: string;
  answerKey?: string;
  message: string;
}

export interface NameChangePopulationIntakeAnswerApplyPlan {
  populationPlan: NameChangeFormPopulationPlan;
  populationPayloadJson: string;
  issues: NameChangePopulationIntakeAnswerIssue[];
  summary: NameChangeFormPopulationPlan['summary'] & {
    answers: number;
    matchedAnswers: number;
    appliedAnswers: number;
    unchangedAnswers: number;
    contextMissingAnswers: number;
    contextMismatchedAnswers: number;
    duplicateAnswers: number;
    kindMismatchedAnswers: number;
    malformedAnswers: number;
    retentionMismatchedAnswers: number;
    skippedMappingTasks: number;
    unmatchedAnswers: number;
    issues: number;
  };
}

function normalizeValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isAnswerRecord(value: unknown): value is NameChangePopulationIntakeAnswer {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
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

function answerLookupKeys(answer: NameChangePopulationIntakeAnswer) {
  return [answer.answerKey, answer.gapKey, answer.fieldKey].filter((key): key is string => Boolean(key));
}

function buildDuplicateAnswerIssue(answer: NameChangePopulationIntakeAnswer, duplicateKey: string): NameChangePopulationIntakeAnswerIssue {
  return {
    code: 'duplicate_answer',
    fieldKey: answer.fieldKey,
    answerKey: answer.answerKey,
    message: `${answer.fieldKey} appears more than once in the completed answer response through ${duplicateKey}. Keep one answer per template field before applying answers.`,
  };
}

function buildAnswerMap(answers: NameChangePopulationIntakeAnswer[]) {
  const map = new Map<string, NameChangePopulationIntakeAnswer>();
  const duplicateAnswers = new Set<NameChangePopulationIntakeAnswer>();
  const duplicateIssues: NameChangePopulationIntakeAnswerIssue[] = [];
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

function buildMalformedAnswerIssue(answer: unknown, index: number): NameChangePopulationIntakeAnswerIssue {
  const answerRecord = isAnswerRecord(answer) ? answer : null;
  return {
    code: 'malformed_answer',
    fieldKey: typeof answerRecord?.fieldKey === 'string' && answerRecord.fieldKey ? answerRecord.fieldKey : `answers[${index}]`,
    answerKey: typeof answerRecord?.answerKey === 'string' && answerRecord.answerKey ? answerRecord.answerKey : undefined,
    message: `Answer ${index + 1} is missing a usable field identity or answer kind. Regenerate the completed answer response from the current blank template before applying answers.`,
  };
}

function getValidAnswers(answers: unknown[]) {
  const validAnswers: NameChangePopulationIntakeAnswer[] = [];
  const malformedIssues: NameChangePopulationIntakeAnswerIssue[] = [];

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

function getFieldAnswer(answerMap: Map<string, NameChangePopulationIntakeAnswer>, field: NameChangeFormPopulationFieldMapping) {
  return answerMap.get(field.fieldKey)
    ?? answerMap.get(`answer:user_info:${field.fieldKey}`)
    ?? answerMap.get(`answer:consent:${field.fieldKey}`)
    ?? answerMap.get(`answer:secure_session:${field.fieldKey}`)
    ?? null;
}

function getUpdatedValueStatus(field: NameChangeFormPopulationFieldMapping): NameChangeFormPopulationValueStatus {
  return field.source === 'supplemental_intake' ? 'available' : 'ready';
}

function getUpdatedMappingStatus(
  item: NameChangeFormPopulationPlanItem,
  field: NameChangeFormPopulationFieldMapping,
): NameChangeFormPopulationFieldMapping['mappingStatus'] {
  if (field.adapterFieldName) return 'mapped';
  if (item.adapterKind === 'guided_online_entry') return 'guided_online_only';
  return 'needs_pdf_field_probe';
}

function getExpectedAnswerKind(field: NameChangeFormPopulationFieldMapping): NameChangePopulationIntakeAnswerKind {
  if (field.redactionPolicy === 'requires_secure_session') return 'secure_session_answer';
  if (field.redactionPolicy === 'requires_consent') return 'consent_answer';
  return 'standard_answer';
}

function getExpectedRetentionPolicy(kind: NameChangePopulationIntakeAnswerKind): NameChangePopulationIntakeAnswerRetention {
  if (kind === 'secure_session_answer') return 'ephemeral_only';
  if (kind === 'consent_answer') return 'save_or_use_only_with_consent';
  if (kind === 'pdf_mapping_task') return 'not_user_answer';
  return 'normal_planner';
}

function getAnswerIssue(
  answer: NameChangePopulationIntakeAnswer,
  item: NameChangeFormPopulationPlanItem,
  field: NameChangeFormPopulationFieldMapping,
): NameChangePopulationIntakeAnswerIssue | null {
  if (answer.kind === 'pdf_mapping_task') return null;
  const expectedKind = getExpectedAnswerKind(field);
  if (answer.kind !== expectedKind) {
    return {
      code: 'answer_kind_mismatch',
      fieldKey: field.fieldKey,
      answerKey: answer.answerKey,
      message: `${field.fieldKey} requires ${expectedKind} for this population plan, but the completed answer response supplied ${answer.kind}. Regenerate the blank answer template before applying answers.`,
    };
  }
  const expectedRetentionPolicy = getExpectedRetentionPolicy(answer.kind);
  if (answer.retentionPolicy && answer.retentionPolicy !== expectedRetentionPolicy) {
    return {
      code: answer.kind === 'secure_session_answer' ? 'secure_retention_policy_invalid' : 'answer_retention_mismatch',
      fieldKey: field.fieldKey,
      answerKey: answer.answerKey,
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
      answerKey: answer.answerKey,
      message: `${field.fieldKey} answer is missing form, revision, or source context. Regenerate the blank answer template from the current population plan before applying answers.`,
    };
  }
  const formCodes = context.formCodes ?? [];
  const officialRevisionLabels = context.officialRevisionLabels ?? [];
  const sources = context.sources ?? [];
  const formMismatch = !formCodes.includes(item.formCode);
  const revisionMismatch = !officialRevisionLabels.includes(item.officialRevisionLabel);
  const sourceMismatch = !sources.includes(field.source);
  if (formMismatch || revisionMismatch || sourceMismatch) {
    return {
      code: 'answer_context_mismatch',
      fieldKey: field.fieldKey,
      answerKey: answer.answerKey,
      message: `${field.fieldKey} answer context does not match ${item.formCode} ${item.officialRevisionLabel}. Regenerate the blank answer template from the current population plan before applying answers.`,
    };
  }
  if (!normalizeValue(answer.answerValue)) {
    return {
      code: 'answer_value_missing',
      fieldKey: field.fieldKey,
      answerKey: answer.answerKey,
      message: `${field.officialFieldLabel} needs a non-empty answer before it can update the population plan.`,
    };
  }
  if ((answer.kind === 'consent_answer' || answer.kind === 'secure_session_answer') && answer.consentToUseInDraft !== true) {
    return {
      code: 'draft_use_consent_missing',
      fieldKey: field.fieldKey,
      answerKey: answer.answerKey,
      message: `${field.officialFieldLabel} needs consentToUseInDraft: true before DayOf can place it into a review-only draft.`,
    };
  }
  return null;
}

function buildAppliedNote(field: NameChangeFormPopulationFieldMapping, answer: NameChangePopulationIntakeAnswer) {
  const parts = [
    field.note,
    `Intake answer applied from ${answer.kind}.`,
  ];
  if (answer.kind === 'consent_answer') parts.push('Draft-use consent recorded for this review-only draft.');
  if (answer.kind === 'secure_session_answer') parts.push('Secure-session value is marked ephemeral for draft generation.');
  return parts.filter(Boolean).join(' ');
}

function applyFieldAnswer(
  item: NameChangeFormPopulationPlanItem,
  field: NameChangeFormPopulationFieldMapping,
  answer: NameChangePopulationIntakeAnswer | null,
) {
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
    redactionPolicy: 'none' as const,
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

function buildUnmatchedAnswerIssue(answer: NameChangePopulationIntakeAnswer): NameChangePopulationIntakeAnswerIssue {
  return {
    code: 'unmatched_answer',
    fieldKey: answer.fieldKey,
    answerKey: answer.answerKey,
    message: `${answer.fieldKey} does not match any field in the current population plan. Regenerate the blank answer template, then apply answers from that current template.`,
  };
}

function getFieldBlocker(field: NameChangeFormPopulationFieldMapping) {
  if (field.redactionPolicy === 'requires_secure_session') return `${field.officialFieldLabel} requires a secure form session.`;
  if (field.redactionPolicy === 'requires_consent') return `${field.officialFieldLabel} requires consent before draft use.`;
  if (!field.hasValue) return `${field.officialFieldLabel} is missing.`;
  return null;
}

function getItemStatus(item: NameChangeFormPopulationPlanItem, blockers: string[], fields: NameChangeFormPopulationFieldMapping[]): NameChangeFormPopulationPlanItemStatus {
  if (blockers.some((blocker) => blocker.includes('secure form session'))) return 'needs_secure_session';
  if (blockers.length > 0) return 'needs_input';
  if (item.adapterKind === 'guided_online_entry') return 'guided_online';
  if (fields.some((field) => field.mappingStatus === 'needs_pdf_field_probe')) return 'needs_adapter_mapping';
  if (fields.some((field) => field.mappingStatus === 'blocked')) return 'needs_input';
  return 'ready_for_population';
}

function getStatusLabel(status: NameChangeFormPopulationPlanItemStatus) {
  if (status === 'needs_input') return 'Needs info';
  if (status === 'needs_secure_session') return 'Needs secure session';
  if (status === 'needs_adapter_mapping') return 'Needs PDF mapping';
  if (status === 'guided_online') return 'Guided online';
  return 'Ready for population';
}

function getNextAction(status: NameChangeFormPopulationPlanItemStatus, blockers: string[], fields: NameChangeFormPopulationFieldMapping[]) {
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

function getPrimaryAction(summary: NameChangeFormPopulationPlan['summary']) {
  if (summary.needsInput > 0) return 'Collect the missing user information first, then refresh the population plan.';
  if (summary.needsSecureSession > 0) return 'Collect secure-session-only values before generating review drafts.';
  if (summary.needsAdapterMapping > 0) return 'Probe official PDF field names for the PDF candidates before generating filled PDFs.';
  if (summary.guidedOnline > 0) return 'Use guided online copy support for agency flows that do not expose a production PDF path.';
  return 'Generate review-only draft outputs and require user review before submission.';
}

export function applyNameChangePopulationIntakeAnswers(
  populationPlan: NameChangeFormPopulationPlan,
  answerPayload: NameChangePopulationIntakeAnswerPayload,
): NameChangePopulationIntakeAnswerApplyPlan {
  const normalizedAnswers = getValidAnswers(answerPayload.answers);
  const answerIndex = buildAnswerMap(normalizedAnswers.validAnswers);
  const answerMap = answerIndex.map;
  const matchedAnswers = new Set<NameChangePopulationIntakeAnswer>();
  const issues: NameChangePopulationIntakeAnswerIssue[] = [
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

  const items = populationPlan.items.map((item) => {
    const fieldMappings = item.fieldMappings.map((field) => {
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
    const blockers = fieldMappings.map(getFieldBlocker).filter((blocker): blocker is string => Boolean(blocker));
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
  const refreshedPlan = {
    items,
    populationPayloadJson: JSON.stringify({ reviewOnly: true, items }, null, 2),
    primaryAction: getPrimaryAction(summary),
    summary,
  };

  return {
    populationPlan: refreshedPlan,
    populationPayloadJson: refreshedPlan.populationPayloadJson,
    issues,
    summary: {
      ...summary,
      answers: answerPayload.answers.length,
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
  };
}
