import type { NameChangeDocumentInput, NameChangeExtractedFieldInput } from './types';

export function buildDraftNameChangeDocumentId(kind: NameChangeDocumentInput['document_kind']) {
  return `draft-${kind}`;
}

export function createDraftNameChangeDocument(
  kind: NameChangeDocumentInput['document_kind'],
  label: string,
): NameChangeDocumentInput {
  return {
    id: buildDraftNameChangeDocumentId(kind),
    document_kind: kind,
    display_name: label,
    storage_mode: 'metadata_only',
    intake_status: 'uploaded',
    file_name_masked: `${kind.replace(/_/g, '-')}-•••.pdf`,
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
  const normalizedDocumentId = documentId ?? null;
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
