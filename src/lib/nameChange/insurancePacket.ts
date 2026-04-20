import { buildNameChangeFormPayloadSnapshot, type NameChangeFormContractDefinition } from './formContract';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExtractedFieldInput,
  NameChangeFormPayloadSnapshot,
} from './types';

export const NAME_CHANGE_INSURANCE_PACKET_CONTRACT: NameChangeFormContractDefinition = {
  formCode: 'INSURANCE-POLICY-UPDATE-PACKET',
  label: 'Insurance policy update packet',
  fieldSpecs: [
    { fieldKey: 'policyHolder.currentFirstName', label: 'Current first name', sourceTargetField: 'applicant.current_first_name' },
    { fieldKey: 'policyHolder.currentLastName', label: 'Current last name', sourceTargetField: 'applicant.current_last_name' },
    { fieldKey: 'policyHolder.newLastName', label: 'New last name', sourceTargetField: 'applicant.target_last_name' },
    { fieldKey: 'legal.marriageDate', label: 'Marriage date', sourceTargetField: 'legal.marriage_date', required: false },
    { fieldKey: 'residence.county', label: 'County', sourceTargetField: 'applicant.county', required: false },
  ],
};

export function buildNameChangeInsurancePacketSnapshot(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeFormPayloadSnapshot {
  return buildNameChangeFormPayloadSnapshot(NAME_CHANGE_INSURANCE_PACKET_CONTRACT, profile, documents, extractedFields);
}
