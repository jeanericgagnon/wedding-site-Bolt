import { buildNameChangeFormPayloadSnapshot, type NameChangeFormContractDefinition } from './formContract';
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
  ],
};

export function buildNameChangeDmvFormSnapshot(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeFormPayloadSnapshot {
  return buildNameChangeFormPayloadSnapshot(NAME_CHANGE_DMV_FORM_CONTRACT, profile, documents, extractedFields);
}
