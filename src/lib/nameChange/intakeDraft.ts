import { canonicalizeNameChangeDocumentKind } from './documentKinds';
import type { NameChangeDocumentInput, NameChangeExtractedFieldInput } from './types';

function humanizeDraftToken(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function normalizeDraftText(value: string | null | undefined) {
  return (value ?? '').trim().replace(/\s+/g, ' ');
}

export function buildDraftNameChangeDocumentId(kind: NameChangeDocumentInput['document_kind']) {
  return `draft-${canonicalizeNameChangeDocumentKind(kind)}`;
}

export function normalizeDraftNameChangeDocumentId(documentId: string | null | undefined) {
  const normalizedDocumentId = documentId?.trim() || null;
  if (!normalizedDocumentId?.startsWith('draft-')) return normalizedDocumentId;
  return buildDraftNameChangeDocumentId(normalizedDocumentId.slice('draft-'.length) as NameChangeDocumentInput['document_kind']);
}

export function createDraftNameChangeDocument(
  kind: NameChangeDocumentInput['document_kind'],
  label: string,
): NameChangeDocumentInput {
  const canonicalKind = canonicalizeNameChangeDocumentKind(kind);
  const normalizedLabel = normalizeDraftText(label) || humanizeDraftToken(canonicalKind);

  return {
    id: buildDraftNameChangeDocumentId(canonicalKind),
    document_kind: canonicalKind,
    display_name: normalizedLabel,
    storage_mode: 'metadata_only',
    intake_status: 'uploaded',
    file_name_masked: `${canonicalKind.replace(/_/g, '-')}-•••.pdf`,
    issuing_authority: null,
    issued_on: null,
    expires_on: null,
    extraction_confidence: 0.92,
    extracted_snapshot: null,
  };
}

export function upsertDraftNameChangeExtractedField(
  extractedFields: NameChangeExtractedFieldInput[],
  documentId: string | null | undefined,
  fieldKey: NameChangeExtractedFieldInput['field_key'],
  fieldLabel: string,
  nextValue: string,
): NameChangeExtractedFieldInput[] {
  const normalizedDocumentId = normalizeDraftNameChangeDocumentId(documentId);
  const normalizedValue = normalizeDraftText(nextValue);
  const normalizedLabel = normalizeDraftText(fieldLabel) || humanizeDraftToken(fieldKey);
  const rest = extractedFields.filter((field) => !(
    normalizeDraftNameChangeDocumentId(field.document_id) === normalizedDocumentId
    && field.field_key === fieldKey
  ));
  if (!normalizedValue) return rest;

  return [
    ...rest,
    {
      document_id: normalizedDocumentId,
      field_key: fieldKey,
      field_label: normalizedLabel,
      field_value_masked: normalizedValue,
      source_type: 'manual',
      is_verified: true,
    },
  ];
}
