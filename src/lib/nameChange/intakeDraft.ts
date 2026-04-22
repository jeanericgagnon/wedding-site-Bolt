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

function normalizeDraftDocumentKind(value: string) {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[-\s]+/g, '_') as NameChangeDocumentInput['document_kind'];
}

function normalizeDraftFieldKey(value: string) {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[-\s]+/g, '_') as NameChangeExtractedFieldInput['field_key'];
}

export function buildDraftNameChangeDocumentId(kind: NameChangeDocumentInput['document_kind']) {
  return `draft-${canonicalizeNameChangeDocumentKind(normalizeDraftDocumentKind(kind))}`;
}

export function normalizeDraftNameChangeDocumentId(documentId: string | null | undefined) {
  const normalizedDocumentId = documentId?.trim() || null;
  const normalizedDraftPrefix = normalizedDocumentId?.replace(/^draft\s*[-_]\s*/i, 'draft-') ?? null;
  if (!normalizedDraftPrefix?.startsWith('draft-')) return normalizedDocumentId;
  return buildDraftNameChangeDocumentId(normalizedDraftPrefix.slice('draft-'.length) as NameChangeDocumentInput['document_kind']);
}

export function createDraftNameChangeDocument(
  kind: NameChangeDocumentInput['document_kind'],
  label: string,
): NameChangeDocumentInput {
  const canonicalKind = canonicalizeNameChangeDocumentKind(normalizeDraftDocumentKind(kind));
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
  const normalizedFieldKey = normalizeDraftFieldKey(fieldKey);
  const normalizedValue = normalizeDraftText(nextValue);
  const normalizedLabel = normalizeDraftText(fieldLabel) || humanizeDraftToken(normalizedFieldKey);
  const rest = extractedFields.filter((field) => !(
    normalizeDraftNameChangeDocumentId(field.document_id) === normalizedDocumentId
    && normalizeDraftFieldKey(field.field_key) === normalizedFieldKey
  ));
  if (!normalizedValue) return rest;

  return [
    ...rest,
    {
      document_id: normalizedDocumentId,
      field_key: normalizedFieldKey,
      field_label: normalizedLabel,
      field_value_masked: normalizedValue,
      source_type: 'manual',
      is_verified: true,
    },
  ];
}
