import { buildNameChangeCanonicalCase } from './canonical';
import { buildNameChangeExtractionContractSnapshot } from './extractionContract';
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
      const matchingDocument = documents.find((document) => document.document_kind === kind);
      if (!matchingDocument) continue;
      const matchingField = extractedFields.find((field) => field.field_key === fieldKey);
      if (matchingField) {
        return {
          value: normalizeValue(matchingField.field_value_masked),
          sourceDocumentKind: kind,
          sourceFieldKey: fieldKey,
        };
      }
    }

    const fallbackField = extractedFields.find((field) => field.field_key === fieldKey);
    if (!fallbackField) return { value: null };

    return {
      value: normalizeValue(fallbackField.field_value_masked),
      sourceFieldKey: fieldKey,
    };
  };
}

function makeField(
  targetField: string,
  label: string,
  canonicalValue: string | null,
  extracted: ExtractionLookupResult,
): NameChangeAutofillFieldMapping {
  const extractedValue = normalizeValue(extracted.value);
  const finalValue = extractedValue ?? normalizeValue(canonicalValue);
  const source = extractedValue ? 'extracted_field' : 'canonical_case';

  return {
    targetField,
    label,
    value: {
      source,
      value: finalValue,
      confidence: extractedValue ? 'medium' : finalValue ? 'high' : 'low',
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
  const extraction = buildNameChangeExtractionContractSnapshot(profile, documents, extractedFields);
  const lookup = buildExtractionLookup(documents, extractedFields);

  const fields: NameChangeAutofillFieldMapping[] = [
    makeField('applicant.current_first_name', 'Current first name', canonicalCase.currentName.first, lookup('first_name', ['current_drivers_license', 'current_passport', 'marriage_certificate', 'court_order'])),
    makeField('applicant.current_middle_name', 'Current middle name', canonicalCase.currentName.middle, lookup('middle_name', ['current_drivers_license', 'current_passport'])),
    makeField('applicant.current_last_name', 'Current last name', canonicalCase.currentName.last, lookup('last_name', ['current_drivers_license', 'current_passport', 'marriage_certificate', 'court_order'])),
    makeField('applicant.target_first_name', 'Target first name', canonicalCase.targetName.first, lookup('first_name', ['marriage_certificate', 'court_order'])),
    makeField('applicant.target_last_name', 'Target last name', canonicalCase.targetName.last, { value: extraction.marriageCertificate.spouseLastName, sourceDocumentKind: 'marriage_certificate', sourceFieldKey: 'spouse_last_name' }),
    makeField('applicant.county', 'County', canonicalCase.countyResidence, { value: extraction.marriageCertificate.county, sourceDocumentKind: 'marriage_certificate', sourceFieldKey: 'county' }),
    makeField('legal.marriage_date', 'Marriage date', canonicalCase.legalContext.marriageDate, { value: extraction.marriageCertificate.issuanceDate, sourceDocumentKind: 'marriage_certificate', sourceFieldKey: 'issuance_date' }),
    makeField('legal.court_order_date', 'Court order date', null, { value: extraction.courtOrder.courtOrderDate, sourceDocumentKind: 'court_order', sourceFieldKey: 'court_order_date' }),
    makeField('identity.passport_issue_date', 'Passport issue date', null, { value: extraction.currentPassport.issuanceDate, sourceDocumentKind: 'current_passport', sourceFieldKey: 'issuance_date' }),
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
