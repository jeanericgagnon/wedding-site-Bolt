import { buildNameChangeFormPayloadSnapshot, type NameChangeFormContractDefinition } from './formContract';
import { buildNameChangeFormCompanion, type NameChangeFormCompanion, type NameChangeFormCompanionFieldGuidance, type NameChangeOfficialFormSource } from './formCompanion';
import { getVerifiedDocumentLinkedFieldValue } from './extractionContract';
import { buildNameChangeSnapshotBackedExtractedFields } from './intakeDraft';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExtractedFieldInput,
  NameChangeFormPayloadSnapshot,
} from './types';

export const NAME_CHANGE_PASSPORT_RENEWAL_FORM_CONTRACT: NameChangeFormContractDefinition = {
  formCode: 'DS-82',
  label: 'U.S. Passport Renewal Application',
  fieldSpecs: [
    { fieldKey: 'applicant.currentFirstName', label: 'Current first name', sourceTargetField: 'applicant.current_first_name' },
    { fieldKey: 'applicant.currentMiddleName', label: 'Current middle name', sourceTargetField: 'applicant.current_middle_name', required: false },
    { fieldKey: 'applicant.currentLastName', label: 'Current last name', sourceTargetField: 'applicant.current_last_name' },
    { fieldKey: 'applicant.newFirstName', label: 'New first name', sourceTargetField: 'applicant.target_first_name' },
    { fieldKey: 'applicant.newMiddleName', label: 'New middle name', sourceTargetField: 'applicant.target_middle_name', required: false },
    { fieldKey: 'applicant.newLastName', label: 'New last name', sourceTargetField: 'applicant.target_last_name' },
    { fieldKey: 'legal.marriageDate', label: 'Marriage date', sourceTargetField: 'legal.marriage_date' },
    { fieldKey: 'legal.marriageCertificateNumber', label: 'Marriage certificate number', sourceTargetField: 'legal.marriage_certificate_number', required: false },
    { fieldKey: 'legal.marriageIssuingAuthority', label: 'Marriage certificate issuing authority', sourceTargetField: 'legal.marriage_issuing_authority', required: false },
    { fieldKey: 'identity.passportIssueDate', label: 'Passport issue date', sourceTargetField: 'identity.passport_issue_date', required: false },
  ],
};

export const NAME_CHANGE_PASSPORT_APPLICATION_FORM_CONTRACT: NameChangeFormContractDefinition = {
  formCode: 'DS-11',
  label: 'Application for a U.S. Passport',
  fieldSpecs: NAME_CHANGE_PASSPORT_RENEWAL_FORM_CONTRACT.fieldSpecs,
};

export const NAME_CHANGE_PASSPORT_CORRECTION_FORM_CONTRACT: NameChangeFormContractDefinition = {
  formCode: 'DS-5504',
  label: 'U.S. Passport Re-Application / Data Correction',
  fieldSpecs: NAME_CHANGE_PASSPORT_RENEWAL_FORM_CONTRACT.fieldSpecs,
};

export const NAME_CHANGE_PASSPORT_OFFICIAL_SOURCES: Record<string, NameChangeOfficialFormSource> = {
  'DS-11': {
    formCode: 'DS-11',
    formLabel: NAME_CHANGE_PASSPORT_APPLICATION_FORM_CONTRACT.label,
    officialUrl: 'https://eforms.state.gov/Forms/ds11_pdf.PDF',
    officialFormsIndexUrl: 'https://travel.state.gov/content/travel/en/passports/how-apply/forms.html?os=f',
    officialRevisionLabel: 'DS-11 04-2025',
    lastCheckedAt: '2026-05-20',
    verificationStatus: 'verified_current',
    submissionNote: 'This prepares a review draft only. The user must review, sign when instructed, and submit through U.S. passport instructions.',
  },
  'DS-82': {
    formCode: 'DS-82',
    formLabel: NAME_CHANGE_PASSPORT_RENEWAL_FORM_CONTRACT.label,
    officialUrl: 'https://eforms.state.gov/Forms/ds82_pdf.PDF',
    officialFormsIndexUrl: 'https://travel.state.gov/content/travel/en/passports/how-apply/forms.html?os=f',
    officialRevisionLabel: 'DS-82 04-2025',
    lastCheckedAt: '2026-05-20',
    verificationStatus: 'verified_current',
    submissionNote: 'This prepares a review draft only. The user must review, sign, date, and submit through U.S. passport instructions.',
  },
  'DS-5504': {
    formCode: 'DS-5504',
    formLabel: NAME_CHANGE_PASSPORT_CORRECTION_FORM_CONTRACT.label,
    officialUrl: 'https://eforms.state.gov/Forms/ds5504_pdf.PDF',
    officialFormsIndexUrl: 'https://travel.state.gov/content/travel/en/passports/how-apply/forms.html?os=f',
    officialRevisionLabel: 'DS-5504 04-2025',
    lastCheckedAt: '2026-05-20',
    verificationStatus: 'verified_current',
    submissionNote: 'This prepares a review draft only. The user must review, sign, date, and submit through U.S. passport instructions.',
  },
};

export const NAME_CHANGE_PASSPORT_FIELD_GUIDANCE: Record<string, NameChangeFormCompanionFieldGuidance> = {
  'applicant.currentFirstName': {
    section: 'Current passport name',
    officialFieldLabel: 'Current or previous first name',
    userInstruction: 'Use this where the passport form asks for the name currently or previously used on the passport record.',
  },
  'applicant.currentMiddleName': {
    section: 'Current passport name',
    officialFieldLabel: 'Current or previous middle name',
    userInstruction: 'Use this only if the form asks for a middle name or middle initial already tied to the passport record.',
  },
  'applicant.currentLastName': {
    section: 'Current passport name',
    officialFieldLabel: 'Current or previous last name',
    userInstruction: 'Use this where the passport form asks for the last name currently or previously used on the passport record.',
  },
  'applicant.newFirstName': {
    section: 'Name requested on passport',
    officialFieldLabel: 'New first name',
    userInstruction: 'Put this in the first-name field for the name that should appear on the updated passport.',
  },
  'applicant.newMiddleName': {
    section: 'Name requested on passport',
    officialFieldLabel: 'New middle name',
    userInstruction: 'Use this only if the updated passport should include a middle name or initial.',
  },
  'applicant.newLastName': {
    section: 'Name requested on passport',
    officialFieldLabel: 'New last name',
    userInstruction: 'Put this in the last-name field for the name that should appear on the updated passport.',
    reviewHint: 'Check that this exactly matches the certified marriage certificate or court-order proof before signing.',
  },
  'legal.marriageDate': {
    section: 'Name-change proof',
    officialFieldLabel: 'Date of marriage or legal name-change event',
    userInstruction: 'Use this wherever the passport form asks for the date tied to the legal name-change proof.',
  },
  'legal.marriageCertificateNumber': {
    section: 'Name-change proof',
    officialFieldLabel: 'Marriage certificate number',
    userInstruction: 'Use this if the passport form or acceptance office asks for the certificate, record, or license number.',
  },
  'legal.marriageIssuingAuthority': {
    section: 'Name-change proof',
    officialFieldLabel: 'Issuing authority for name-change proof',
    userInstruction: 'Use this when the form, acceptance office, or mailing packet asks who issued the certified proof.',
  },
  'identity.passportIssueDate': {
    section: 'Existing passport',
    officialFieldLabel: 'Most recent passport issue date',
    userInstruction: 'Use this where the passport form asks when the current or most recent passport was issued.',
    reviewHint: 'This date decides whether the recent-name-change correction path is available, so check it against the passport before use.',
  },
};

function isRecentPassportIssueDate(issueDate: string | null, referenceDate = new Date()): boolean {
  if (!issueDate) return false;
  const issuedAt = new Date(`${issueDate}T00:00:00Z`);
  if (Number.isNaN(issuedAt.getTime())) return false;

  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  return referenceDate.getTime() - issuedAt.getTime() <= oneYearMs;
}

export function buildNameChangePassportFormSnapshot(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeFormPayloadSnapshot {
  const mergedExtractedFields = buildNameChangeSnapshotBackedExtractedFields(documents, extractedFields);
  const passportIssueDate = getVerifiedDocumentLinkedFieldValue(documents, mergedExtractedFields, 'current_passport', 'issuance_date');
  const contract = !profile.has_us_passport
    ? NAME_CHANGE_PASSPORT_APPLICATION_FORM_CONTRACT
    : isRecentPassportIssueDate(passportIssueDate)
      ? NAME_CHANGE_PASSPORT_CORRECTION_FORM_CONTRACT
      : NAME_CHANGE_PASSPORT_RENEWAL_FORM_CONTRACT;

  return buildNameChangeFormPayloadSnapshot(contract, profile, documents, mergedExtractedFields);
}

export function getNameChangePassportOfficialSource(formCode: string): NameChangeOfficialFormSource {
  return NAME_CHANGE_PASSPORT_OFFICIAL_SOURCES[formCode] ?? {
    formCode,
    formLabel: 'U.S. passport form',
    officialUrl: 'https://travel.state.gov/content/travel/en/passports/how-apply/forms.html?os=f',
    officialFormsIndexUrl: 'https://travel.state.gov/content/travel/en/passports/how-apply/forms.html?os=f',
    officialRevisionLabel: 'Passport form source needs review',
    lastCheckedAt: '2026-05-20',
    verificationStatus: 'needs_review',
    submissionNote: 'This prepares a review draft only. The user must confirm the current official passport form before signing or submitting.',
  };
}

export function buildNameChangePassportFormCompanion(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeFormCompanion {
  const snapshot = buildNameChangePassportFormSnapshot(profile, documents, extractedFields);

  return buildNameChangeFormCompanion(
    snapshot,
    getNameChangePassportOfficialSource(snapshot.formCode),
    NAME_CHANGE_PASSPORT_FIELD_GUIDANCE,
  );
}
