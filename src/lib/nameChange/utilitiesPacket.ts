import { buildNameChangeFormPayloadSnapshot, type NameChangeFormContractDefinition } from './formContract';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExtractedFieldInput,
  NameChangeFormPayloadSnapshot,
} from './types';

export const NAME_CHANGE_UTILITIES_PACKET_CONTRACT: NameChangeFormContractDefinition = {
  formCode: 'UTILITIES-LEASE-RECORD-UPDATE',
  label: 'Utilities / lease / landlord record update packet',
  fieldSpecs: [
    { fieldKey: 'resident.currentFirstName', label: 'Current first name', sourceTargetField: 'applicant.current_first_name' },
    { fieldKey: 'resident.currentMiddleName', label: 'Current middle name', sourceTargetField: 'applicant.current_middle_name', required: false },
    { fieldKey: 'resident.currentLastName', label: 'Current last name', sourceTargetField: 'applicant.current_last_name' },
    { fieldKey: 'resident.newFirstName', label: 'New first name', sourceTargetField: 'applicant.target_first_name' },
    { fieldKey: 'resident.newMiddleName', label: 'New middle name', sourceTargetField: 'applicant.target_middle_name', required: false },
    { fieldKey: 'resident.newLastName', label: 'New last name', sourceTargetField: 'applicant.target_last_name' },
    { fieldKey: 'residence.county', label: 'County', sourceTargetField: 'applicant.county', required: false },
    { fieldKey: 'legal.marriageDate', label: 'Marriage date', sourceTargetField: 'legal.marriage_date', required: false },
  ],
};

export function buildNameChangeUtilitiesPacketSnapshot(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeFormPayloadSnapshot {
  return buildNameChangeFormPayloadSnapshot(NAME_CHANGE_UTILITIES_PACKET_CONTRACT, profile, documents, extractedFields);
}
