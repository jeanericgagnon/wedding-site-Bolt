import type { NameChangeFormFieldPayload, NameChangeFormPayloadSnapshot } from './types';

export type NameChangeOfficialFormVerificationStatus = 'verified_current' | 'needs_review';
export type NameChangeFormCompanionFieldStatus = 'ready' | 'review' | 'missing' | 'optional';

export interface NameChangeOfficialFormSource {
  formCode: string;
  formLabel: string;
  officialUrl: string;
  officialFormsIndexUrl?: string;
  officialRevisionLabel: string;
  lastCheckedAt: string;
  verificationStatus: NameChangeOfficialFormVerificationStatus;
  submissionNote: string;
}

export interface NameChangeFormCompanionFieldGuidance {
  section: string;
  officialFieldLabel: string;
  userInstruction: string;
  reviewHint?: string;
}

export interface NameChangeFormCompanionField {
  fieldKey: string;
  label: string;
  section: string;
  officialFieldLabel: string;
  userInstruction: string;
  required: boolean;
  value: string | null;
  formattedValue: string | null;
  copyValue: string;
  valueFormatNote: string | null;
  source: NameChangeFormFieldPayload['source'];
  sourceLabel: string;
  confidence: NameChangeFormFieldPayload['confidence'];
  status: NameChangeFormCompanionFieldStatus;
  statusLabel: string;
  reviewNote: string;
}

export interface NameChangeFormCompanionSection {
  key: string;
  label: string;
  fields: NameChangeFormCompanionField[];
}

export interface NameChangeFormCompanion {
  formCode: string;
  formLabel: string;
  source: NameChangeOfficialFormSource;
  sections: NameChangeFormCompanionSection[];
  fields: NameChangeFormCompanionField[];
  reviewWarnings: string[];
  summary: {
    ready: number;
    review: number;
    missing: number;
    optional: number;
    total: number;
  };
}

function getSourceLabel(source: NameChangeFormFieldPayload['source']) {
  if (source === 'extracted_field') return 'Reviewed document detail';
  if (source === 'derived') return 'Calculated from saved details';
  return 'Saved intake';
}

function getFieldStatus(field: NameChangeFormFieldPayload): NameChangeFormCompanionFieldStatus {
  if (!field.value) return field.required ? 'missing' : 'optional';
  if (field.confidence === 'low') return 'review';
  return 'ready';
}

function getFieldStatusLabel(status: NameChangeFormCompanionFieldStatus) {
  if (status === 'ready') return 'Ready to copy';
  if (status === 'review') return 'Review before using';
  if (status === 'missing') return 'Missing';
  return 'Optional';
}

function getReviewNote(
  field: NameChangeFormFieldPayload,
  status: NameChangeFormCompanionFieldStatus,
  guidance: NameChangeFormCompanionFieldGuidance,
) {
  if (status === 'missing') return `${guidance.officialFieldLabel} still needs a value before this draft is complete.`;
  if (status === 'review') return guidance.reviewHint ?? `${guidance.officialFieldLabel} has a value, but its source should be checked before the official form is signed.`;
  if (status === 'optional') return `${guidance.officialFieldLabel} can stay blank unless the official form or agency instructions ask for it.`;
  return guidance.reviewHint ?? `${guidance.officialFieldLabel} is ready to copy into the official form after user review.`;
}

function toSectionKey(section: string) {
  return section.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function isDateField(fieldKey: string) {
  return fieldKey.toLowerCase().includes('date');
}

function formatDateForOfficialForm(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if (!match) return null;

  return `${match[2]}/${match[3]}/${match[1]}`;
}

function formatFieldValueForOfficialForm(field: NameChangeFormFieldPayload) {
  if (!field.value) {
    return {
      formattedValue: null,
      valueFormatNote: null,
    };
  }

  if (isDateField(field.fieldKey)) {
    const formattedDate = formatDateForOfficialForm(field.value);
    if (formattedDate) {
      return {
        formattedValue: formattedDate,
        valueFormatNote: 'Formatted for official forms as MM/DD/YYYY.',
      };
    }
  }

  return {
    formattedValue: field.value,
    valueFormatNote: null,
  };
}

export function buildNameChangeFormCompanion(
  payload: NameChangeFormPayloadSnapshot,
  source: NameChangeOfficialFormSource,
  fieldGuidance: Record<string, NameChangeFormCompanionFieldGuidance>,
): NameChangeFormCompanion {
  const fields = payload.fields.map((field) => {
    const guidance = fieldGuidance[field.fieldKey] ?? {
      section: 'Other fields',
      officialFieldLabel: field.label,
      userInstruction: `Use this value for ${field.label}.`,
    };
    const status = getFieldStatus(field);
    const { formattedValue, valueFormatNote } = formatFieldValueForOfficialForm(field);

    return {
      fieldKey: field.fieldKey,
      label: field.label,
      section: guidance.section,
      officialFieldLabel: guidance.officialFieldLabel,
      userInstruction: guidance.userInstruction,
      required: field.required,
      value: field.value,
      formattedValue,
      copyValue: formattedValue ?? '',
      valueFormatNote,
      source: field.source,
      sourceLabel: getSourceLabel(field.source),
      confidence: field.confidence,
      status,
      statusLabel: getFieldStatusLabel(status),
      reviewNote: getReviewNote(field, status, guidance),
    };
  });

  const sectionsByKey = new Map<string, NameChangeFormCompanionSection>();
  fields.forEach((field) => {
    const key = toSectionKey(field.section);
    const current = sectionsByKey.get(key) ?? { key, label: field.section, fields: [] };
    current.fields.push(field);
    sectionsByKey.set(key, current);
  });

  const missingFields = fields.filter((field) => field.status === 'missing');
  const reviewFields = fields.filter((field) => field.status === 'review');
  const reviewWarnings = [
    source.verificationStatus === 'needs_review'
      ? `${source.formCode} source/version needs official review before generating production PDFs.`
      : null,
    missingFields.length > 0
      ? missingFields.length === 1
        ? '1 required field still needs a value.'
        : `${missingFields.length} required fields still need values.`
      : null,
    reviewFields.length > 0
      ? `${reviewFields.length} field${reviewFields.length === 1 ? '' : 's'} should be checked before use.`
      : null,
    source.submissionNote,
  ].filter((value): value is string => Boolean(value));

  return {
    formCode: payload.formCode,
    formLabel: source.formLabel,
    source,
    fields,
    sections: Array.from(sectionsByKey.values()),
    reviewWarnings,
    summary: {
      ready: fields.filter((field) => field.status === 'ready').length,
      review: reviewFields.length,
      missing: missingFields.length,
      optional: fields.filter((field) => field.status === 'optional').length,
      total: fields.length,
    },
  };
}
