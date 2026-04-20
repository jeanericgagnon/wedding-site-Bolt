import { buildNameChangeCanonicalCase } from './canonical';
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
  const lookup = buildExtractionLookup(documents, extractedFields);

  const fields: NameChangeAutofillFieldMapping[] = [
    makeField('applicant.current_first_name', 'Current first name', canonicalCase.currentName.first, lookup('first_name', ['current_drivers_license', 'current_passport', 'marriage_certificate', 'court_order'])),
    makeField('applicant.current_middle_name', 'Current middle name', canonicalCase.currentName.middle, lookup('middle_name', ['current_drivers_license', 'current_passport'])),
    makeField('applicant.current_last_name', 'Current last name', canonicalCase.currentName.last, lookup('last_name', ['current_drivers_license', 'current_passport', 'marriage_certificate', 'court_order'])),
    makeField('applicant.target_first_name', 'Target first name', canonicalCase.targetName.first, lookup('first_name', ['marriage_certificate', 'court_order'])),
    makeField('applicant.target_last_name', 'Target last name', canonicalCase.targetName.last, lookup('spouse_last_name', ['marriage_certificate'])),
    makeField('applicant.county', 'County', canonicalCase.countyResidence, lookup('county', ['marriage_certificate', 'proof_of_address'])),
    makeField('legal.marriage_date', 'Marriage date', canonicalCase.legalContext.marriageDate, lookup('issuance_date', ['marriage_certificate'])),
    makeField('legal.court_order_date', 'Court order date', null, lookup('court_order_date', ['court_order'])),
    makeField('identity.passport_issue_date', 'Passport issue date', null, lookup('issuance_date', ['current_passport'])),
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
