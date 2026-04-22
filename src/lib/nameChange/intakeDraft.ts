import { canonicalizeNameChangeDocumentKind } from './documentKinds';
import type { NameChangeDocumentInput, NameChangeExtractedFieldInput } from './types';

export function buildDraftNameChangeDocumentId(kind: NameChangeDocumentInput['document_kind']) {
  return `draft-${canonicalizeNameChangeDocumentKind(kind)}`;
}

export function createDraftNameChangeDocument(
  kind: NameChangeDocumentInput['document_kind'],
  label: string,
): NameChangeDocumentInput {
  const canonicalKind = canonicalizeNameChangeDocumentKind(kind);

  return {
    id: buildDraftNameChangeDocumentId(canonicalKind),
    document_kind: canonicalKind,
    display_name: label,
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
  const normalizedDocumentId = documentId
    ? documentId.replace('draft-court_order_name_change', 'draft-court_order')
    : null;
  const rest = extractedFields.filter((field) => !(field.document_id === normalizedDocumentId && field.field_key === fieldKey));
  if (!nextValue.trim()) return rest;

  return [
    ...rest,
    {
      document_id: normalizedDocumentId,
      field_key: fieldKey,
      field_label: fieldLabel,
      field_value_masked: nextValue,
      source_type: 'manual',
      is_verified: true,
    },
  ];
}
