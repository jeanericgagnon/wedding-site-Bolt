import type { NameChangePopulationIntakeGap, NameChangePopulationIntakeGapPlan } from './formPopulationIntakeGaps';

export type NameChangePopulationIntakeAnswerKind = 'standard_answer' | 'consent_answer' | 'secure_session_answer' | 'pdf_mapping_task';
export type NameChangePopulationIntakeAnswerStatus = 'needs_answer' | 'needs_consent' | 'needs_secure_entry' | 'needs_pdf_mapping';
export type NameChangePopulationIntakeAnswerRetention = 'normal_planner' | 'save_or_use_only_with_consent' | 'ephemeral_only' | 'not_user_answer';

export interface NameChangePopulationIntakeAnswerTemplateField {
  answerKey: string;
  gapKey: string;
  fieldKey: string;
  kind: NameChangePopulationIntakeAnswerKind;
  status: NameChangePopulationIntakeAnswerStatus;
  statusLabel: string;
  label: string;
  prompt: string;
  helperText: string;
  formCodes: string[];
  formLabels: string[];
  officialRevisionLabels: string[];
  answerContext: {
    formCodes: string[];
    officialRevisionLabels: string[];
    sources: NameChangePopulationIntakeGap['sources'];
  };
  answerValue: null;
  consentToUseInDraft: null;
  consentToSave: null;
  retentionPolicy: NameChangePopulationIntakeAnswerRetention;
  secureSessionOnly: boolean;
  mappingRequired: boolean;
  currentValueKnown: boolean;
  nextAction: string;
}

export interface NameChangePopulationIntakeAnswerTemplate {
  reviewOnly: true;
  safePayload: true;
  containsUserValues: false;
  primaryAction: string;
  answerTemplateJson: string;
  fields: NameChangePopulationIntakeAnswerTemplateField[];
  summary: {
    totalFields: number;
    standardAnswers: number;
    consentAnswers: number;
    secureSessionAnswers: number;
    pdfMappingTasks: number;
    impactedForms: number;
  };
}

function uniq<T>(values: T[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getKind(gap: NameChangePopulationIntakeGap): NameChangePopulationIntakeAnswerKind {
  if (gap.category === 'secure_session') return 'secure_session_answer';
  if (gap.category === 'consent') return 'consent_answer';
  if (gap.category === 'pdf_mapping') return 'pdf_mapping_task';
  return 'standard_answer';
}

function getStatus(kind: NameChangePopulationIntakeAnswerKind): NameChangePopulationIntakeAnswerStatus {
  if (kind === 'secure_session_answer') return 'needs_secure_entry';
  if (kind === 'consent_answer') return 'needs_consent';
  if (kind === 'pdf_mapping_task') return 'needs_pdf_mapping';
  return 'needs_answer';
}

function getRetentionPolicy(kind: NameChangePopulationIntakeAnswerKind): NameChangePopulationIntakeAnswerRetention {
  if (kind === 'secure_session_answer') return 'ephemeral_only';
  if (kind === 'consent_answer') return 'save_or_use_only_with_consent';
  if (kind === 'pdf_mapping_task') return 'not_user_answer';
  return 'normal_planner';
}

function buildTemplateField(gap: NameChangePopulationIntakeGap): NameChangePopulationIntakeAnswerTemplateField {
  const kind = getKind(gap);

  return {
    answerKey: `answer:${gap.gapKey}`,
    gapKey: gap.gapKey,
    fieldKey: gap.fieldKey,
    kind,
    status: getStatus(kind),
    statusLabel: gap.statusLabel,
    label: gap.label,
    prompt: gap.prompt,
    helperText: gap.helperText,
    formCodes: gap.formCodes,
    formLabels: gap.formLabels,
    officialRevisionLabels: gap.officialRevisionLabels,
    answerContext: {
      formCodes: gap.formCodes,
      officialRevisionLabels: gap.officialRevisionLabels,
      sources: gap.sources,
    },
    answerValue: null,
    consentToUseInDraft: null,
    consentToSave: null,
    retentionPolicy: getRetentionPolicy(kind),
    secureSessionOnly: kind === 'secure_session_answer',
    mappingRequired: kind === 'pdf_mapping_task',
    currentValueKnown: gap.currentValueKnown,
    nextAction: gap.nextAction,
  };
}

function getPrimaryAction(summary: NameChangePopulationIntakeAnswerTemplate['summary']) {
  if (summary.standardAnswers > 0) return 'Render standard intake questions first and save answers once for reuse.';
  if (summary.secureSessionAnswers > 0) return 'Render secure-session questions as ephemeral answers before draft generation.';
  if (summary.consentAnswers > 0) return 'Render consent questions before using or saving sensitive values.';
  if (summary.pdfMappingTasks > 0) return 'Route PDF mapping tasks to a reviewer instead of asking the user.';
  return 'No intake answers are needed for the current population plan.';
}

export function buildNameChangePopulationIntakeAnswerTemplate(
  gapPlan: NameChangePopulationIntakeGapPlan,
): NameChangePopulationIntakeAnswerTemplate {
  const fields = gapPlan.gaps.map(buildTemplateField);
  const summary = {
    totalFields: fields.length,
    standardAnswers: fields.filter((field) => field.kind === 'standard_answer').length,
    consentAnswers: fields.filter((field) => field.kind === 'consent_answer').length,
    secureSessionAnswers: fields.filter((field) => field.kind === 'secure_session_answer').length,
    pdfMappingTasks: fields.filter((field) => field.kind === 'pdf_mapping_task').length,
    impactedForms: uniq(fields.flatMap((field) => field.formCodes)).length,
  };
  const payload: Omit<NameChangePopulationIntakeAnswerTemplate, 'answerTemplateJson'> = {
    reviewOnly: true,
    safePayload: true,
    containsUserValues: false,
    primaryAction: getPrimaryAction(summary),
    summary,
    fields,
  };

  return {
    ...payload,
    answerTemplateJson: JSON.stringify(payload, null, 2),
  };
}
