import { buildNameChangeCanonicalCase } from './canonical';
import { canonicalizeNameChangeDocumentKind, matchesNameChangeDocumentKind } from './documentKinds';
import { buildNameChangeExtractionContractSnapshot, getDocumentCapturedFieldKeys } from './extractionContract';
import type {
  NameChangeCaseInput,
  NameChangeDocumentContractDefinition,
  NameChangeDocumentContractStatus,
  NameChangeDocumentInput,
  NameChangeDocumentIntakeSnapshot,
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
    extractionFields: ['first_name', 'last_name', 'case_number', 'court_order_date'],
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

function metadataMissingForDocument(document: NameChangeDocumentInput | undefined): string[] {
  if (!document || document.intake_status === 'not_started') return [];

  const missing: string[] = [];
  if (!document.file_name_masked?.trim()) missing.push('masked filename');
  if (!document.issuing_authority?.trim()) missing.push('issuing authority');
  if (!document.issued_on?.trim()) missing.push('issued date');

  if (document.document_kind === 'current_passport' || document.document_kind === 'current_drivers_license') {
    if (!document.expires_on?.trim()) missing.push('expiration date');
  }

  if (document.extraction_confidence == null) missing.push('extraction confidence');
  return missing;
}

function getDocumentContractPriority(
  document: NameChangeDocumentInput,
  kind: NameChangeDocumentInput['document_kind'],
) {
  const intakeWeight = document.intake_status === 'reviewed'
    ? 2
    : document.intake_status === 'uploaded'
      ? 1
      : 0;
  const canonicalKindWeight = document.document_kind === canonicalizeNameChangeDocumentKind(kind) ? 1 : 0;
  return (intakeWeight * 1000) + (canonicalKindWeight * 100) - metadataMissingForDocument(document).length;
}

function findBestContractDocument(
  documents: NameChangeDocumentInput[],
  kind: NameChangeDocumentInput['document_kind'],
) {
  return documents
    .filter((document) => matchesNameChangeDocumentKind(document.document_kind, kind))
    .sort((left, right) => getDocumentContractPriority(right, kind) - getDocumentContractPriority(left, kind))[0];
}

export function buildNameChangeDocumentIntakeSnapshot(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeDocumentIntakeSnapshot {
  const canonicalCase = buildNameChangeCanonicalCase(profile, documents, extractedFields);
  const extraction = buildNameChangeExtractionContractSnapshot(profile, documents, extractedFields);

  const statuses: NameChangeDocumentContractStatus[] = NAME_CHANGE_DOCUMENT_CONTRACTS.map((definition) => {
    const canonicalDocument = findBestContractDocument(documents, definition.kind);
    const documentState = canonicalCase.documents[definition.kind];
    const typedCapturedFields = (() => {
      switch (definition.kind) {
        case 'marriage_certificate':
          return Object.entries(extraction.marriageCertificate).filter(([, value]) => value).map(([key]) => {
            const mapping = {
              firstName: 'first_name',
              lastName: 'last_name',
              spouseLastName: 'spouse_last_name',
              county: 'county',
              issuanceDate: 'issuance_date',
              certificateNumber: 'certificate_number',
            } as const;
            return mapping[key as keyof typeof mapping];
          });
        case 'court_order':
          return Object.entries(extraction.courtOrder).filter(([, value]) => value).map(([key]) => {
            const mapping = {
              firstName: 'first_name',
              lastName: 'last_name',
              caseNumber: 'case_number',
              courtOrderDate: 'court_order_date',
            } as const;
            return mapping[key as keyof typeof mapping];
          });
        case 'current_passport':
          return Object.entries(extraction.currentPassport).filter(([, value]) => value).map(([key]) => {
            const mapping = {
              firstName: 'first_name',
              middleName: 'middle_name',
              lastName: 'last_name',
              issuanceDate: 'issuance_date',
            } as const;
            return mapping[key as keyof typeof mapping];
          });
        case 'current_drivers_license':
          return Object.entries(extraction.currentDriversLicense).filter(([, value]) => value).map(([key]) => {
            const mapping = {
              firstName: 'first_name',
              middleName: 'middle_name',
              lastName: 'last_name',
              issuanceDate: 'issuance_date',
            } as const;
            return mapping[key as keyof typeof mapping];
          });
        default:
          return getDocumentCapturedFieldKeys(documents, extractedFields, definition.kind);
      }
    })();
    const capturedExtractionFields = typedCapturedFields
      .filter((field): field is NameChangeExtractionFieldKey => definition.extractionFields.includes(field as NameChangeExtractionFieldKey));
    const missingExtractionFields = definition.extractionFields.filter((field) => !capturedExtractionFields.includes(field));
    const required = definition.requiredFor.includes('all') || definition.requiredFor.includes(canonicalCase.legalBasis);
    const metadataMissing = metadataMissingForDocument(canonicalDocument);
    const canonicalConflicts = extraction.conflicts.filter((conflict) => conflict.documentKind === definition.kind);

    const contractIntakeStatus = canonicalDocument?.intake_status ?? documentState.intakeStatus;
    const contractStorageMode = canonicalDocument?.storage_mode ?? documentState.storageMode;

    return {
      kind: definition.kind,
      label: definition.label,
      required,
      preferredForAutofill: definition.preferredForAutofill,
      intakeStatus: contractIntakeStatus,
      storageMode: contractStorageMode,
      extractionFieldCount: documentState.extractionFieldCount,
      metadataReady: metadataMissing.length === 0 && contractIntakeStatus !== 'not_started' ? 1 : 0,
      metadataMissing,
      expectedExtractionFields: definition.extractionFields,
      capturedExtractionFields,
      missingExtractionFields,
      canonicalConflicts,
    };
  });

  return {
    canonicalCase,
    documents: statuses,
    summary: {
      requiredReady: statuses.filter((status) => status.required && status.intakeStatus === 'reviewed').length,
      requiredMissing: statuses.filter((status) => status.required && status.intakeStatus !== 'reviewed').length,
      metadataReady: statuses.filter((status) => status.intakeStatus !== 'not_started' && status.metadataMissing.length === 0).length,
      metadataGaps: statuses.filter((status) => status.intakeStatus !== 'not_started' && status.metadataMissing.length > 0).length,
      autofillReady: statuses.filter((status) => status.preferredForAutofill && status.missingExtractionFields.length === 0 && status.intakeStatus === 'reviewed').length,
      extractionGaps: statuses.filter((status) => status.intakeStatus === 'reviewed' && status.missingExtractionFields.length > 0).length,
    },
  };
}
