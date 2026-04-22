import { buildNameChangeCanonicalCase } from './canonical';
import { buildNameChangeDocumentIntakeSnapshot } from './documentContract';
import { buildNameChangeExtractionContractSnapshot, getVerifiedDocumentLinkedFieldValue } from './extractionContract';
import type {
  NameChangeAutofillFieldMapping,
  NameChangeAutofillPrepSnapshot,
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeDocumentKind,
  NameChangeExtractedFieldInput,
  NameChangeExtractionFieldKey,
} from './types';

interface ExtractionLookupResult {
  value: string | null;
  sourceDocumentKind?: NameChangeDocumentKind;
  sourceFieldKey?: NameChangeExtractionFieldKey;
}

function normalizeValue(value: string | null | undefined) {
  const normalized = (value ?? '').trim();
  return normalized || null;
}

function buildExtractionLookup(
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
) {
  return (fieldKey: NameChangeExtractionFieldKey, preferredDocumentKinds: NameChangeDocumentKind[] = []): ExtractionLookupResult => {
    for (const kind of preferredDocumentKinds) {
      const value = getVerifiedDocumentLinkedFieldValue(documents, extractedFields, kind, fieldKey);
      if (value) {
        return {
          value,
          sourceDocumentKind: kind,
          sourceFieldKey: fieldKey,
        };
      }
    }

    return {
      value: null,
      sourceFieldKey: fieldKey,
    };
  };
}

function makeField(
  targetField: string,
  label: string,
  canonicalValue: string | null,
  extracted: ExtractionLookupResult,
  metadataReady = true,
  hasCanonicalConflict = false,
): NameChangeAutofillFieldMapping {
  const extractedValue = normalizeValue(extracted.value);
  const finalValue = extractedValue ?? normalizeValue(canonicalValue);
  const source = extractedValue ? 'extracted_field' : 'canonical_case';
  const confidence = extractedValue
    ? (metadataReady && !hasCanonicalConflict ? 'medium' : 'low')
    : finalValue ? 'high' : 'low';

  return {
    targetField,
    label,
    value: {
      source,
      value: finalValue,
      confidence,
      sourceDocumentKind: extracted.sourceDocumentKind,
      sourceFieldKey: extracted.sourceFieldKey,
    },
  };
}

export function buildNameChangeAutofillPrepSnapshot(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeAutofillPrepSnapshot {
  const canonicalCase = buildNameChangeCanonicalCase(profile, documents, extractedFields);
  const intakeSnapshot = buildNameChangeDocumentIntakeSnapshot(profile, documents, extractedFields);
  const extraction = buildNameChangeExtractionContractSnapshot(profile, documents, extractedFields);
  const lookup = buildExtractionLookup(documents, extractedFields);
  const isDocumentMetadataReady = (kind: NameChangeDocumentKind | undefined) => {
    if (!kind) return true;
    const contract = intakeSnapshot.documents.find((document) => document.kind === kind);
    return !contract || contract.metadataMissing.length === 0;
  };

  const conflictingExtractionKeys = new Set(
    extraction.conflicts.map((conflict) => `${conflict.documentKind}:${conflict.fieldKey}`),
  );

  const directField = (
    targetField: string,
    label: string,
    canonicalValue: string | null,
    extractedValue: ExtractionLookupResult,
  ) => makeField(
    targetField,
    label,
    canonicalValue,
    extractedValue,
    isDocumentMetadataReady(extractedValue.sourceDocumentKind),
    extractedValue.sourceDocumentKind != null
      && extractedValue.sourceFieldKey != null
      && conflictingExtractionKeys.has(`${extractedValue.sourceDocumentKind}:${extractedValue.sourceFieldKey}`),
  );

  const targetFirstNameExtraction = canonicalCase.legalBasis === 'court_order'
    ? lookup('first_name', ['court_order'])
    : lookup('first_name', ['marriage_certificate', 'court_order']);
  const targetLastNameExtraction = canonicalCase.legalBasis === 'court_order'
    ? lookup('last_name', ['court_order'])
    : { value: extraction.marriageCertificate.spouseLastName, sourceDocumentKind: 'marriage_certificate' as const, sourceFieldKey: 'spouse_last_name' as const };

  const fields: NameChangeAutofillFieldMapping[] = [
    directField('applicant.current_first_name', 'Current first name', canonicalCase.currentName.first, lookup('first_name', ['current_drivers_license', 'current_passport', 'marriage_certificate', 'court_order'])),
    directField('applicant.current_middle_name', 'Current middle name', canonicalCase.currentName.middle, lookup('middle_name', ['current_drivers_license', 'current_passport'])),
    directField('applicant.current_last_name', 'Current last name', canonicalCase.currentName.last, lookup('last_name', ['current_drivers_license', 'current_passport', 'marriage_certificate', 'court_order'])),
    directField('applicant.target_first_name', 'Target first name', canonicalCase.targetName.first, targetFirstNameExtraction),
    directField('applicant.target_last_name', 'Target last name', canonicalCase.targetName.last, targetLastNameExtraction),
    directField('applicant.county', 'County', canonicalCase.countyResidence, { value: extraction.marriageCertificate.county, sourceDocumentKind: 'marriage_certificate', sourceFieldKey: 'county' }),
    directField('legal.marriage_date', 'Marriage date', canonicalCase.legalContext.marriageDate, { value: extraction.marriageCertificate.issuanceDate, sourceDocumentKind: 'marriage_certificate', sourceFieldKey: 'issuance_date' }),
    directField('legal.court_order_case_number', 'Court-order case number', null, lookup('case_number', ['court_order'])),
    directField('legal.court_order_date', 'Court order date', null, lookup('court_order_date', ['court_order'])),
    directField('identity.passport_issue_date', 'Passport issue date', null, { value: extraction.currentPassport.issuanceDate, sourceDocumentKind: 'current_passport', sourceFieldKey: 'issuance_date' }),
  ];

  return {
    canonicalCase,
    fields,
    summary: {
      ready: fields.filter((field) => Boolean(field.value.value)).length,
      missing: fields.filter((field) => !field.value.value).length,
      extractedBacked: fields.filter((field) => field.value.source === 'extracted_field').length,
    },
  };
}
