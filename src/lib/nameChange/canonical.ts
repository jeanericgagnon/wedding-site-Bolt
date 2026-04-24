import { canonicalizeNameChangeDocumentKind, getNameChangeDocumentKindAliases } from './documentKinds';
import {
  buildDraftNameChangeExtractedFieldsFromSnapshot,
  isDraftNameChangePlaceholderDocument,
  normalizeDraftNameChangeDocumentId,
  normalizeDraftFieldKey,
} from './intakeDraft';
import type {
  NameChangeCanonicalCase,
  NameChangeCanonicalPersonName,
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeDocumentKind,
  NameChangeExtractedFieldInput,
  NameChangeExtractionFieldKey,
} from './types';

function buildPersonName(first: string, middle: string | null | undefined, last: string): NameChangeCanonicalPersonName {
  const middleValue = (middle ?? '').trim() || null;
  return {
    first,
    middle: middleValue,
    last,
    full: [first, middleValue, last].filter(Boolean).join(' '),
  };
}

const DOCUMENT_KINDS: NameChangeDocumentKind[] = [
  'marriage_certificate',
  'court_order',
  'current_drivers_license',
  'current_passport',
  'social_security_card',
  'birth_certificate',
  'proof_of_address',
  'other',
];

function getCanonicalDocumentFieldKeys(
  document: NameChangeDocumentInput | undefined,
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeExtractionFieldKey[] {
  if (!document?.id) return [];

  const documentSnapshotFields = buildDraftNameChangeExtractedFieldsFromSnapshot(document.id, document.extracted_snapshot, document.document_kind);
  const candidateDocumentIds = new Set([
    document.id,
    normalizeDraftNameChangeDocumentId(document.id, document.document_kind),
  ].filter(Boolean));

  return [...new Set(
    [...extractedFields, ...documentSnapshotFields]
      .filter((field) => candidateDocumentIds.has(field.document_id) && field.is_verified)
      .map((field) => normalizeDraftFieldKey(field.field_key) as NameChangeExtractionFieldKey)
      .filter((fieldKey): fieldKey is NameChangeExtractionFieldKey => Boolean(fieldKey)),
  )];
}

function getCanonicalDocumentPriority(
  document: NameChangeDocumentInput,
  kind: NameChangeDocumentKind,
  extractedFields: NameChangeExtractedFieldInput[],
) {
  const linkedFieldCount = getCanonicalDocumentFieldKeys(document, extractedFields).length;
  const realDocumentWeight = isDraftNameChangePlaceholderDocument(document) ? 0 : 1;
  const intakeWeight = document.intake_status === 'reviewed'
    ? 2
    : document.intake_status === 'uploaded'
      ? 1
      : 0;
  const canonicalKindWeight = document.document_kind === canonicalizeNameChangeDocumentKind(kind) ? 1 : 0;

  return (linkedFieldCount * 1000) + (realDocumentWeight * 100) + (intakeWeight * 10) + canonicalKindWeight;
}

function findCanonicalDocument(
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
  kind: NameChangeDocumentKind,
) {
  const aliases = getNameChangeDocumentKindAliases(kind);
  return documents
    .filter((candidate) => aliases.includes(candidate.document_kind))
    .sort((left, right) => {
      const priorityDelta = getCanonicalDocumentPriority(right, kind, extractedFields) - getCanonicalDocumentPriority(left, kind, extractedFields);
      if (priorityDelta !== 0) return priorityDelta;
      return (right.id ?? '').localeCompare(left.id ?? '');
    })[0];
}

export function buildNameChangeCanonicalCase(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeCanonicalCase {
  const canonicalDocuments = DOCUMENT_KINDS.reduce<NameChangeCanonicalCase['documents']>((acc, kind) => {
    const document = findCanonicalDocument(documents, extractedFields, kind);
    const extractedFieldKeys = getCanonicalDocumentFieldKeys(document, extractedFields);
    acc[kind] = {
      intakeStatus: document?.intake_status ?? 'not_started',
      storageMode: document?.storage_mode ?? 'none',
      extractionFieldCount: extractedFieldKeys.length,
      extractedFieldKeys,
    };
    return acc;
  }, {} as NameChangeCanonicalCase['documents']);

  return {
    legalBasis: profile.legal_basis,
    workflowStatus: profile.workflow_status,
    launchState: profile.launch_state,
    countyResidence: profile.county_residence ?? null,
    currentName: buildPersonName(profile.current_first_name, profile.current_middle_name ?? null, profile.current_last_name),
    targetName: buildPersonName(profile.target_first_name, profile.target_middle_name ?? null, profile.target_last_name),
    identity: {
      isUsCitizen: profile.is_us_citizen,
      hasUsPassport: profile.has_us_passport,
      passportNeedsUpdate: profile.passport_needs_update,
      hasRealIdLicense: profile.has_real_id_license,
    },
    lifeContext: {
      urgencyLevel: profile.urgency_level,
      employmentStatus: profile.employment_status,
      travelBookedSoon: Boolean(profile.structured_intake.travelBookedSoon),
    },
    legalContext: {
      marriageDate: profile.marriage_date ?? null,
      marriageState: profile.marriage_state ?? null,
      spouseLastName: typeof profile.structured_intake.spouseLastName === 'string' ? profile.structured_intake.spouseLastName : null,
    },
    documents: canonicalDocuments,
  };
}
