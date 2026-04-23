import { buildNameChangeCanonicalCase } from './canonical';
import { getNameChangeDocumentKindAliases } from './documentKinds';
import { normalizeDraftFieldKey, normalizeDraftFieldValue } from './intakeDraft';
import type {
  NameChangeCanonicalFieldConflict,
  NameChangeCaseInput,
  NameChangeCourtOrderExtraction,
  NameChangeDocumentInput,
  NameChangeDocumentKind,
  NameChangeDriversLicenseExtraction,
  NameChangeExtractedFieldInput,
  NameChangeExtractionContractSnapshot,
  NameChangeExtractionFieldKey,
  NameChangeMarriageCertificateExtraction,
  NameChangePassportExtraction,
} from './types';

function normalizeValue(fieldKey: NameChangeExtractionFieldKey, value: string | null | undefined) {
  const normalized = normalizeDraftFieldValue(fieldKey, value ?? '');
  return normalized || null;
}

function normalizeFieldKey(fieldKey: string) {
  return normalizeDraftFieldKey(fieldKey) as NameChangeExtractionFieldKey;
}

function getDocumentExtractionPriority(
  document: NameChangeDocumentInput,
  canonicalKind: NameChangeDocumentKind,
  extractedFields: NameChangeExtractedFieldInput[],
) {
  const verifiedLinkedFieldCount = document.id
    ? extractedFields.filter((field) => field.document_id === document.id && field.is_verified).length
    : 0;

  return (
    (verifiedLinkedFieldCount * 100)
    + (document.intake_status === 'reviewed' ? 10 : document.intake_status === 'uploaded' ? 5 : 0)
    + (document.document_kind === canonicalKind ? 1 : 0)
  );
}

function getDocumentByKind(
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
  kind: NameChangeDocumentKind,
) {
  const kinds = getNameChangeDocumentKindAliases(kind);
  return documents
    .filter((document) => kinds.includes(document.document_kind))
    .sort((left, right) => getDocumentExtractionPriority(right, kind, extractedFields) - getDocumentExtractionPriority(left, kind, extractedFields))[0];
}

function getLinkedFieldValue(
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
  kind: NameChangeDocumentKind,
  fieldKey: NameChangeExtractionFieldKey,
  requireVerified = false,
): string | null {
  const document = getDocumentByKind(documents, extractedFields, kind);
  if (!document?.id) return null;

  const field = extractedFields.find((item) => item.document_id === document.id
    && normalizeFieldKey(item.field_key) === fieldKey
    && (!requireVerified || item.is_verified));
  return normalizeValue(fieldKey, field?.field_value_masked);
}

function getManualFallbackField(
  extractedFields: NameChangeExtractedFieldInput[],
  fieldKey: NameChangeExtractionFieldKey,
): NameChangeExtractedFieldInput | null {
  return extractedFields.find((item) => !item.document_id && normalizeFieldKey(item.field_key) === fieldKey && item.source_type === 'manual') ?? null;
}

function getManualFallbackValue(
  extractedFields: NameChangeExtractedFieldInput[],
  fieldKey: NameChangeExtractionFieldKey,
  requireVerified = false,
): string | null {
  const field = getManualFallbackField(extractedFields, fieldKey);
  if (!field) return null;
  if (requireVerified && !field.is_verified) return null;
  if (requireVerified && field.source_type !== 'manual') return null;
  return normalizeValue(fieldKey, field.field_value_masked);
}

export function getDocumentLinkedFieldValue(
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
  kind: NameChangeDocumentKind,
  fieldKey: NameChangeExtractionFieldKey,
): string | null {
  return getLinkedFieldValue(documents, extractedFields, kind, fieldKey) ?? getManualFallbackValue(extractedFields, fieldKey);
}

export function getVerifiedDocumentLinkedFieldValue(
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
  kind: NameChangeDocumentKind,
  fieldKey: NameChangeExtractionFieldKey,
): string | null {
  return getLinkedFieldValue(documents, extractedFields, kind, fieldKey, true) ?? getManualFallbackValue(extractedFields, fieldKey, true);
}

export function hasAnyDocumentLinkedFieldValue(
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
  kind: NameChangeDocumentKind,
  fieldKey: NameChangeExtractionFieldKey,
): boolean {
  const document = getDocumentByKind(documents, extractedFields, kind);
  const linkedField = document?.id
    ? extractedFields.find((item) => item.document_id === document.id && normalizeFieldKey(item.field_key) === fieldKey)
    : null;

  if (normalizeValue(fieldKey, linkedField?.field_value_masked)) return true;

  const manualField = getManualFallbackField(extractedFields, fieldKey);
  return Boolean(manualField && manualField.source_type === 'manual' && normalizeValue(fieldKey, manualField.field_value_masked));
}

export function hasVerifiedDocumentLinkedFieldValue(
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
  kind: NameChangeDocumentKind,
  fieldKey: NameChangeExtractionFieldKey,
): boolean {
  const document = getDocumentByKind(documents, extractedFields, kind);
  const linkedField = document?.id
    ? extractedFields.find((item) => item.document_id === document.id && normalizeFieldKey(item.field_key) === fieldKey && item.is_verified)
    : null;

  if (normalizeValue(fieldKey, linkedField?.field_value_masked)) return true;

  const manualField = getManualFallbackField(extractedFields, fieldKey);
  return Boolean(manualField && manualField.source_type === 'manual' && manualField.is_verified && normalizeValue(fieldKey, manualField.field_value_masked));
}

export function getDocumentCapturedFieldKeys(
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
  kind: NameChangeDocumentKind,
): NameChangeExtractionFieldKey[] {
  const document = getDocumentByKind(documents, extractedFields, kind);
  if (!document) return [];

  const linkedKeys = document.id
    ? extractedFields
        .filter((field) => field.document_id === document.id && field.is_verified)
        .map((field) => normalizeFieldKey(field.field_key))
    : [];
  const manualFallbackKeys = extractedFields
    .filter((field) => !field.document_id && field.source_type === 'manual' && field.is_verified)
    .map((field) => normalizeFieldKey(field.field_key));

  return [...new Set([...linkedKeys, ...manualFallbackKeys])];
}

function buildMarriageCertificateExtraction(
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeMarriageCertificateExtraction {
  return {
    firstName: getDocumentLinkedFieldValue(documents, extractedFields, 'marriage_certificate', 'first_name'),
    lastName: getDocumentLinkedFieldValue(documents, extractedFields, 'marriage_certificate', 'last_name'),
    spouseLastName: getDocumentLinkedFieldValue(documents, extractedFields, 'marriage_certificate', 'spouse_last_name'),
    county: getDocumentLinkedFieldValue(documents, extractedFields, 'marriage_certificate', 'county'),
    issuanceDate: getDocumentLinkedFieldValue(documents, extractedFields, 'marriage_certificate', 'issuance_date'),
    certificateNumber: getDocumentLinkedFieldValue(documents, extractedFields, 'marriage_certificate', 'certificate_number'),
  };
}

function buildCourtOrderExtraction(
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeCourtOrderExtraction {
  return {
    firstName: getDocumentLinkedFieldValue(documents, extractedFields, 'court_order', 'first_name'),
    lastName: getDocumentLinkedFieldValue(documents, extractedFields, 'court_order', 'last_name'),
    caseNumber: getDocumentLinkedFieldValue(documents, extractedFields, 'court_order', 'case_number'),
    courtOrderDate: getDocumentLinkedFieldValue(documents, extractedFields, 'court_order', 'court_order_date'),
  };
}

function buildPassportExtraction(
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangePassportExtraction {
  return {
    firstName: getDocumentLinkedFieldValue(documents, extractedFields, 'current_passport', 'first_name'),
    middleName: getDocumentLinkedFieldValue(documents, extractedFields, 'current_passport', 'middle_name'),
    lastName: getDocumentLinkedFieldValue(documents, extractedFields, 'current_passport', 'last_name'),
    issuanceDate: getDocumentLinkedFieldValue(documents, extractedFields, 'current_passport', 'issuance_date'),
  };
}

function buildDriversLicenseExtraction(
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeDriversLicenseExtraction {
  return {
    firstName: getDocumentLinkedFieldValue(documents, extractedFields, 'current_drivers_license', 'first_name'),
    middleName: getDocumentLinkedFieldValue(documents, extractedFields, 'current_drivers_license', 'middle_name'),
    lastName: getDocumentLinkedFieldValue(documents, extractedFields, 'current_drivers_license', 'last_name'),
    issuanceDate: getDocumentLinkedFieldValue(documents, extractedFields, 'current_drivers_license', 'issuance_date'),
  };
}

function valuesConflict(
  fieldKey: NameChangeExtractionFieldKey,
  canonicalValue: string | null | undefined,
  extractedValue: string | null | undefined,
) {
  const canonical = normalizeValue(fieldKey, canonicalValue);
  const extracted = normalizeValue(fieldKey, extractedValue);
  return Boolean(canonical && extracted && canonical !== extracted);
}

function buildCanonicalFieldConflicts(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeCanonicalFieldConflict[] {
  const canonicalCase = buildNameChangeCanonicalCase(profile, documents, extractedFields);
  const candidates: Array<{
    key: string;
    label: string;
    documentKind: NameChangeDocumentKind;
    fieldKey: NameChangeExtractionFieldKey;
    canonicalValue: string | null;
    extractedValue: string | null;
  }> = [
    {
      key: 'current-first-name-passport',
      label: 'Current first name vs passport extraction',
      documentKind: 'current_passport',
      fieldKey: 'first_name',
      canonicalValue: canonicalCase.currentName.first,
      extractedValue: getVerifiedDocumentLinkedFieldValue(documents, extractedFields, 'current_passport', 'first_name'),
    },
    {
      key: 'current-last-name-passport',
      label: 'Current last name vs passport extraction',
      documentKind: 'current_passport',
      fieldKey: 'last_name',
      canonicalValue: canonicalCase.currentName.last,
      extractedValue: getVerifiedDocumentLinkedFieldValue(documents, extractedFields, 'current_passport', 'last_name'),
    },
    {
      key: 'current-first-name-license',
      label: 'Current first name vs driver license extraction',
      documentKind: 'current_drivers_license',
      fieldKey: 'first_name',
      canonicalValue: canonicalCase.currentName.first,
      extractedValue: getVerifiedDocumentLinkedFieldValue(documents, extractedFields, 'current_drivers_license', 'first_name'),
    },
    {
      key: 'current-last-name-license',
      label: 'Current last name vs driver license extraction',
      documentKind: 'current_drivers_license',
      fieldKey: 'last_name',
      canonicalValue: canonicalCase.currentName.last,
      extractedValue: getVerifiedDocumentLinkedFieldValue(documents, extractedFields, 'current_drivers_license', 'last_name'),
    },
    {
      key: 'target-last-name-marriage',
      label: 'Target last name vs marriage certificate spouse surname',
      documentKind: 'marriage_certificate',
      fieldKey: 'spouse_last_name',
      canonicalValue: canonicalCase.targetName.last,
      extractedValue: getVerifiedDocumentLinkedFieldValue(documents, extractedFields, 'marriage_certificate', 'spouse_last_name'),
    },
    {
      key: 'county-marriage',
      label: 'County residence vs marriage certificate county',
      documentKind: 'marriage_certificate',
      fieldKey: 'county',
      canonicalValue: canonicalCase.countyResidence,
      extractedValue: getVerifiedDocumentLinkedFieldValue(documents, extractedFields, 'marriage_certificate', 'county'),
    },
    {
      key: 'target-first-name-court-order',
      label: 'Target first name vs court-order extraction',
      documentKind: 'court_order',
      fieldKey: 'first_name',
      canonicalValue: canonicalCase.legalBasis === 'court_order' ? canonicalCase.targetName.first : null,
      extractedValue: canonicalCase.legalBasis === 'court_order'
        ? getVerifiedDocumentLinkedFieldValue(documents, extractedFields, 'court_order', 'first_name')
        : null,
    },
    {
      key: 'target-last-name-court-order',
      label: 'Target last name vs court-order extraction',
      documentKind: 'court_order',
      fieldKey: 'last_name',
      canonicalValue: canonicalCase.legalBasis === 'court_order' ? canonicalCase.targetName.last : null,
      extractedValue: canonicalCase.legalBasis === 'court_order'
        ? getVerifiedDocumentLinkedFieldValue(documents, extractedFields, 'court_order', 'last_name')
        : null,
    },
    {
      key: 'court-order-date',
      label: 'Marriage date vs court-order signed date',
      documentKind: 'court_order',
      fieldKey: 'court_order_date',
      canonicalValue: canonicalCase.legalBasis === 'court_order' ? null : canonicalCase.legalContext.marriageDate,
      extractedValue: canonicalCase.legalBasis === 'court_order'
        ? null
        : getVerifiedDocumentLinkedFieldValue(documents, extractedFields, 'court_order', 'court_order_date'),
    },
  ];

  return candidates
    .filter((candidate) => valuesConflict(candidate.fieldKey, candidate.canonicalValue, candidate.extractedValue))
    .map((candidate) => ({
      key: candidate.key,
      label: candidate.label,
      documentKind: candidate.documentKind,
      fieldKey: candidate.fieldKey,
      canonicalValue: normalizeValue(candidate.fieldKey, candidate.canonicalValue),
      extractedValue: normalizeValue(candidate.fieldKey, candidate.extractedValue) as string,
      reason: `${candidate.label} disagree. Structured case says ${normalizeValue(candidate.fieldKey, candidate.canonicalValue)}, but extracted document value says ${normalizeValue(candidate.fieldKey, candidate.extractedValue)}.`,
    }));
}

export function buildNameChangeExtractionContractSnapshot(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeExtractionContractSnapshot {
  const conflicts = buildCanonicalFieldConflicts(profile, documents, extractedFields);

  return {
    marriageCertificate: buildMarriageCertificateExtraction(documents, extractedFields),
    courtOrder: buildCourtOrderExtraction(documents, extractedFields),
    currentPassport: buildPassportExtraction(documents, extractedFields),
    currentDriversLicense: buildDriversLicenseExtraction(documents, extractedFields),
    conflicts,
    summary: {
      conflictCount: conflicts.length,
    },
  };
}
