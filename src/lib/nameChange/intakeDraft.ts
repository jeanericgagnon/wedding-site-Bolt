import { canonicalizeNameChangeDocumentKind } from './documentKinds';
import type { NameChangeDocumentInput, NameChangeExtractedFieldInput } from './types';

const SUPPORTED_DRAFT_DOCUMENT_KINDS = new Set<NameChangeDocumentInput['document_kind']>([
  'marriage_certificate',
  'court_order',
  'court_order_name_change',
  'current_drivers_license',
  'current_passport',
  'social_security_card',
  'birth_certificate',
  'proof_of_address',
  'other',
]);

const SUPPORTED_DRAFT_FIELD_KEYS = new Set<NameChangeExtractedFieldInput['field_key']>([
  'first_name',
  'middle_name',
  'last_name',
  'spouse_last_name',
  'issuance_date',
  'certificate_number',
  'case_number',
  'county',
  'court_order_date',
]);

function humanizeDraftToken(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function normalizeDraftText(value: string | null | undefined) {
  return (value ?? '').trim().replace(/\s+/g, ' ');
}

function buildDraftMaskedFileName(kind: NameChangeDocumentInput['document_kind']) {
  return `${kind.replace(/_/g, '-')}-draft.pdf`;
}

export function isDraftNameChangeMaskedFileName(fileName: string | null | undefined) {
  return typeof fileName === 'string' && /-draft\.pdf$/i.test(fileName.trim());
}

function shouldBlockDraftDocumentFieldWrite(documentId: string | null | undefined, normalizedDocumentId: string | null) {
  const trimmedDocumentId = typeof documentId === 'string' ? documentId.trim() : '';
  const requestedDraftDocumentId = trimmedDocumentId.toLowerCase().startsWith('draft');
  const requestedBareDraftDocumentId = /^draft$/i.test(trimmedDocumentId);
  const requestedFallbackOtherDraftDocumentId = requestedDraftDocumentId && !normalizedDocumentId;
  return requestedDraftDocumentId && (requestedBareDraftDocumentId || requestedFallbackOtherDraftDocumentId);
}

function normalizeDraftDocumentKind(value: string) {
  const normalizedKind = value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[\\/.:\-\s]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  const kindAliases: Record<string, NameChangeDocumentInput['document_kind']> = {
    passport: 'current_passport',
    passport_book: 'current_passport',
    driver_license: 'current_drivers_license',
    drivers_license: 'current_drivers_license',
    driver_licence: 'current_drivers_license',
    drivers_licence: 'current_drivers_license',
    state_id: 'current_drivers_license',
    state_identification: 'current_drivers_license',
    state_identification_card: 'current_drivers_license',
    social_security: 'social_security_card',
    social_security_card: 'social_security_card',
    social_security_card_copy: 'social_security_card',
    ssn_card: 'social_security_card',
    birth_cert: 'birth_certificate',
    birth_record: 'birth_certificate',
    utility_bill: 'proof_of_address',
    residence_proof: 'proof_of_address',
    proof_address: 'proof_of_address',
  };

  const canonicalKind = (kindAliases[normalizedKind] ?? normalizedKind) as NameChangeDocumentInput['document_kind'];
  return SUPPORTED_DRAFT_DOCUMENT_KINDS.has(canonicalKind) ? canonicalKind : 'other';
}

function normalizeDraftFieldKey(value: string) {
  const normalizedFieldKey = value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[\\/.:\-\s]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  const fieldAliases: Record<string, NameChangeExtractedFieldInput['field_key']> = {
    issue_date: 'issuance_date',
    issued_date: 'issuance_date',
    date_issued: 'issuance_date',
    county_residence: 'county',
    county_of_residence: 'county',
    case_no: 'case_number',
    case_num: 'case_number',
    docket_number: 'case_number',
    spouse_surname: 'spouse_last_name',
    spouse_family_name: 'spouse_last_name',
    surname: 'last_name',
    family_name: 'last_name',
    given_name: 'first_name',
    middle_initial: 'middle_name',
  };

  const canonicalFieldKey = (fieldAliases[normalizedFieldKey] ?? normalizedFieldKey) as NameChangeExtractedFieldInput['field_key'];
  return SUPPORTED_DRAFT_FIELD_KEYS.has(canonicalFieldKey) ? canonicalFieldKey : '' as NameChangeExtractedFieldInput['field_key'];
}

function normalizeDraftFieldValue(fieldKey: NameChangeExtractedFieldInput['field_key'], value: string) {
  const normalizedValue = normalizeDraftText(value);
  if (!normalizedValue) return '';

  if (fieldKey === 'first_name' || fieldKey === 'middle_name' || fieldKey === 'last_name' || fieldKey === 'spouse_last_name' || fieldKey === 'county') {
    return humanizeDraftToken(normalizedValue.toLowerCase());
  }

  return normalizedValue;
}

function buildDraftFieldLabel(fieldKey: NameChangeExtractedFieldInput['field_key'], fieldLabel: string) {
  return normalizeDraftText(fieldLabel) || humanizeDraftToken(fieldKey);
}

function shouldCreateDraftNameChangeDocumentMaskedFile(kind: NameChangeDocumentInput['document_kind']) {
  return kind !== 'other';
}

function getDraftNameChangeDocumentIntakeStatus(kind: NameChangeDocumentInput['document_kind']) {
  return kind !== 'other' ? 'uploaded' : 'not_started';
}

function getDraftNameChangeExtractionConfidence(kind: NameChangeDocumentInput['document_kind']) {
  return null;
}

export function buildDraftNameChangeDocumentId(kind: NameChangeDocumentInput['document_kind']) {
  const normalizedKind = normalizeDraftDocumentKind(kind) || 'other';
  return normalizedKind === 'other'
    ? 'draft-other'
    : `draft-${canonicalizeNameChangeDocumentKind(normalizedKind as NameChangeDocumentInput['document_kind'])}`;
}

export function normalizeDraftNameChangeDocumentId(documentId: string | null | undefined) {
  const normalizedDocumentId = documentId?.trim() || null;
  if (!normalizedDocumentId) return null;
  if (/^draft$/i.test(normalizedDocumentId)) return null;
  if (/^draft[-_]?other$/i.test(normalizedDocumentId)) return null;
  const normalizedDraftPrefix = normalizedDocumentId?.replace(/^draft(?:\s*[\\/_-]?\s*)/i, 'draft-') ?? null;
  if (!normalizedDraftPrefix?.startsWith('draft-')) return normalizedDocumentId;
  const normalizedKind = normalizeDraftDocumentKind(normalizedDraftPrefix.slice('draft-'.length));
  if (!normalizedKind) return null;
  if (normalizedKind === 'other') return null;
  return buildDraftNameChangeDocumentId(normalizedKind as NameChangeDocumentInput['document_kind']);
}

export function isDraftNameChangeDocumentId(documentId: string | null | undefined) {
  return typeof documentId === 'string'
    && documentId.trim().toLowerCase().startsWith('draft')
    && normalizeDraftNameChangeDocumentId(documentId) != null;
}

export function isDraftNameChangePlaceholderDocument(document: Pick<NameChangeDocumentInput, 'id' | 'file_name_masked'> | null | undefined) {
  if (!document) return false;
  return isDraftNameChangeDocumentId(document.id) || isDraftNameChangeMaskedFileName(document.file_name_masked);
}

export function createDraftNameChangeDocument(
  kind: NameChangeDocumentInput['document_kind'],
  label: string,
): NameChangeDocumentInput {
  const normalizedKind = normalizeDraftDocumentKind(kind) || 'other';
  const canonicalKind = canonicalizeNameChangeDocumentKind(normalizedKind as NameChangeDocumentInput['document_kind']);
  const shouldUseMaskedFileName = shouldCreateDraftNameChangeDocumentMaskedFile(canonicalKind);
  const defaultExtractionConfidence = getDraftNameChangeExtractionConfidence(canonicalKind);
  const defaultIntakeStatus = getDraftNameChangeDocumentIntakeStatus(canonicalKind);
  const normalizedLabel = canonicalKind === 'other'
    ? humanizeDraftToken(canonicalKind)
    : normalizeDraftText(label) || humanizeDraftToken(canonicalKind);

  return {
    id: canonicalKind === 'other' ? null : buildDraftNameChangeDocumentId(canonicalKind),
    document_kind: canonicalKind,
    display_name: normalizedLabel,
    storage_mode: 'metadata_only',
    intake_status: defaultIntakeStatus,
    file_name_masked: shouldUseMaskedFileName ? buildDraftMaskedFileName(canonicalKind) : null,
    issuing_authority: null,
    issued_on: null,
    expires_on: null,
    extraction_confidence: defaultExtractionConfidence,
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
  if (shouldBlockDraftDocumentFieldWrite(documentId, normalizedDocumentId)) {
    return extractedFields;
  }
  const normalizedFieldKey = normalizeDraftFieldKey(fieldKey);
  if (!normalizedFieldKey) {
    return extractedFields;
  }
  const normalizedValue = normalizeDraftFieldValue(normalizedFieldKey, nextValue);
  const normalizedLabel = buildDraftFieldLabel(normalizedFieldKey, fieldLabel);
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
