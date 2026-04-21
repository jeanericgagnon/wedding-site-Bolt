import type {
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

function normalizeValue(value: string | null | undefined) {
  const normalized = (value ?? '').trim();
  return normalized || null;
}

function getDocumentByKind(documents: NameChangeDocumentInput[], kind: NameChangeDocumentKind) {
  return documents.find((document) => document.document_kind === kind);
}

function getLinkedFieldValue(
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
  kind: NameChangeDocumentKind,
  fieldKey: NameChangeExtractionFieldKey,
): string | null {
  const document = getDocumentByKind(documents, kind);
  if (!document?.id) return null;

  const field = extractedFields.find((item) => item.document_id === document.id && item.field_key === fieldKey);
  return normalizeValue(field?.field_value_masked);
}

function getManualFallbackValue(
  extractedFields: NameChangeExtractedFieldInput[],
  fieldKey: NameChangeExtractionFieldKey,
): string | null {
  const field = extractedFields.find((item) => !item.document_id && item.field_key === fieldKey);
  return normalizeValue(field?.field_value_masked);
}

export function getDocumentLinkedFieldValue(
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
  kind: NameChangeDocumentKind,
  fieldKey: NameChangeExtractionFieldKey,
): string | null {
  return getLinkedFieldValue(documents, extractedFields, kind, fieldKey) ?? getManualFallbackValue(extractedFields, fieldKey);
}

export function getDocumentCapturedFieldKeys(
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
  kind: NameChangeDocumentKind,
): NameChangeExtractionFieldKey[] {
  const document = getDocumentByKind(documents, kind);
  if (!document) return [];

  const linkedKeys = document.id
    ? extractedFields
        .filter((field) => field.document_id === document.id)
        .map((field) => field.field_key)
    : [];
  const manualFallbackKeys = extractedFields
    .filter((field) => !field.document_id)
    .map((field) => field.field_key);

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

export function buildNameChangeExtractionContractSnapshot(
  _profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeExtractionContractSnapshot {
  return {
    marriageCertificate: buildMarriageCertificateExtraction(documents, extractedFields),
    courtOrder: buildCourtOrderExtraction(documents, extractedFields),
    currentPassport: buildPassportExtraction(documents, extractedFields),
    currentDriversLicense: buildDriversLicenseExtraction(documents, extractedFields),
  };
}
