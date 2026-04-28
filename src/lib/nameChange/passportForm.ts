import { buildNameChangeFormPayloadSnapshot, type NameChangeFormContractDefinition } from './formContract';
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
