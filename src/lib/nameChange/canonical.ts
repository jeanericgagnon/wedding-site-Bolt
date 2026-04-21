import { getNameChangeDocumentKindAliases } from './documentKinds';
import { getDocumentCapturedFieldKeys } from './extractionContract';
import type {
  NameChangeCanonicalCase,
  NameChangeCanonicalPersonName,
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeDocumentKind,
  NameChangeExtractedFieldInput,
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

export function buildNameChangeCanonicalCase(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeCanonicalCase {
  const canonicalDocuments = DOCUMENT_KINDS.reduce<NameChangeCanonicalCase['documents']>((acc, kind) => {
    const document = documents.find((candidate) => getNameChangeDocumentKindAliases(kind).includes(candidate.document_kind));
    const extractedFieldKeys = getDocumentCapturedFieldKeys(documents, extractedFields, kind);
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
