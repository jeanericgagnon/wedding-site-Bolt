import { buildNameChangeFormPayloadSnapshot, type NameChangeFormContractDefinition } from './formContract';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExtractedFieldInput,
  NameChangeFormPayloadSnapshot,
} from './types';

export const NAME_CHANGE_TAX_PACKET_CONTRACT: NameChangeFormContractDefinition = {
  formCode: 'TAX-SSA-STATE-ALIGNMENT-PACKET',
  label: 'IRS and state tax identity alignment packet',
  fieldSpecs: [
    { fieldKey: 'taxpayer.currentFirstName', label: 'Current first name', sourceTargetField: 'applicant.current_first_name' },
    { fieldKey: 'taxpayer.currentMiddleName', label: 'Current middle name', sourceTargetField: 'applicant.current_middle_name', required: false },
    { fieldKey: 'taxpayer.currentLastName', label: 'Current last name', sourceTargetField: 'applicant.current_last_name' },
    { fieldKey: 'taxpayer.newFirstName', label: 'New first name', sourceTargetField: 'applicant.target_first_name' },
    { fieldKey: 'taxpayer.newMiddleName', label: 'New middle name', sourceTargetField: 'applicant.target_middle_name', required: false },
    { fieldKey: 'taxpayer.newLastName', label: 'New last name', sourceTargetField: 'applicant.target_last_name' },
    { fieldKey: 'legal.marriageDate', label: 'Marriage date', sourceTargetField: 'legal.marriage_date', required: false },
    { fieldKey: 'legal.marriageCertificateNumber', label: 'Marriage certificate number', sourceTargetField: 'legal.marriage_certificate_number', required: false },
    { fieldKey: 'legal.marriageIssuingAuthority', label: 'Marriage certificate issuing authority', sourceTargetField: 'legal.marriage_issuing_authority', required: false },
    { fieldKey: 'residence.county', label: 'County / state tax jurisdiction context', sourceTargetField: 'applicant.county', required: false },
  ],
};

export function buildNameChangeTaxPacketSnapshot(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeFormPayloadSnapshot {
  return buildNameChangeFormPayloadSnapshot(NAME_CHANGE_TAX_PACKET_CONTRACT, profile, documents, extractedFields);
}
