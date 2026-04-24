import { buildNameChangeFormPayloadSnapshot, type NameChangeFormContractDefinition } from './formContract';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExtractedFieldInput,
  NameChangeFormPayloadSnapshot,
} from './types';

export const NAME_CHANGE_COURT_ORDER_PACKET_CONTRACT: NameChangeFormContractDefinition = {
  formCode: 'COURT-ORDER-PATH-REVIEW',
  label: 'Court-order name change path review packet',
  fieldSpecs: [
    { fieldKey: 'case.currentFirstName', label: 'Current first name', sourceTargetField: 'applicant.current_first_name' },
    { fieldKey: 'case.currentMiddleName', label: 'Current middle name', sourceTargetField: 'applicant.current_middle_name', required: false },
    { fieldKey: 'case.currentLastName', label: 'Current last name', sourceTargetField: 'applicant.current_last_name' },
    { fieldKey: 'case.targetFirstName', label: 'Target first name', sourceTargetField: 'applicant.target_first_name' },
    { fieldKey: 'case.targetMiddleName', label: 'Target middle name', sourceTargetField: 'applicant.target_middle_name', required: false },
    { fieldKey: 'case.targetLastName', label: 'Target last name', sourceTargetField: 'applicant.target_last_name' },
    { fieldKey: 'case.caseNumber', label: 'Court-order case number', sourceTargetField: 'legal.court_order_case_number', required: false },
    { fieldKey: 'case.orderDate', label: 'Court-order signed date', sourceTargetField: 'legal.court_order_date', required: false },
    { fieldKey: 'residence.county', label: 'County', sourceTargetField: 'applicant.county', required: false },
  ],
};

export function buildNameChangeCourtOrderPacketSnapshot(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeFormPayloadSnapshot {
  return buildNameChangeFormPayloadSnapshot(NAME_CHANGE_COURT_ORDER_PACKET_CONTRACT, profile, documents, extractedFields);
}
