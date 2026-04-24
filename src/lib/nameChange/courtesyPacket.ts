import { buildNameChangeFormPayloadSnapshot, type NameChangeFormContractDefinition } from './formContract';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExtractedFieldInput,
  NameChangeFormPayloadSnapshot,
} from './types';

export const NAME_CHANGE_COURTESY_PACKET_CONTRACT: NameChangeFormContractDefinition = {
  formCode: 'COURTESY-SOCIAL-IDENTITY-SYNC',
  label: 'Courtesy / social identity sync packet',
  fieldSpecs: [
    { fieldKey: 'profile.currentFirstName', label: 'Current first name', sourceTargetField: 'applicant.current_first_name' },
    { fieldKey: 'profile.currentLastName', label: 'Current last name', sourceTargetField: 'applicant.current_last_name' },
    { fieldKey: 'profile.newFirstName', label: 'New first name', sourceTargetField: 'applicant.target_first_name' },
    { fieldKey: 'profile.newLastName', label: 'New last name', sourceTargetField: 'applicant.target_last_name' },
    { fieldKey: 'residence.county', label: 'County', sourceTargetField: 'applicant.county', required: false },
  ],
};

export function buildNameChangeCourtesyPacketSnapshot(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeFormPayloadSnapshot {
  return buildNameChangeFormPayloadSnapshot(NAME_CHANGE_COURTESY_PACKET_CONTRACT, profile, documents, extractedFields);
}
