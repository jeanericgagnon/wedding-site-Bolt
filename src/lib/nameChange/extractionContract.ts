import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeDriversLicenseExtraction,
  NameChangeExtractedFieldInput,
  NameChangeExtractionContractSnapshot,
  NameChangeExtractionFieldKey,
  NameChangeMarriageCertificateExtraction,
  NameChangePassportExtraction,
  NameChangeCourtOrderExtraction,
} from './types';

function normalizeValue(value: string | null | undefined) {
  const normalized = (value ?? '').trim();
  return normalized || null;
}

function extractField(
  extractedFields: NameChangeExtractedFieldInput[],
  fieldKey: NameChangeExtractionFieldKey,
): string | null {
  const field = extractedFields.find((item) => item.field_key === fieldKey);
  return normalizeValue(field?.field_value_masked);
}

function buildMarriageCertificateExtraction(extractedFields: NameChangeExtractedFieldInput[]): NameChangeMarriageCertificateExtraction {
  return {
    firstName: extractField(extractedFields, 'first_name'),
    lastName: extractField(extractedFields, 'last_name'),
    spouseLastName: extractField(extractedFields, 'spouse_last_name'),
    county: extractField(extractedFields, 'county'),
    issuanceDate: extractField(extractedFields, 'issuance_date'),
    certificateNumber: extractField(extractedFields, 'certificate_number'),
  };
}

function buildCourtOrderExtraction(extractedFields: NameChangeExtractedFieldInput[]): NameChangeCourtOrderExtraction {
  return {
    firstName: extractField(extractedFields, 'first_name'),
    lastName: extractField(extractedFields, 'last_name'),
    courtOrderDate: extractField(extractedFields, 'court_order_date'),
  };
}

function buildPassportExtraction(extractedFields: NameChangeExtractedFieldInput[]): NameChangePassportExtraction {
  return {
    firstName: extractField(extractedFields, 'first_name'),
    middleName: extractField(extractedFields, 'middle_name'),
    lastName: extractField(extractedFields, 'last_name'),
    issuanceDate: extractField(extractedFields, 'issuance_date'),
  };
}

function buildDriversLicenseExtraction(extractedFields: NameChangeExtractedFieldInput[]): NameChangeDriversLicenseExtraction {
  return {
    firstName: extractField(extractedFields, 'first_name'),
    middleName: extractField(extractedFields, 'middle_name'),
    lastName: extractField(extractedFields, 'last_name'),
    issuanceDate: extractField(extractedFields, 'issuance_date'),
  };
}

export function buildNameChangeExtractionContractSnapshot(
  _profile: NameChangeCaseInput,
  _documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeExtractionContractSnapshot {
  return {
    marriageCertificate: buildMarriageCertificateExtraction(extractedFields),
    courtOrder: buildCourtOrderExtraction(extractedFields),
    currentPassport: buildPassportExtraction(extractedFields),
    currentDriversLicense: buildDriversLicenseExtraction(extractedFields),
  };
}
