import { buildNameChangeFormPayloadSnapshot, type NameChangeFormContractDefinition } from './formContract';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExtractedFieldInput,
  NameChangeFormPayloadSnapshot,
} from './types';

export const NAME_CHANGE_MEDICAL_PACKET_CONTRACT: NameChangeFormContractDefinition = {
  formCode: 'MEDICAL-PROVIDER-RECORD-UPDATE',
  label: 'Medical provider / insurance card record update packet',
  fieldSpecs: [
    { fieldKey: 'patient.currentFirstName', label: 'Current first name', sourceTargetField: 'applicant.current_first_name' },
    { fieldKey: 'patient.currentMiddleName', label: 'Current middle name', sourceTargetField: 'applicant.current_middle_name', required: false },
    { fieldKey: 'patient.currentLastName', label: 'Current last name', sourceTargetField: 'applicant.current_last_name' },
    { fieldKey: 'patient.newFirstName', label: 'New first name', sourceTargetField: 'applicant.target_first_name' },
    { fieldKey: 'patient.newMiddleName', label: 'New middle name', sourceTargetField: 'applicant.target_middle_name', required: false },
    { fieldKey: 'patient.newLastName', label: 'New last name', sourceTargetField: 'applicant.target_last_name' },
    { fieldKey: 'residence.county', label: 'County', sourceTargetField: 'applicant.county', required: false },
    { fieldKey: 'legal.marriageDate', label: 'Marriage date', sourceTargetField: 'legal.marriage_date', required: false },
  ],
};

export function buildNameChangeMedicalPacketSnapshot(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeFormPayloadSnapshot {
  return buildNameChangeFormPayloadSnapshot(NAME_CHANGE_MEDICAL_PACKET_CONTRACT, profile, documents, extractedFields);
}
