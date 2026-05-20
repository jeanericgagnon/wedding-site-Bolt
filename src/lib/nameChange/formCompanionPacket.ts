import type { NameChangeFormCompanion, NameChangeFormCompanionField } from './formCompanion';

export type NameChangeFormCompanionPacketItemStatus = 'ready' | 'review' | 'missing';

export interface NameChangeFormCompanionPacketItem {
  formCode: string;
  formLabel: string;
  status: NameChangeFormCompanionPacketItemStatus;
  statusLabel: string;
  nextAction: string;
  readyFieldCount: number;
  reviewFieldCount: number;
  missingRequiredFieldCount: number;
  optionalFieldCount: number;
  totalFieldCount: number;
  missingRequiredFieldLabels: string[];
  reviewFieldLabels: string[];
  officialUrl: string;
  officialFormsIndexUrl?: string;
  officialRevisionLabel: string;
}

export interface NameChangeFormCompanionFillPayloadField {
  fieldKey: string;
  officialFieldLabel: string;
  rawValue: string | null;
  value: string | null;
  formattedValue: string | null;
  status: NameChangeFormCompanionField['status'];
  required: boolean;
  sourceLabel: string;
  confidence: NameChangeFormCompanionField['confidence'];
  userInstruction: string;
}

export interface NameChangeFormCompanionFillPayload {
  formCode: string;
  formLabel: string;
  officialUrl: string;
  officialRevisionLabel: string;
  lastCheckedAt: string;
  reviewOnly: true;
  adapterStatus: 'ready_for_adapter' | 'needs_user_input' | 'needs_source_review';
  blockers: string[];
  fields: NameChangeFormCompanionFillPayloadField[];
}

export interface NameChangeFormCompanionPacket {
  items: NameChangeFormCompanionPacketItem[];
  companions: NameChangeFormCompanion[];
  fillPayloads: NameChangeFormCompanionFillPayload[];
  fillPayloadJson: string;
  packetText: string;
  primaryStatus: NameChangeFormCompanionPacketItemStatus;
  primaryStatusLabel: string;
  primaryAction: string;
  summary: {
    totalForms: number;
    readyForms: number;
    reviewForms: number;
    missingForms: number;
    readyFields: number;
    reviewFields: number;
    missingRequiredFields: number;
    optionalFields: number;
    totalFields: number;
  };
}

function getPacketItemStatus(companion: NameChangeFormCompanion): NameChangeFormCompanionPacketItemStatus {
  if (companion.summary.missing > 0) return 'missing';
  if (companion.summary.review > 0 || companion.source.verificationStatus === 'needs_review') return 'review';
  return 'ready';
}

function getPacketItemStatusLabel(status: NameChangeFormCompanionPacketItemStatus) {
  if (status === 'ready') return 'Ready to fill';
  if (status === 'review') return 'Review first';
  return 'Missing required info';
}

function getPacketItemNextAction(
  status: NameChangeFormCompanionPacketItemStatus,
  missingFields: NameChangeFormCompanionField[],
  reviewFields: NameChangeFormCompanionField[],
) {
  if (status === 'missing') {
    const firstMissingField = missingFields[0]?.officialFieldLabel ?? 'required field';
    return `Add ${firstMissingField} before this form draft is complete.`;
  }

  if (status === 'review') {
    const firstReviewField = reviewFields[0]?.officialFieldLabel ?? 'flagged value';
    return `Check ${firstReviewField}, then use the ready fields on the official form.`;
  }

  return 'Open the official form, review the source, and copy the ready values into the matching fields.';
}

function formatCountLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatFieldLine(field: NameChangeFormCompanionField) {
  const value = field.copyValue || '[missing]';
  return [
    `- ${field.officialFieldLabel}: ${value}`,
    field.valueFormatNote ? `  Format: ${field.valueFormatNote}` : null,
    `  Status: ${field.statusLabel}`,
    `  Put it here: ${field.userInstruction}`,
    `  Source: ${field.sourceLabel}; confidence: ${field.confidence}`,
    `  Review note: ${field.reviewNote}`,
  ].filter((line): line is string => Boolean(line)).join('\n');
}

function formatCompanionPacketText(companions: NameChangeFormCompanion[], items: NameChangeFormCompanionPacketItem[]) {
  const lines = [
    'DayOf name-change form companion packet',
    '',
    'Important: this is a review draft, not an official submission. Review every value against the official form and agency instructions before signing or submitting.',
    '',
    'Packet summary',
    ...items.map((item) => `- ${item.formCode}: ${item.statusLabel}. ${item.nextAction}`),
    '',
  ];

  companions.forEach((companion) => {
    const item = items.find((entry) => entry.formCode === companion.formCode);
    lines.push(
      `${companion.formCode} - ${companion.formLabel}`,
      `Status: ${item?.statusLabel ?? 'Review first'}`,
      `Official form: ${companion.source.officialUrl}`,
      ...(companion.source.officialFormsIndexUrl ? [`Official forms page: ${companion.source.officialFormsIndexUrl}`] : []),
      `Version/source checked: ${companion.source.officialRevisionLabel}; ${companion.source.lastCheckedAt}`,
      '',
      'Before using',
      ...companion.reviewWarnings.map((warning) => `- ${warning}`),
      '',
    );

    companion.sections.forEach((section) => {
      lines.push(section.label);
      section.fields.forEach((field) => lines.push(formatFieldLine(field)));
      lines.push('');
    });
  });

  return lines.filter((line): line is string => line !== null).join('\n').trim();
}

function buildFillPayload(companion: NameChangeFormCompanion): NameChangeFormCompanionFillPayload {
  const missingRequiredFields = companion.fields.filter((field) => field.status === 'missing');
  const sourceNeedsReview = companion.source.verificationStatus === 'needs_review';
  const adapterStatus = missingRequiredFields.length > 0
    ? 'needs_user_input'
    : sourceNeedsReview
      ? 'needs_source_review'
      : 'ready_for_adapter';
  const blockers = [
    ...missingRequiredFields.map((field) => `${field.officialFieldLabel} is missing.`),
    sourceNeedsReview ? `${companion.formCode} official source/version needs review.` : null,
  ].filter((value): value is string => Boolean(value));

  return {
    formCode: companion.formCode,
    formLabel: companion.formLabel,
    officialUrl: companion.source.officialUrl,
    officialRevisionLabel: companion.source.officialRevisionLabel,
    lastCheckedAt: companion.source.lastCheckedAt,
    reviewOnly: true,
    adapterStatus,
    blockers,
    fields: companion.fields.map((field) => ({
      fieldKey: field.fieldKey,
      officialFieldLabel: field.officialFieldLabel,
      rawValue: field.value,
      value: field.copyValue || null,
      formattedValue: field.formattedValue,
      status: field.status,
      required: field.required,
      sourceLabel: field.sourceLabel,
      confidence: field.confidence,
      userInstruction: field.userInstruction,
    })),
  };
}

export function buildNameChangeFormCompanionPacket(
  companions: NameChangeFormCompanion[],
): NameChangeFormCompanionPacket {
  const items = companions.map((companion) => {
    const missingFields = companion.fields.filter((field) => field.status === 'missing');
    const reviewFields = companion.fields.filter((field) => field.status === 'review');
    const status = getPacketItemStatus(companion);

    return {
      formCode: companion.formCode,
      formLabel: companion.formLabel,
      status,
      statusLabel: getPacketItemStatusLabel(status),
      nextAction: getPacketItemNextAction(status, missingFields, reviewFields),
      readyFieldCount: companion.summary.ready,
      reviewFieldCount: companion.summary.review,
      missingRequiredFieldCount: missingFields.length,
      optionalFieldCount: companion.summary.optional,
      totalFieldCount: companion.summary.total,
      missingRequiredFieldLabels: missingFields.map((field) => field.officialFieldLabel),
      reviewFieldLabels: reviewFields.map((field) => field.officialFieldLabel),
      officialUrl: companion.source.officialUrl,
      officialFormsIndexUrl: companion.source.officialFormsIndexUrl,
      officialRevisionLabel: companion.source.officialRevisionLabel,
    };
  });

  const summary = {
    totalForms: companions.length,
    readyForms: items.filter((item) => item.status === 'ready').length,
    reviewForms: items.filter((item) => item.status === 'review').length,
    missingForms: items.filter((item) => item.status === 'missing').length,
    readyFields: companions.reduce((sum, companion) => sum + companion.summary.ready, 0),
    reviewFields: companions.reduce((sum, companion) => sum + companion.summary.review, 0),
    missingRequiredFields: companions.reduce((sum, companion) => sum + companion.summary.missing, 0),
    optionalFields: companions.reduce((sum, companion) => sum + companion.summary.optional, 0),
    totalFields: companions.reduce((sum, companion) => sum + companion.summary.total, 0),
  };
  const primaryStatus: NameChangeFormCompanionPacketItemStatus = summary.missingRequiredFields > 0
    ? 'missing'
    : summary.reviewFields > 0 || items.some((item) => item.status === 'review')
      ? 'review'
      : 'ready';
  const primaryStatusLabel = primaryStatus === 'missing'
    ? `${formatCountLabel(summary.missingRequiredFields, 'required field')} missing`
    : primaryStatus === 'review'
      ? `${formatCountLabel(summary.reviewFields, 'field')} to review`
      : 'Ready to fill official forms';
  const primaryAction = primaryStatus === 'missing'
    ? 'Finish the missing required fields before treating the packet as fill-ready.'
    : primaryStatus === 'review'
      ? 'Review flagged values and source versions, then copy the ready fields into the official forms.'
      : 'Open each official form and copy the ready values into the matching fields.';
  const fillPayloads = companions.map(buildFillPayload);

  return {
    items,
    companions,
    fillPayloads,
    fillPayloadJson: JSON.stringify({ reviewOnly: true, forms: fillPayloads }, null, 2),
    packetText: formatCompanionPacketText(companions, items),
    primaryStatus,
    primaryStatusLabel,
    primaryAction,
    summary,
  };
}
