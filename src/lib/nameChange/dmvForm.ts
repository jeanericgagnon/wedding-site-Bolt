import { buildNameChangeFormPayloadSnapshot, type NameChangeFormContractDefinition } from './formContract';
import { buildNameChangeFormCompanion, type NameChangeFormCompanion, type NameChangeFormCompanionFieldGuidance, type NameChangeOfficialFormSource } from './formCompanion';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExtractedFieldInput,
  NameChangeFormPayloadSnapshot,
} from './types';

export const NAME_CHANGE_DMV_FORM_CONTRACT: NameChangeFormContractDefinition = {
  formCode: 'CA-DL-44',
  label: 'California DMV DL-44',
  fieldSpecs: [
    { fieldKey: 'applicant.currentFirstName', label: 'Current first name', sourceTargetField: 'applicant.current_first_name' },
    { fieldKey: 'applicant.currentMiddleName', label: 'Current middle name', sourceTargetField: 'applicant.current_middle_name', required: false },
    { fieldKey: 'applicant.currentLastName', label: 'Current last name', sourceTargetField: 'applicant.current_last_name' },
    { fieldKey: 'applicant.newFirstName', label: 'New first name', sourceTargetField: 'applicant.target_first_name' },
    { fieldKey: 'applicant.newMiddleName', label: 'New middle name', sourceTargetField: 'applicant.target_middle_name', required: false },
    { fieldKey: 'applicant.newLastName', label: 'New last name', sourceTargetField: 'applicant.target_last_name' },
    { fieldKey: 'applicant.county', label: 'County', sourceTargetField: 'applicant.county' },
    { fieldKey: 'legal.marriageDate', label: 'Marriage date', sourceTargetField: 'legal.marriage_date' },
    { fieldKey: 'legal.marriageCertificateNumber', label: 'Marriage certificate number', sourceTargetField: 'legal.marriage_certificate_number', required: false },
    { fieldKey: 'legal.marriageIssuingAuthority', label: 'Marriage certificate issuing authority', sourceTargetField: 'legal.marriage_issuing_authority', required: false },
  ],
};

export const NAME_CHANGE_DMV_OFFICIAL_SOURCE: NameChangeOfficialFormSource = {
  formCode: 'CA-DL-44',
  formLabel: NAME_CHANGE_DMV_FORM_CONTRACT.label,
  officialUrl: 'https://www.dmv.ca.gov/portal/driver-licenses-identification-cards/dl-id-online-app-edl-44/',
  officialFormsIndexUrl: 'https://www.dmv.ca.gov/portal/driver-licenses-identification-cards/dl-id-online-app-edl-44/',
  officialRevisionLabel: 'CA DMV DL/ID online application',
  lastCheckedAt: '2026-05-20',
  verificationStatus: 'verified_current',
  submissionNote: 'This prepares a review draft only. The user must complete the DMV application and finish the transaction with DMV instructions.',
};

export const NAME_CHANGE_DMV_FIELD_GUIDANCE: Record<string, NameChangeFormCompanionFieldGuidance> = {
  'applicant.currentFirstName': {
    section: 'Current DMV record name',
    officialFieldLabel: 'Current first name',
    userInstruction: 'Use this where the DMV application asks for the first name currently tied to the license or ID record.',
  },
  'applicant.currentMiddleName': {
    section: 'Current DMV record name',
    officialFieldLabel: 'Current middle name',
    userInstruction: 'Use this only if the DMV application asks for a middle name or middle initial.',
  },
  'applicant.currentLastName': {
    section: 'Current DMV record name',
    officialFieldLabel: 'Current last name',
    userInstruction: 'Use this where the DMV application asks for the last name currently tied to the license or ID record.',
  },
  'applicant.newFirstName': {
    section: 'Updated DMV record name',
    officialFieldLabel: 'New first name',
    userInstruction: 'Put this in the first-name field for the name that should appear on the updated license or ID.',
  },
  'applicant.newMiddleName': {
    section: 'Updated DMV record name',
    officialFieldLabel: 'New middle name',
    userInstruction: 'Use this only if the updated license or ID should include a middle name or initial.',
  },
  'applicant.newLastName': {
    section: 'Updated DMV record name',
    officialFieldLabel: 'New last name',
    userInstruction: 'Put this in the last-name field for the name that should appear on the updated license or ID.',
    reviewHint: 'Check that this matches the certified legal proof before going to the DMV field office.',
  },
  'applicant.county': {
    section: 'Residency and jurisdiction',
    officialFieldLabel: 'County of residence',
    userInstruction: 'Use this if the DMV application asks for county or residence jurisdiction.',
  },
  'legal.marriageDate': {
    section: 'Name-change proof',
    officialFieldLabel: 'Marriage date',
    userInstruction: 'Use this if the DMV application or field office asks when the legal name-change event happened.',
  },
  'legal.marriageCertificateNumber': {
    section: 'Name-change proof',
    officialFieldLabel: 'Marriage certificate number',
    userInstruction: 'Use this only if the DMV flow or employee asks for the certified record number.',
  },
  'legal.marriageIssuingAuthority': {
    section: 'Name-change proof',
    officialFieldLabel: 'Certificate issuing authority',
    userInstruction: 'Use this when the DMV flow or field office asks which clerk, recorder, or authority issued the certified proof.',
  },
};

export function buildNameChangeDmvFormSnapshot(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeFormPayloadSnapshot {
  return buildNameChangeFormPayloadSnapshot(NAME_CHANGE_DMV_FORM_CONTRACT, profile, documents, extractedFields);
}

export function buildNameChangeDmvFormCompanion(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeFormCompanion {
  return buildNameChangeFormCompanion(
    buildNameChangeDmvFormSnapshot(profile, documents, extractedFields),
    NAME_CHANGE_DMV_OFFICIAL_SOURCE,
    NAME_CHANGE_DMV_FIELD_GUIDANCE,
  );
}
