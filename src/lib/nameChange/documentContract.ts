import { buildNameChangeCanonicalCase } from './canonical';
import { canonicalizeNameChangeDocumentKind, matchesNameChangeDocumentKind } from './documentKinds';
import { buildNameChangeExtractionContractSnapshot } from './extractionContract';
import {
  buildDraftNameChangeDocumentId,
  isDraftNameChangePlaceholderDocument,
  normalizeDraftFieldKey,
  normalizeDraftNameChangeDocumentId,
} from './intakeDraft';
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
    extractionFields: ['first_name', 'middle_name', 'last_name', 'case_number', 'court_order_date'],
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

function isCountableNameChangeContractKind(kind: NameChangeDocumentContractDefinition['kind']) {
  return kind !== 'other';
}

function isReadyCountableNameChangeContractStatus(status: NameChangeDocumentContractStatus) {
  return isCountableNameChangeContractKind(status.kind);
}

function isReviewedReadyNameChangeContractStatus(status: NameChangeDocumentContractStatus) {
  return isReadyCountableNameChangeContractStatus(status)
    && status.intakeStatus === 'reviewed'
    && status.metadataMissing.length === 0
    && status.canonicalConflicts.length === 0;
}

function metadataMissingForDocument(document: NameChangeDocumentInput | undefined): string[] {
  if (!document || document.intake_status === 'not_started') return [];
  if (document.document_kind === 'other') return [];

  const missing: string[] = [];
  if (!document.file_name_masked?.trim() || isDraftNameChangePlaceholderDocument({ file_name_masked: document.file_name_masked })) missing.push('masked filename');
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
  const placeholderDocument = isDraftNameChangePlaceholderDocument(document);
  const reviewedMetadataReadyWeight = !placeholderDocument && document.intake_status === 'reviewed' && metadataMissingForDocument(document).length === 0 ? 1 : 0;
  const persistedDocumentWeight = placeholderDocument ? 0 : 1;
  const intakeWeight = document.intake_status === 'reviewed'
    ? 2
    : document.intake_status === 'uploaded'
      ? 1
      : 0;
  const canonicalKindWeight = document.document_kind === canonicalizeNameChangeDocumentKind(kind) ? 1 : 0;
  return (reviewedMetadataReadyWeight * 10000) + (persistedDocumentWeight * 5000) + (intakeWeight * 1000) + (canonicalKindWeight * 100) - metadataMissingForDocument(document).length;
}

function findBestContractDocument(
  documents: NameChangeDocumentInput[],
  kind: NameChangeDocumentInput['document_kind'],
) {
  const canonicalKind = canonicalizeNameChangeDocumentKind(kind);
  const matchingDocuments = documents.filter((document) => matchesNameChangeDocumentKind(document.document_kind, kind));
  const preferredDocuments = matchingDocuments.some((document) => document.document_kind === canonicalKind)
    ? matchingDocuments.filter((document) => document.document_kind === canonicalKind)
    : matchingDocuments;
  const rankedDocuments = preferredDocuments.some((document) => !isDraftNameChangePlaceholderDocument(document))
    ? preferredDocuments.filter((document) => !isDraftNameChangePlaceholderDocument(document))
    : preferredDocuments;

  return rankedDocuments
    .sort((left, right) => {
      const priorityDelta = getDocumentContractPriority(right, kind) - getDocumentContractPriority(left, kind);
      if (priorityDelta !== 0) return priorityDelta;
      return (right.id ?? '').localeCompare(left.id ?? '');
    })[0];
}

function getContractDocumentCapturedFieldKeys(
  documents: NameChangeDocumentInput[],
  kind: NameChangeDocumentInput['document_kind'],
  extractedFields: NameChangeExtractedFieldInput[],
  expectedFields: NameChangeExtractionFieldKey[],
): NameChangeExtractionFieldKey[] {
  const candidateDocumentIds = new Set<string>();

  documents
    .filter((document) => matchesNameChangeDocumentKind(document.document_kind, kind))
    .forEach((document) => {
      const normalizedDocumentId = normalizeDraftNameChangeDocumentId(document.id ?? null);
      if (normalizedDocumentId) candidateDocumentIds.add(normalizedDocumentId);
    });

  const normalizedDraftDocumentId = normalizeDraftNameChangeDocumentId(buildDraftNameChangeDocumentId(kind));
  if (normalizedDraftDocumentId) candidateDocumentIds.add(normalizedDraftDocumentId);

  if (candidateDocumentIds.size === 0) return [];

  return [...new Set(
    extractedFields
      .filter((field) => {
        if (!field.is_verified) return false;
        const normalizedFieldDocumentId = normalizeDraftNameChangeDocumentId(field.document_id);
        return normalizedFieldDocumentId ? candidateDocumentIds.has(normalizedFieldDocumentId) : false;
      })
      .map((field) => normalizeDraftFieldKey(field.field_key) as NameChangeExtractionFieldKey)
      .filter((fieldKey): fieldKey is NameChangeExtractionFieldKey => expectedFields.includes(fieldKey)),
  )];
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
    const typedCapturedFields = getContractDocumentCapturedFieldKeys(documents, definition.kind, extractedFields, definition.extractionFields);
    const required = definition.requiredFor.includes('all') || definition.requiredFor.includes(canonicalCase.legalBasis);
    const metadataMissing = metadataMissingForDocument(canonicalDocument);
    const contractIntakeStatus = canonicalDocument?.intake_status ?? documentState.intakeStatus;
    const contractStorageMode = canonicalDocument?.storage_mode ?? documentState.storageMode;
    const canonicalConflicts = contractIntakeStatus === 'not_started'
      ? []
      : extraction.conflicts.filter((conflict) => conflict.documentKind === definition.kind);
    const capturedExtractionFields = contractIntakeStatus === 'not_started'
      ? []
      : [...new Set(typedCapturedFields
        .filter((field): field is NameChangeExtractionFieldKey => definition.extractionFields.includes(field as NameChangeExtractionFieldKey)))];
    const missingExtractionFields = definition.extractionFields.filter((field) => !capturedExtractionFields.includes(field));
    const extractionChecklistBlocked = definition.kind === 'other' || contractIntakeStatus === 'not_started' || metadataMissing.length > 0;
    const visibleCapturedExtractionFields = extractionChecklistBlocked ? [] : capturedExtractionFields;
    const visibleCanonicalConflicts = extractionChecklistBlocked ? [] : canonicalConflicts;

    return {
      kind: definition.kind,
      label: definition.label,
      required,
      preferredForAutofill: definition.preferredForAutofill,
      intakeStatus: contractIntakeStatus,
      storageMode: contractStorageMode,
      extractionFieldCount: visibleCapturedExtractionFields.length,
      metadataReady: isCountableNameChangeContractKind(definition.kind) && metadataMissing.length === 0 && contractIntakeStatus === 'reviewed' && canonicalConflicts.length === 0 ? 1 : 0,
      metadataMissing,
      expectedExtractionFields: extractionChecklistBlocked ? [] : definition.extractionFields,
      capturedExtractionFields: visibleCapturedExtractionFields,
      missingExtractionFields: extractionChecklistBlocked ? [] : missingExtractionFields,
      latentMissingExtractionFields: missingExtractionFields,
      canonicalConflicts: visibleCanonicalConflicts,
    };
  });

  return {
    canonicalCase,
    documents: statuses,
    summary: {
      requiredReady: statuses.filter((status) => status.required && isReviewedReadyNameChangeContractStatus(status)).length,
      requiredMissing: statuses.filter((status) => isReadyCountableNameChangeContractStatus(status) && status.required && (status.intakeStatus !== 'reviewed' || status.canonicalConflicts.length > 0 || status.metadataMissing.length > 0)).length,
      metadataReady: statuses.filter((status) => isReviewedReadyNameChangeContractStatus(status)).length,
      metadataGaps: statuses.filter((status) => isReadyCountableNameChangeContractStatus(status) && status.intakeStatus !== 'not_started' && (status.metadataMissing.length > 0 || (status.metadataMissing.length === 0 && status.canonicalConflicts.length > 0))).length,
      autofillReady: statuses.filter((status) => isReadyCountableNameChangeContractStatus(status) && status.preferredForAutofill && status.missingExtractionFields.length === 0 && status.canonicalConflicts.length === 0 && status.metadataMissing.length === 0 && status.intakeStatus === 'reviewed').length,
      extractionGaps: statuses.filter((status) => isReadyCountableNameChangeContractStatus(status) && status.intakeStatus === 'reviewed' && status.metadataMissing.length === 0 && (status.missingExtractionFields.length > 0 || status.canonicalConflicts.length > 0)).length,
    },
  };
}
