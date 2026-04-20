import { buildNameChangeCanonicalCase } from './canonical';
import type {
  NameChangeCaseInput,
  NameChangeDocumentContractDefinition,
  NameChangeDocumentContractStatus,
  NameChangeDocumentInput,
  NameChangeDocumentIntakeSnapshot,
  NameChangeDocumentKind,
  NameChangeExtractedFieldInput,
  NameChangeExtractionFieldKey,
} from './types';

export const NAME_CHANGE_DOCUMENT_CONTRACTS: NameChangeDocumentContractDefinition[] = [
  {
    kind: 'marriage_certificate',
    label: 'Certified marriage certificate',
    requiredFor: ['marriage'],
    preferredForAutofill: true,
    extractionFields: ['first_name', 'last_name', 'spouse_last_name', 'issuance_date', 'county', 'certificate_number'],
    acceptedSignals: ['certified copy', 'county clerk issuance', 'marriage certificate metadata'],
  },
  {
    kind: 'court_order',
    label: 'Court order',
    requiredFor: ['court_order'],
    preferredForAutofill: true,
    extractionFields: ['first_name', 'last_name', 'court_order_date'],
    acceptedSignals: ['signed court order', 'filed order metadata'],
  },
  {
    kind: 'current_drivers_license',
    label: 'Current driver license / state ID',
    requiredFor: ['all'],
    preferredForAutofill: true,
    extractionFields: ['first_name', 'middle_name', 'last_name', 'issuance_date'],
    acceptedSignals: ['state id metadata', 'license issue date'],
  },
  {
    kind: 'current_passport',
    label: 'Current passport',
    requiredFor: ['all'],
    preferredForAutofill: true,
    extractionFields: ['first_name', 'middle_name', 'last_name', 'issuance_date'],
    acceptedSignals: ['passport book metadata', 'passport issue date'],
  },
  {
    kind: 'social_security_card',
    label: 'Social Security card',
    requiredFor: ['all'],
    preferredForAutofill: false,
    extractionFields: ['first_name', 'middle_name', 'last_name'],
    acceptedSignals: ['ssa card metadata'],
  },
  {
    kind: 'birth_certificate',
    label: 'Birth certificate',
    requiredFor: ['all'],
    preferredForAutofill: false,
    extractionFields: ['first_name', 'middle_name', 'last_name'],
    acceptedSignals: ['vital record metadata'],
  },
  {
    kind: 'proof_of_address',
    label: 'Proof of address',
    requiredFor: ['all'],
    preferredForAutofill: false,
    extractionFields: ['county'],
    acceptedSignals: ['utility bill metadata', 'residence document metadata'],
  },
  {
    kind: 'other',
    label: 'Other supporting document',
    requiredFor: [],
    preferredForAutofill: false,
    extractionFields: [],
    acceptedSignals: ['freeform supporting metadata'],
  },
];

function fieldsForDocumentKind(
  kind: NameChangeDocumentKind,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeExtractionFieldKey[] {
  const hasDocument = documents.some((document) => document.document_kind === kind);
  if (!hasDocument) return [];

  const canonicalFieldHints = new Set<NameChangeExtractionFieldKey>();
  extractedFields.forEach((field) => {
    if (field.source_type === 'manual') canonicalFieldHints.add(field.field_key);
  });
  return [...canonicalFieldHints];
}

export function buildNameChangeDocumentIntakeSnapshot(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeDocumentIntakeSnapshot {
  const canonicalCase = buildNameChangeCanonicalCase(profile, documents, extractedFields);

  const statuses: NameChangeDocumentContractStatus[] = NAME_CHANGE_DOCUMENT_CONTRACTS.map((definition) => {
    const documentState = canonicalCase.documents[definition.kind];
    const capturedExtractionFields = fieldsForDocumentKind(definition.kind, documents, extractedFields)
      .filter((field): field is NameChangeExtractionFieldKey => definition.extractionFields.includes(field));
    const missingExtractionFields = definition.extractionFields.filter((field) => !capturedExtractionFields.includes(field));
    const required = definition.requiredFor.includes('all') || definition.requiredFor.includes(canonicalCase.legalBasis);

    return {
      kind: definition.kind,
      label: definition.label,
      required,
      preferredForAutofill: definition.preferredForAutofill,
      intakeStatus: documentState.intakeStatus,
      storageMode: documentState.storageMode,
      extractionFieldCount: documentState.extractionFieldCount,
      expectedExtractionFields: definition.extractionFields,
      capturedExtractionFields,
      missingExtractionFields,
    };
  });

  return {
    canonicalCase,
    documents: statuses,
    summary: {
      requiredReady: statuses.filter((status) => status.required && status.intakeStatus === 'reviewed').length,
      requiredMissing: statuses.filter((status) => status.required && status.intakeStatus === 'not_started').length,
      autofillReady: statuses.filter((status) => status.preferredForAutofill && status.missingExtractionFields.length === 0 && status.intakeStatus !== 'not_started').length,
      extractionGaps: statuses.filter((status) => status.intakeStatus !== 'not_started' && status.missingExtractionFields.length > 0).length,
    },
  };
}
