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

function isRequestedDraftDocumentId(documentId: string | null | undefined) {
  return typeof documentId === 'string' && documentId.trim().toLowerCase().startsWith('draft');
}

function shouldBlockDraftDocumentFieldWrite(documentId: string | null | undefined, normalizedDocumentId: string | null) {
  const trimmedDocumentId = typeof documentId === 'string' ? documentId.trim() : '';
  const requestedBareDraftDocumentId = /^draft$/i.test(trimmedDocumentId);
  const requestedFallbackOtherDraftDocumentId = isRequestedDraftDocumentId(documentId) && !normalizedDocumentId;
  return isRequestedDraftDocumentId(documentId) && (requestedBareDraftDocumentId || requestedFallbackOtherDraftDocumentId);
}

function normalizeDraftDocumentKind(value: string) {
  const normalizedKind = value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/\bno\.?\b/g, 'number')
    .replace(/[+#,&()\\/.:\-'’\s]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  const kindAliases: Record<string, NameChangeDocumentInput['document_kind']> = {
    marriage_cert: 'marriage_certificate',
    marriage_license: 'marriage_certificate',
    marriage_license_copy: 'marriage_certificate',
    marriage_record: 'marriage_certificate',
    marriage_license_certificate: 'marriage_certificate',
    court_decree: 'court_order',
    name_change_decree: 'court_order',
    name_change_order: 'court_order',
    passport: 'current_passport',
    passport_book: 'current_passport',
    passport_card: 'current_passport',
    driver_license: 'current_drivers_license',
    driver_license_state_id: 'current_drivers_license',
    drivers_license: 'current_drivers_license',
    driver_s_license: 'current_drivers_license',
    driver_licence: 'current_drivers_license',
    drivers_licence: 'current_drivers_license',
    driver_s_licence: 'current_drivers_license',
    dmv_id: 'current_drivers_license',
    state_id: 'current_drivers_license',
    state_identification: 'current_drivers_license',
    state_identification_card: 'current_drivers_license',
    state_id_card: 'current_drivers_license',
    social_security: 'social_security_card',
    social_security_card: 'social_security_card',
    social_security_ssa_card: 'social_security_card',
    social_security_number_card: 'social_security_card',
    ssa_card: 'social_security_card',
    ss_card: 'social_security_card',
    soc_sec_card: 'social_security_card',
    social_security_card_copy: 'social_security_card',
    ssn_card: 'social_security_card',
    birth_cert: 'birth_certificate',
    birth_record: 'birth_certificate',
    vital_record: 'birth_certificate',
    utility_bill: 'proof_of_address',
    utility_statement: 'proof_of_address',
    bank_statement: 'proof_of_address',
    lease_agreement: 'proof_of_address',
    mortgage_statement: 'proof_of_address',
    residence_proof: 'proof_of_address',
    proof_of_residence: 'proof_of_address',
    proof_of_residency: 'proof_of_address',
    residency_proof: 'proof_of_address',
    residency_document: 'proof_of_address',
    address_verification: 'proof_of_address',
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
    .replace(/\bno\.?\b/g, 'number')
    .replace(/[+#,&()\\/.:\-'’\s]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  const fieldAliases: Record<string, NameChangeExtractedFieldInput['field_key']> = {
    cert: 'certificate_number',
    issue_date: 'issuance_date',
    issued_date: 'issuance_date',
    date_issued: 'issuance_date',
    issue_dt: 'issuance_date',
    cert_no: 'certificate_number',
    cert_num: 'certificate_number',
    certificate_no: 'certificate_number',
    record_number: 'certificate_number',
    cert_number: 'certificate_number',
    marriage_certificate_number: 'certificate_number',
    county_residence: 'county',
    county_of_residence: 'county',
    resident_county: 'county',
    county_lived_in: 'county',
    residence_county: 'county',
    county_residence_name: 'county',
    case: 'case_number',
    case_no: 'case_number',
    case_docket_number: 'case_number',
    case_num_no: 'case_number',
    case_num: 'case_number',
    docket_number: 'case_number',
    docket_no: 'case_number',
    signed_date: 'court_order_date',
    order_date: 'court_order_date',
    filed_date: 'court_order_date',
    date_signed: 'court_order_date',
    court_filed_date: 'court_order_date',
    spouse_surname: 'spouse_last_name',
    spouse_family_name: 'spouse_last_name',
    surname: 'last_name',
    family_name: 'last_name',
    given_name: 'first_name',
    first_given_name: 'first_name',
    middle_initial: 'middle_name',
    middle_given_name: 'middle_name',
  };

  const canonicalFieldKey = (fieldAliases[normalizedFieldKey] ?? normalizedFieldKey) as NameChangeExtractedFieldInput['field_key'];
  return SUPPORTED_DRAFT_FIELD_KEYS.has(canonicalFieldKey) ? canonicalFieldKey : '' as NameChangeExtractedFieldInput['field_key'];
}

function parseDraftMonthName(monthName: string) {
  const normalizedMonthName = monthName.toLowerCase().replace(/\.$/, '');
  const monthMap = {
    january: 1, jan: 1,
    february: 2, feb: 2,
    march: 3, mar: 3,
    april: 4, apr: 4,
    may: 5,
    june: 6, jun: 6,
    july: 7, jul: 7,
    august: 8, aug: 8,
    september: 9, sep: 9, sept: 9,
    october: 10, oct: 10,
    november: 11, nov: 11,
    december: 12, dec: 12,
  } as const;

  return monthMap[normalizedMonthName as keyof typeof monthMap] ?? null;
}

function normalizeDraftFieldValue(fieldKey: NameChangeExtractedFieldInput['field_key'], value: string) {
  const normalizedValue = normalizeDraftText(value);
  if (!normalizedValue) return '';

  if (fieldKey === 'first_name' || fieldKey === 'middle_name' || fieldKey === 'last_name' || fieldKey === 'spouse_last_name' || fieldKey === 'county') {
    return humanizeDraftToken(normalizedValue.toLowerCase());
  }

  if (fieldKey === 'case_number' || fieldKey === 'certificate_number') {
    return normalizedValue
      .toUpperCase()
      .replace(/\s*([\-/#])\s*/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  }

  if (fieldKey === 'court_order_date' || fieldKey === 'issuance_date') {
    const normalizeIsoParts = (year: string, month: string, day: string) => `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    const isoDateMatch = normalizedValue.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (isoDateMatch) {
      const [, month, day, year] = isoDateMatch;
      return normalizeIsoParts(year, month, day);
    }

    const leadingYearDateMatch = normalizedValue.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
    if (leadingYearDateMatch) {
      const [, year, month, day] = leadingYearDateMatch;
      return normalizeIsoParts(year, month, day);
    }

    const writtenDateMatch = normalizedValue.match(/^([A-Za-z]+\.?)[\s]+(\d{1,2})(?:,)?\s*(\d{4})$/);
    if (writtenDateMatch) {
      const [, monthName, day, year] = writtenDateMatch;
      const month = parseDraftMonthName(monthName);
      if (month) {
        return normalizeIsoParts(year, String(month), day);
      }
    }

    const dayFirstWrittenDateMatch = normalizedValue.match(/^(\d{1,2})\s+([A-Za-z]+\.?)[\s,]+(\d{4})$/);
    if (dayFirstWrittenDateMatch) {
      const [, day, monthName, year] = dayFirstWrittenDateMatch;
      const month = parseDraftMonthName(monthName);
      if (month) {
        return normalizeIsoParts(year, String(month), day);
      }
    }

    const hyphenatedWrittenDateMatch = normalizedValue.match(/^(\d{1,2})-([A-Za-z]+\.?)-(\d{4})$/);
    if (hyphenatedWrittenDateMatch) {
      const [, day, monthName, year] = hyphenatedWrittenDateMatch;
      const month = parseDraftMonthName(monthName);
      if (month) {
        return normalizeIsoParts(year, String(month), day);
      }
    }

    const compactDateMatch = normalizedValue.match(/^(19\d{2}|20\d{2})(\d{2})(\d{2})$/);
    if (compactDateMatch) {
      const [, year, month, day] = compactDateMatch;
      return normalizeIsoParts(year, month, day);
    }

    const compactUsDateMatch = normalizedValue.match(/^(\d{2})(\d{2})(\d{4})$/);
    if (compactUsDateMatch) {
      const [, month, day, year] = compactUsDateMatch;
      return normalizeIsoParts(year, month, day);
    }

    const dotSeparatedYearDateMatch = normalizedValue.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
    if (dotSeparatedYearDateMatch) {
      const [, year, month, day] = dotSeparatedYearDateMatch;
      return normalizeIsoParts(year, month, day);
    }
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
  return isRequestedDraftDocumentId(documentId)
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
