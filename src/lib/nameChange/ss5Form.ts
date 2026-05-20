import { buildNameChangeFormPayloadSnapshot, type NameChangeFormContractDefinition } from './formContract';
import { buildNameChangeFormCompanion, type NameChangeFormCompanion, type NameChangeFormCompanionFieldGuidance, type NameChangeOfficialFormSource } from './formCompanion';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExtractedFieldInput,
  NameChangeFormPayloadSnapshot,
} from './types';

export const NAME_CHANGE_SS5_FORM_CONTRACT: NameChangeFormContractDefinition = {
  formCode: 'SSA-SS5',
  label: 'Social Security Administration SS-5',
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

export const NAME_CHANGE_SS5_OFFICIAL_SOURCE: NameChangeOfficialFormSource = {
  formCode: 'SSA-SS5',
  formLabel: NAME_CHANGE_SS5_FORM_CONTRACT.label,
  officialUrl: 'https://www.ssa.gov/forms/ss-5.pdf',
  officialFormsIndexUrl: 'https://www.ssa.gov/forms/',
  officialRevisionLabel: 'Form SS-5 (12-2024) UF',
  lastCheckedAt: '2026-05-20',
  verificationStatus: 'verified_current',
  submissionNote: 'This prepares a review draft only. The user must review, sign, and submit through Social Security instructions.',
};

export const NAME_CHANGE_SS5_FIELD_GUIDANCE: Record<string, NameChangeFormCompanionFieldGuidance> = {
  'applicant.currentFirstName': {
    section: 'Current legal name',
    officialFieldLabel: 'First name currently on record',
    userInstruction: 'Put this in the current first-name field for the Social Security record being corrected.',
  },
  'applicant.currentMiddleName': {
    section: 'Current legal name',
    officialFieldLabel: 'Middle name currently on record',
    userInstruction: 'Use this only if the official form asks for a middle name or initial.',
  },
  'applicant.currentLastName': {
    section: 'Current legal name',
    officialFieldLabel: 'Last name currently on record',
    userInstruction: 'Put this in the current last-name field for the Social Security record being corrected.',
  },
  'applicant.newFirstName': {
    section: 'Name requested on the updated record',
    officialFieldLabel: 'New first name',
    userInstruction: 'Put this in the requested first-name field for the corrected Social Security record.',
  },
  'applicant.newMiddleName': {
    section: 'Name requested on the updated record',
    officialFieldLabel: 'New middle name',
    userInstruction: 'Use this only if the updated record should include a middle name or initial.',
  },
  'applicant.newLastName': {
    section: 'Name requested on the updated record',
    officialFieldLabel: 'New last name',
    userInstruction: 'Put this in the requested last-name field for the corrected Social Security record.',
    reviewHint: 'Check that this exactly matches the marriage certificate or court-order path before signing.',
  },
  'legal.marriageDate': {
    section: 'Marriage proof',
    officialFieldLabel: 'Marriage date',
    userInstruction: 'Use this date wherever the official process asks when the marriage occurred.',
  },
  'legal.marriageCertificateNumber': {
    section: 'Marriage proof',
    officialFieldLabel: 'Marriage certificate number',
    userInstruction: 'Use this if the official form or office asks for a certificate, record, or license number.',
  },
  'legal.marriageIssuingAuthority': {
    section: 'Marriage proof',
    officialFieldLabel: 'Certificate issuing authority',
    userInstruction: 'Use this when the process asks which county clerk, recorder, or authority issued the certified proof.',
  },
  'identity.passportIssueDate': {
    section: 'Identity backup',
    officialFieldLabel: 'Passport issue date',
    userInstruction: 'Use this only if the official process asks for passport identity details.',
  },
};

export function buildNameChangeSs5FormSnapshot(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeFormPayloadSnapshot {
  return buildNameChangeFormPayloadSnapshot(NAME_CHANGE_SS5_FORM_CONTRACT, profile, documents, extractedFields);
}

export function buildNameChangeSs5FormCompanion(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeFormCompanion {
  return buildNameChangeFormCompanion(
    buildNameChangeSs5FormSnapshot(profile, documents, extractedFields),
    NAME_CHANGE_SS5_OFFICIAL_SOURCE,
    NAME_CHANGE_SS5_FIELD_GUIDANCE,
  );
}
