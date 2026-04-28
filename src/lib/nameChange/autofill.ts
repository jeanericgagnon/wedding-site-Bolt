import { buildNameChangeCanonicalCase } from './canonical';
import { buildNameChangeDocumentIntakeSnapshot } from './documentContract';
import { buildNameChangeExtractionContractSnapshot, getVerifiedDocumentLinkedFieldValue } from './extractionContract';
import { buildDraftNameChangeExtractedFieldsFromSnapshot, normalizeDraftNameChangeDocumentId } from './intakeDraft';
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
  const documentKindsById = new Map<string, NameChangeDocumentKind>();
  documents.forEach((document) => {
    const rawDocumentId = document.id?.trim();
    if (!rawDocumentId) return;
    documentKindsById.set(rawDocumentId, document.document_kind);
    const normalizedDocumentId = normalizeDraftNameChangeDocumentId(rawDocumentId, document.document_kind);
    if (normalizedDocumentId) {
      documentKindsById.set(normalizedDocumentId, document.document_kind);
    }
  });

  return (fieldKey: NameChangeExtractionFieldKey, preferredDocumentKinds: NameChangeDocumentKind[] = []): ExtractionLookupResult => {
    if (preferredDocumentKinds.length === 0) {
      const linkedField = extractedFields.find((field) => {
        if (field.is_verified !== true || field.field_key !== fieldKey) {
          return false;
        }
        const rawDocumentId = field.document_id?.trim();
        if (!rawDocumentId) {
          return false;
        }
        const normalizedDocumentId = normalizeDraftNameChangeDocumentId(rawDocumentId, documentKindsById.get(rawDocumentId)) ?? rawDocumentId;
        return documentKindsById.has(rawDocumentId) || documentKindsById.has(normalizedDocumentId);
      });
      if (linkedField?.field_value_masked) {
        const rawDocumentId = linkedField.document_id?.trim() || '';
        const normalizedDocumentId = normalizeDraftNameChangeDocumentId(rawDocumentId, documentKindsById.get(rawDocumentId)) ?? rawDocumentId;
        return {
          value: linkedField.field_value_masked,
          sourceDocumentKind: documentKindsById.get(rawDocumentId) ?? documentKindsById.get(normalizedDocumentId),
          sourceFieldKey: fieldKey,
        };
      }
    }

    for (const kind of preferredDocumentKinds) {
      const preferredDocumentIds = new Set(
        documents.flatMap((document) => (
          document.document_kind === kind
            ? [document.id, normalizeDraftNameChangeDocumentId(document.id, document.document_kind)]
            : []
        )).filter((value): value is string => typeof value === 'string' && value.trim().length > 0),
      );
      const linkedManual = extractedFields.find((field) => {
        if (field.source_type !== 'manual' || field.is_verified !== true || field.field_key !== fieldKey) {
          return false;
        }
        const rawDocumentId = field.document_id?.trim();
        if (!rawDocumentId) {
          return false;
        }
        const normalizedDocumentId = normalizeDraftNameChangeDocumentId(rawDocumentId, kind) ?? rawDocumentId;
        return preferredDocumentIds.has(rawDocumentId) || preferredDocumentIds.has(normalizedDocumentId);
      });
      if (linkedManual?.field_value_masked) {
        return {
          value: linkedManual.field_value_masked,
          sourceDocumentKind: kind,
          sourceFieldKey: fieldKey,
        };
      }

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

function getAutofillNormalizedDocumentId(
  field: NameChangeExtractedFieldInput,
  documentKindsById: Map<string, NameChangeDocumentKind>,
) {
  const rawDocumentId = field.document_id?.trim() || '';
  return normalizeDraftNameChangeDocumentId(rawDocumentId, documentKindsById.get(rawDocumentId))
    ?? rawDocumentId;
}

function getAutofillFieldPriority(
  field: NameChangeExtractedFieldInput,
  normalizedDocumentId: string,
  documentStatusByNormalizedId: Map<string, NameChangeDocumentInput['intake_status']>,
) {
  if (field.source_type === 'manual') {
    return 4;
  }

  const intakeStatus = documentStatusByNormalizedId.get(normalizedDocumentId);
  if (intakeStatus === 'reviewed') {
    return 3;
  }
  if (intakeStatus === 'uploaded') {
    return 2;
  }

  return 1;
}

function buildAutofillExtractedFields(
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
) {
  const mergedFields = [
    ...extractedFields,
    ...documents.flatMap((document) => buildDraftNameChangeExtractedFieldsFromSnapshot(
      document.id ?? null,
      document.extracted_snapshot,
      document.document_kind,
    )),
  ];

  const documentKindsById = new Map<string, NameChangeDocumentKind>();
  const documentStatusByNormalizedId = new Map<string, NameChangeDocumentInput['intake_status']>();
  documents.forEach((document) => {
    const rawDocumentId = document.id?.trim();
    if (!rawDocumentId) return;
    documentKindsById.set(rawDocumentId, document.document_kind);
    const normalizedDocumentId = normalizeDraftNameChangeDocumentId(rawDocumentId, document.document_kind) ?? rawDocumentId;
    documentStatusByNormalizedId.set(normalizedDocumentId, document.intake_status);
  });

  return mergedFields
    .map((field, index) => ({
      field,
      index,
      priority: getAutofillFieldPriority(
        field,
        getAutofillNormalizedDocumentId(field, documentKindsById),
        documentStatusByNormalizedId,
      ),
    }))
    .sort((left, right) => right.priority - left.priority || left.index - right.index)
    .map(({ field }) => field);
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
  const autofillExtractedFields = buildAutofillExtractedFields(documents, extractedFields);
  const canonicalCase = buildNameChangeCanonicalCase(profile, documents, autofillExtractedFields);
  const intakeSnapshot = buildNameChangeDocumentIntakeSnapshot(profile, documents, autofillExtractedFields);
  const extraction = buildNameChangeExtractionContractSnapshot(profile, documents, autofillExtractedFields);
  const lookup = buildExtractionLookup(documents, autofillExtractedFields);
  const isDocumentMetadataReady = (kind: NameChangeDocumentKind | undefined) => {
    if (!kind) return true;
    const contract = intakeSnapshot.documents.find((document) => document.kind === kind);
    return !contract || (contract.intakeStatus === 'reviewed' && contract.metadataMissing.length === 0);
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
  const targetMiddleNameExtraction = canonicalCase.legalBasis === 'court_order'
    ? lookup('middle_name', ['court_order'])
    : lookup('middle_name');
  const targetLastNameExtraction = canonicalCase.legalBasis === 'court_order'
    ? lookup('last_name', ['court_order'])
    : lookup('spouse_last_name', ['marriage_certificate']);

  const fields: NameChangeAutofillFieldMapping[] = [
    directField('applicant.current_first_name', 'Current first name', canonicalCase.currentName.first, lookup('first_name', ['current_drivers_license', 'current_passport', 'marriage_certificate', 'court_order'])),
    directField('applicant.current_middle_name', 'Current middle name', canonicalCase.currentName.middle, lookup('middle_name', ['current_drivers_license', 'current_passport'])),
    directField('applicant.current_last_name', 'Current last name', canonicalCase.currentName.last, lookup('last_name', ['current_drivers_license', 'current_passport', 'marriage_certificate', 'court_order'])),
    directField('applicant.target_first_name', 'Target first name', canonicalCase.targetName.first, targetFirstNameExtraction),
    directField('applicant.target_middle_name', 'Target middle name', canonicalCase.targetName.middle, targetMiddleNameExtraction),
    directField('applicant.target_last_name', 'Target last name', canonicalCase.targetName.last, targetLastNameExtraction),
    directField('applicant.county', 'County', canonicalCase.countyResidence, lookup('county', ['marriage_certificate'])),
    directField('legal.marriage_date', 'Marriage date', canonicalCase.legalContext.marriageDate, lookup('issuance_date', ['marriage_certificate'])),
    directField('legal.marriage_certificate_number', 'Marriage certificate number', null, lookup('certificate_number', ['marriage_certificate'])),
    directField('legal.court_order_case_number', 'Court-order case number', null, lookup('case_number', ['court_order'])),
    directField('legal.court_order_date', 'Court order date', null, lookup('court_order_date', ['court_order'])),
    directField('identity.passport_issue_date', 'Passport issue date', null, lookup('issuance_date', ['current_passport'])),
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
