import { buildNameChangeAutofillPrepSnapshot } from './autofill';
import { buildNameChangeDocumentIntakeSnapshot } from './documentContract';
import { buildNameChangeDmvFormSnapshot } from './dmvForm';
import { evaluateNameChangeRequirements } from './requirements';
import type {
  NameChangeAutofillFieldMapping,
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExtractedFieldInput,
  NameChangeFormPayloadSnapshot,
} from './types';

export interface NameChangeDmvExecutionSnapshot {
  ready: boolean;
  blockers: string[];
  recommendedFormCode: 'CA-DL-44';
  autofillFields: NameChangeAutofillFieldMapping[];
  formPayload: NameChangeFormPayloadSnapshot;
  checklist: Array<{
    label: string;
    status: 'ready' | 'missing' | 'attention';
    reason: string;
  }>;
}

type DmvChecklistStatus = NameChangeDmvExecutionSnapshot['checklist'][number]['status'];

function fieldByTarget(fields: NameChangeAutofillFieldMapping[], targetField: string) {
  return fields.find((field) => field.targetField === targetField);
}

export function buildNameChangeDmvExecutionSnapshot(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeDmvExecutionSnapshot {
  const requirements = evaluateNameChangeRequirements(profile, documents, extractedFields);
  const intake = buildNameChangeDocumentIntakeSnapshot(profile, documents, extractedFields);
  const autofill = buildNameChangeAutofillPrepSnapshot(profile, documents, extractedFields);
  const formPayload = buildNameChangeDmvFormSnapshot(profile, documents, extractedFields);

  const legalProof = requirements.results.find((result) => result.key === 'legal-proof-document');
  const countyContext = requirements.results.find((result) => result.key === 'county-context');
  const currentFirstName = fieldByTarget(autofill.fields, 'applicant.current_first_name');
  const currentLastName = fieldByTarget(autofill.fields, 'applicant.current_last_name');
  const targetLastName = fieldByTarget(autofill.fields, 'applicant.target_last_name');
  const countyField = fieldByTarget(autofill.fields, 'applicant.county');

  const hasCaliforniaIdDocument = intake.documents.some((document) =>
    ['current_drivers_license', 'proof_of_address'].includes(document.kind) && document.intakeStatus !== 'not_started',
  );

  const checklist: NameChangeDmvExecutionSnapshot['checklist'] = [
    {
      label: 'Legal proof ready for DMV',
      status: (legalProof?.status === 'satisfied' ? 'ready' : legalProof?.status === 'attention' ? 'attention' : 'missing') as DmvChecklistStatus,
      reason: legalProof?.reason ?? 'Legal proof requirement not evaluated.',
    },
    {
      label: 'California county context available',
      status: (countyContext?.status === 'satisfied' ? 'ready' : 'missing') as DmvChecklistStatus,
      reason: countyContext?.reason ?? 'County context requirement not evaluated.',
    },
    {
      label: 'Current legal name available for DMV prep',
      status: (currentFirstName?.value.value && currentLastName?.value.value ? 'ready' : 'missing') as DmvChecklistStatus,
      reason: currentFirstName?.value.value && currentLastName?.value.value
        ? 'Current legal first and last name are available for DMV preparation.'
        : 'Current legal name fields are still incomplete for DMV preparation.',
    },
    {
      label: 'Target surname + county available',
      status: (targetLastName?.value.value && countyField?.value.value ? 'ready' : 'missing') as DmvChecklistStatus,
      reason: targetLastName?.value.value && countyField?.value.value
        ? 'Target surname and county are available for DMV preparation.'
        : 'Target surname and/or county are still missing for DMV preparation.',
    },
    {
      label: 'California DMV supporting intake',
      status: (hasCaliforniaIdDocument ? 'ready' : 'attention') as DmvChecklistStatus,
      reason: hasCaliforniaIdDocument
        ? 'A current California-facing ID or address document exists in intake.'
        : 'No California-facing ID/address support document is represented in intake yet.',
    },
  ];

  const blockers = checklist.filter((item) => item.status === 'missing').map((item) => item.reason);

  return {
    ready: blockers.length === 0,
    blockers,
    recommendedFormCode: 'CA-DL-44',
    autofillFields: autofill.fields.filter((field) => [
      'applicant.current_first_name',
      'applicant.current_middle_name',
      'applicant.current_last_name',
      'applicant.target_last_name',
      'applicant.county',
      'legal.marriage_date',
    ].includes(field.targetField)),
    formPayload,
    checklist,
  };
}
