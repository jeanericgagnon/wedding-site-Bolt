import { buildNameChangeFormPayloadSnapshot, type NameChangeFormContractDefinition } from './formContract';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExtractedFieldInput,
  NameChangeFormPayloadSnapshot,
} from './types';

export const NAME_CHANGE_TSA_PACKET_CONTRACT: NameChangeFormContractDefinition = {
  formCode: 'TSA-TRAVEL-PROFILE-UPDATE',
  label: 'TSA PreCheck / travel profile update packet',
  fieldSpecs: [
    { fieldKey: 'traveler.currentFirstName', label: 'Current first name', sourceTargetField: 'applicant.current_first_name' },
    { fieldKey: 'traveler.currentLastName', label: 'Current last name', sourceTargetField: 'applicant.current_last_name' },
    { fieldKey: 'traveler.newLastName', label: 'New last name', sourceTargetField: 'applicant.target_last_name' },
    { fieldKey: 'identity.passportIssueDate', label: 'Passport issue date', sourceTargetField: 'identity.passport_issue_date', required: false },
  ],
};

export function buildNameChangeTsaPacketSnapshot(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeFormPayloadSnapshot {
  return buildNameChangeFormPayloadSnapshot(NAME_CHANGE_TSA_PACKET_CONTRACT, profile, documents, extractedFields);
}
