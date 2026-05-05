import { buildNameChangeCanonicalCase } from './canonical';
import { canonicalizeNameChangeDocumentKind, matchesNameChangeDocumentKind } from './documentKinds';
import { buildNameChangeExtractionContractSnapshot } from './extractionContract';
import {
  buildDraftNameChangeDocumentMetadataFromSnapshot,
  buildDraftNameChangeExtractedFieldsFromSnapshot,
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
    acceptedSignals: ['filed certificate record', 'certified copy', 'county clerk issuance', 'county recorder issuance', 'marriage certificate details'],
  },
  {
    kind: 'court_order',
    label: 'Court order',
    requiredFor: ['court_order'],
    preferredForAutofill: true,
    extractionFields: ['first_name', 'middle_name', 'last_name', 'case_number', 'court_order_date'],
    acceptedSignals: ['signed court order', 'filed order details'],
  },
  {
    kind: 'current_drivers_license',
    label: 'Current driver license / state ID',
    requiredFor: ['all'],
    preferredForAutofill: true,
    extractionFields: ['first_name', 'middle_name', 'last_name', 'issuance_date'],
    acceptedSignals: ['state id details', 'license issue date'],
  },
  {
    kind: 'current_passport',
    label: 'Current passport',
    requiredFor: ['all'],
    preferredForAutofill: true,
    extractionFields: ['first_name', 'middle_name', 'last_name', 'issuance_date'],
    acceptedSignals: ['passport book details', 'passport issue date'],
  },
  {
    kind: 'social_security_card',
    label: 'Social Security card',
    requiredFor: ['all'],
    preferredForAutofill: false,
    extractionFields: ['first_name', 'middle_name', 'last_name'],
    acceptedSignals: ['ssa card details'],
  },
  {
    kind: 'benefits_account_record',
    label: 'Benefits / retirement account record',
    requiredFor: [],
    preferredForAutofill: false,
    extractionFields: [],
    acceptedSignals: ['401k statement details', 'beneficiary designation details', 'retirement account details'],
  },
  {
    kind: 'insurance_card',
    label: 'Insurance card',
    requiredFor: [],
    preferredForAutofill: false,
    extractionFields: [],
    acceptedSignals: ['member ID card details', 'insurance card details', 'payer card details'],
  },
  {
    kind: 'professional_license_record',
    label: 'Professional license / certification record',
    requiredFor: [],
    preferredForAutofill: false,
    extractionFields: [],
    acceptedSignals: ['license card details', 'license certificate details', 'credential record details'],
  },
  {
    kind: 'birth_certificate',
    label: 'Birth certificate',
    requiredFor: ['all'],
    preferredForAutofill: false,
    extractionFields: ['first_name', 'middle_name', 'last_name'],
    acceptedSignals: ['vital record details'],
  },
  {
    kind: 'proof_of_address',
    label: 'Proof of address',
    requiredFor: ['all'],
    preferredForAutofill: false,
    extractionFields: ['county'],
    acceptedSignals: ['utility bill details', 'residence document details'],
  },
  {
    kind: 'other',
    label: 'Other supporting document',
    requiredFor: [],
    preferredForAutofill: false,
    extractionFields: [],
    acceptedSignals: ['freeform supporting details'],
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

  const snapshotMetadata = buildDraftNameChangeDocumentMetadataFromSnapshot(document.extracted_snapshot);
  const fileNameMasked = getContractDocumentFileNameMasked(document, snapshotMetadata);
  const issuingAuthority = document.issuing_authority?.trim() || snapshotMetadata.issuingAuthority?.trim() || null;
  const issuedOn = document.issued_on?.trim() || snapshotMetadata.issuedOn?.trim() || null;
  const expiresOn = document.expires_on?.trim() || snapshotMetadata.expiresOn?.trim() || null;
  const extractionConfidence = document.extraction_confidence ?? snapshotMetadata.extractionConfidence;

  const missing: string[] = [];
  if (!fileNameMasked || isDraftNameChangePlaceholderDocument({ file_name_masked: fileNameMasked })) missing.push('masked filename');
  if (!issuingAuthority) missing.push('issuing authority');
  if (!issuedOn) missing.push('issued date');

  if (document.document_kind === 'current_passport' || document.document_kind === 'current_drivers_license') {
    if (!expiresOn) missing.push('expiration date');
  }

  if (extractionConfidence == null) missing.push('extraction confidence');
  return missing;
}

function getContractDocumentFileNameMasked(
  document: Pick<NameChangeDocumentInput, 'file_name_masked' | 'extracted_snapshot'> | undefined,
  snapshotMetadata = buildDraftNameChangeDocumentMetadataFromSnapshot(document?.extracted_snapshot),
) {
  const persistedFileNameMasked = document?.file_name_masked?.trim() || null;
  const snapshotFileNameMasked = snapshotMetadata.fileNameMasked?.trim() || null;

  if (persistedFileNameMasked && !isDraftNameChangePlaceholderDocument({ file_name_masked: persistedFileNameMasked })) {
    return persistedFileNameMasked;
  }

  if (snapshotFileNameMasked && !isDraftNameChangePlaceholderDocument({ file_name_masked: snapshotFileNameMasked })) {
    return snapshotFileNameMasked;
  }

  return persistedFileNameMasked || snapshotFileNameMasked || null;
}

function isContractPlaceholderDocument(document: NameChangeDocumentInput | undefined) {
  if (!document) return false;

  const snapshotMetadata = buildDraftNameChangeDocumentMetadataFromSnapshot(document.extracted_snapshot);
  const fileNameMasked = getContractDocumentFileNameMasked(document, snapshotMetadata);

  if (fileNameMasked && !isDraftNameChangePlaceholderDocument({ file_name_masked: fileNameMasked })) {
    return false;
  }

  return isDraftNameChangePlaceholderDocument({
    id: document.id,
    file_name_masked: fileNameMasked,
  });
}

function getDocumentContractPriority(
  document: NameChangeDocumentInput,
  kind: NameChangeDocumentInput['document_kind'],
  extractedFields: NameChangeExtractedFieldInput[],
) {
  const definition = NAME_CHANGE_DOCUMENT_CONTRACTS.find((contract) => contract.kind === canonicalizeNameChangeDocumentKind(kind));
  const placeholderDocument = isContractPlaceholderDocument(document);
  const reviewedMetadataReadyWeight = !placeholderDocument && document.intake_status === 'reviewed' && metadataMissingForDocument(document).length === 0 ? 1 : 0;
  const persistedDocumentWeight = placeholderDocument ? 0 : 1;
  const intakeWeight = document.intake_status === 'reviewed'
    ? 2
    : document.intake_status === 'uploaded'
      ? 1
      : 0;
  const canonicalKindWeight = document.document_kind === canonicalizeNameChangeDocumentKind(kind) ? 1 : 0;
  const normalizedDocumentId = normalizeDraftNameChangeDocumentId(document.id ?? null, kind);
  const snapshotExtractedFields = buildDraftNameChangeExtractedFieldsFromSnapshot(document.id ?? null, document.extracted_snapshot, kind);
  const extractedFieldWeight = definition
    ? [...new Set(
      [...extractedFields, ...snapshotExtractedFields]
        .filter((field) => field.is_verified && normalizeDraftNameChangeDocumentId(field.document_id, kind) === normalizedDocumentId)
        .map((field) => normalizeDraftFieldKey(field.field_key) as NameChangeExtractionFieldKey)
        .filter((fieldKey): fieldKey is NameChangeExtractionFieldKey => definition.extractionFields.includes(fieldKey)),
    )].length
    : 0;
  return (reviewedMetadataReadyWeight * 10000) + (persistedDocumentWeight * 5000) + (intakeWeight * 1000) + (canonicalKindWeight * 100) + (extractedFieldWeight * 10) - metadataMissingForDocument(document).length;
}

function findBestContractDocument(
  documents: NameChangeDocumentInput[],
  kind: NameChangeDocumentInput['document_kind'],
  extractedFields: NameChangeExtractedFieldInput[] = [],
) {
  const canonicalKind = canonicalizeNameChangeDocumentKind(kind);
  const matchingDocuments = documents.filter((document) => matchesNameChangeDocumentKind(document.document_kind, kind));
  const preferredDocuments = matchingDocuments.some((document) => document.document_kind === canonicalKind)
    ? matchingDocuments.filter((document) => document.document_kind === canonicalKind)
    : matchingDocuments;
  const rankedDocuments = preferredDocuments.some((document) => !isContractPlaceholderDocument(document))
    ? preferredDocuments.filter((document) => !isContractPlaceholderDocument(document))
    : preferredDocuments;

  return rankedDocuments
    .sort((left, right) => {
      const priorityDelta = getDocumentContractPriority(right, kind, extractedFields) - getDocumentContractPriority(left, kind, extractedFields);
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
  const canonicalDocument = findBestContractDocument(documents, kind, extractedFields);
  const canonicalDocumentId = canonicalDocument?.id?.trim() || null;
  const canonicalDocumentIsPlaceholder = isContractPlaceholderDocument(canonicalDocument);
  const canonicalDocumentUsesDraftId = typeof canonicalDocumentId === 'string' && /^draft/i.test(canonicalDocumentId);
  const candidateDocumentIds = new Set<string>();
  const snapshotExtractedFields: NameChangeExtractedFieldInput[] = [];

  documents
    .filter((document) => matchesNameChangeDocumentKind(document.document_kind, kind))
    .forEach((document) => {
      const normalizedDocumentId = normalizeDraftNameChangeDocumentId(document.id ?? null);
      const trimmedDocumentId = document.id?.trim() || null;

      if (canonicalDocumentIsPlaceholder || canonicalDocumentUsesDraftId) {
        if (trimmedDocumentId && canonicalDocumentId && trimmedDocumentId === canonicalDocumentId) {
          candidateDocumentIds.add(trimmedDocumentId);
        }
        if (normalizedDocumentId?.startsWith('draft-')) {
          candidateDocumentIds.add(normalizedDocumentId);
        }
        if (document.id === canonicalDocument?.id) {
          snapshotExtractedFields.push(...buildDraftNameChangeExtractedFieldsFromSnapshot(document.id ?? null, document.extracted_snapshot, kind));
        }
        return;
      }

      if (normalizedDocumentId) candidateDocumentIds.add(normalizedDocumentId);
      if (document.id === canonicalDocument?.id) {
        snapshotExtractedFields.push(...buildDraftNameChangeExtractedFieldsFromSnapshot(document.id ?? null, document.extracted_snapshot, kind));
      }
    });

  const normalizedDraftDocumentId = normalizeDraftNameChangeDocumentId(buildDraftNameChangeDocumentId(kind));
  if (normalizedDraftDocumentId) candidateDocumentIds.add(normalizedDraftDocumentId);

  if (canonicalDocumentId && canonicalDocumentIsPlaceholder) {
    candidateDocumentIds.add(canonicalDocumentId);
  }

  if (candidateDocumentIds.size === 0) return [];

  return [...new Set(
    [...extractedFields, ...snapshotExtractedFields]
      .filter((field) => {
        if (!field.is_verified) return false;
        const trimmedFieldDocumentId = field.document_id?.trim() || null;
        if (!trimmedFieldDocumentId) return false;
        if (canonicalDocumentIsPlaceholder || canonicalDocumentUsesDraftId) {
          if (canonicalDocumentId && trimmedFieldDocumentId === canonicalDocumentId) return true;
          if (/^(?:blob|data):/i.test(trimmedFieldDocumentId)) {
            return candidateDocumentIds.has(normalizedDraftDocumentId ?? '');
          }
          if (!isDraftNameChangePlaceholderDocument({ id: trimmedFieldDocumentId })) {
            if (/^doc[-_]/i.test(trimmedFieldDocumentId)) {
              return false;
            }
            const normalizedAliasDocumentId = normalizeDraftNameChangeDocumentId(trimmedFieldDocumentId, kind);
            return normalizedAliasDocumentId ? candidateDocumentIds.has(normalizedAliasDocumentId) : false;
          }
        }
        const normalizedFieldDocumentId = normalizeDraftNameChangeDocumentId(field.document_id);
        return normalizedFieldDocumentId ? candidateDocumentIds.has(normalizedFieldDocumentId) : false;
      })
      .map((field) => normalizeDraftFieldKey(field.field_key) as NameChangeExtractionFieldKey)
      .filter((fieldKey): fieldKey is NameChangeExtractionFieldKey => expectedFields.includes(fieldKey)),
  )];
}

function buildDocumentContractExtractedFields(
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeExtractedFieldInput[] {
  const priorityExtractedFields = [
    ...extractedFields,
    ...documents.flatMap((document) => buildDraftNameChangeExtractedFieldsFromSnapshot(document.id ?? null, document.extracted_snapshot, document.document_kind)),
  ];
  const canonicalSnapshotDocumentIds = new Set(
    NAME_CHANGE_DOCUMENT_CONTRACTS
      .map((definition) => findBestContractDocument(documents, definition.kind, priorityExtractedFields)?.id?.trim() || null)
      .filter((documentId): documentId is string => Boolean(documentId)),
  );
  const snapshotExtractedFields = documents.flatMap((document) => {
    const documentId = document.id?.trim() || null;
    if (document.document_kind !== 'other' && documentId && !canonicalSnapshotDocumentIds.has(documentId)) {
      return [];
    }

    return buildDraftNameChangeExtractedFieldsFromSnapshot(document.id ?? null, document.extracted_snapshot, document.document_kind);
  });
  return [...extractedFields, ...snapshotExtractedFields];
}

export function buildNameChangeDocumentIntakeSnapshot(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeDocumentIntakeSnapshot {
  const contractExtractedFields = buildDocumentContractExtractedFields(documents, extractedFields);
  const canonicalCase = buildNameChangeCanonicalCase(profile, documents, contractExtractedFields);
  const extraction = buildNameChangeExtractionContractSnapshot(profile, documents, contractExtractedFields);

    const statuses: NameChangeDocumentContractStatus[] = NAME_CHANGE_DOCUMENT_CONTRACTS.map((definition) => {
    const documentState = canonicalCase.documents[definition.kind];
    const canonicalDocument = findBestContractDocument(documents, definition.kind, contractExtractedFields);
    const typedCapturedFields = getContractDocumentCapturedFieldKeys(documents, definition.kind, contractExtractedFields, definition.extractionFields);
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
      documentId: canonicalDocument?.id?.trim() || null,
      displayName: canonicalDocument?.display_name?.trim() || null,
      fileNameMasked: getContractDocumentFileNameMasked(canonicalDocument),
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
