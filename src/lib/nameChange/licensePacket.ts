import { buildNameChangeFormPayloadSnapshot, type NameChangeFormContractDefinition } from './formContract';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExtractedFieldInput,
  NameChangeFormPayloadSnapshot,
} from './types';

export const NAME_CHANGE_LICENSE_PACKET_CONTRACT: NameChangeFormContractDefinition = {
  formCode: 'PROFESSIONAL-LICENSE-UPDATE-PACKET',
  label: 'Professional license / certification update packet',
  fieldSpecs: [
    { fieldKey: 'licenseHolder.currentFirstName', label: 'Current first name', sourceTargetField: 'applicant.current_first_name' },
    { fieldKey: 'licenseHolder.currentMiddleName', label: 'Current middle name', sourceTargetField: 'applicant.current_middle_name', required: false },
    { fieldKey: 'licenseHolder.currentLastName', label: 'Current last name', sourceTargetField: 'applicant.current_last_name' },
    { fieldKey: 'licenseHolder.newFirstName', label: 'New first name', sourceTargetField: 'applicant.target_first_name' },
    { fieldKey: 'licenseHolder.newMiddleName', label: 'New middle name', sourceTargetField: 'applicant.target_middle_name', required: false },
    { fieldKey: 'licenseHolder.newLastName', label: 'New last name', sourceTargetField: 'applicant.target_last_name' },
    { fieldKey: 'legal.marriageCertificateNumber', label: 'Marriage certificate number', sourceTargetField: 'legal.marriage_certificate_number', required: false },
    { fieldKey: 'legal.marriageIssuingAuthority', label: 'Marriage certificate issuing authority', sourceTargetField: 'legal.marriage_issuing_authority', required: false },
    { fieldKey: 'residence.county', label: 'County', sourceTargetField: 'applicant.county', required: false },
  ],
};

export function buildNameChangeLicensePacketSnapshot(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeFormPayloadSnapshot {
  return buildNameChangeFormPayloadSnapshot(NAME_CHANGE_LICENSE_PACKET_CONTRACT, profile, documents, extractedFields);
}
