import { buildNameChangeAutofillPrepSnapshot } from './autofill';
import { buildNameChangeDocumentIntakeSnapshot } from './documentContract';
import { evaluateNameChangeRequirements } from './requirements';
import { buildNameChangeSs5FormSnapshot } from './ss5Form';
import type {
  NameChangeAutofillFieldMapping,
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExtractedFieldInput,
  NameChangeFormPayloadSnapshot,
} from './types';

export interface NameChangeSsaExecutionSnapshot {
  ready: boolean;
  blockers: string[];
  recommendedFormCode: 'SSA-SS5';
  autofillFields: NameChangeAutofillFieldMapping[];
  formPayload: NameChangeFormPayloadSnapshot;
  checklist: Array<{
    label: string;
    status: 'ready' | 'missing' | 'attention';
    reason: string;
  }>;
}

type SsaChecklistStatus = NameChangeSsaExecutionSnapshot['checklist'][number]['status'];

function fieldByTarget(fields: NameChangeAutofillFieldMapping[], targetField: string) {
  return fields.find((field) => field.targetField === targetField);
}

export function buildNameChangeSsaExecutionSnapshot(
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeSsaExecutionSnapshot {
  const requirements = evaluateNameChangeRequirements(profile, documents, extractedFields);
  const intake = buildNameChangeDocumentIntakeSnapshot(profile, documents, extractedFields);
  const autofill = buildNameChangeAutofillPrepSnapshot(profile, documents, extractedFields);
  const formPayload = buildNameChangeSs5FormSnapshot(profile, documents, extractedFields);

  const legalProof = requirements.results.find((result) => result.key === 'legal-proof-document');
  const identityCoverage = requirements.results.find((result) => result.key === 'identity-document-coverage');
  const firstNameField = fieldByTarget(autofill.fields, 'applicant.current_first_name');
  const lastNameField = fieldByTarget(autofill.fields, 'applicant.current_last_name');
  const targetLastNameField = fieldByTarget(autofill.fields, 'applicant.target_last_name');

  const checklist: NameChangeSsaExecutionSnapshot['checklist'] = [
    {
      label: 'Legal proof ready for SSA',
      status: (legalProof?.status === 'satisfied' ? 'ready' : legalProof?.status === 'attention' ? 'attention' : 'missing') as SsaChecklistStatus,
      reason: legalProof?.reason ?? 'Legal proof requirement not evaluated.',
    },
    {
      label: 'Identity document coverage',
      status: (identityCoverage?.status === 'satisfied' ? 'ready' : identityCoverage?.status === 'attention' ? 'attention' : 'missing') as SsaChecklistStatus,
      reason: identityCoverage?.reason ?? 'Identity coverage requirement not evaluated.',
    },
    {
      label: 'Current legal name available for SS-5',
      status: (firstNameField?.value.value && lastNameField?.value.value ? 'ready' : 'missing') as SsaChecklistStatus,
      reason: firstNameField?.value.value && lastNameField?.value.value
        ? 'Current first and last name are available for SS-5 preparation.'
        : 'Current legal name fields are still incomplete for SS-5 preparation.',
    },
    {
      label: 'Target surname available for SS-5',
      status: (targetLastNameField?.value.value ? 'ready' : 'missing') as SsaChecklistStatus,
      reason: targetLastNameField?.value.value
        ? 'Target last name is available for SS-5 preparation.'
        : 'Target last name is still missing for SS-5 preparation.',
    },
    {
      label: 'SSA supporting document intake',
      status: (intake.documents.some((document) => ['current_drivers_license', 'current_passport', 'social_security_card'].includes(document.kind) && document.intakeStatus !== 'not_started')
        ? 'ready'
        : 'attention') as SsaChecklistStatus,
      reason: intake.documents.some((document) => ['current_drivers_license', 'current_passport', 'social_security_card'].includes(document.kind) && document.intakeStatus !== 'not_started')
        ? 'An SSA-supporting identity document exists in intake.'
        : 'No SSA-supporting identity document is represented in intake yet.',
    },
  ];

  const blockers = checklist.filter((item) => item.status === 'missing').map((item) => item.reason);

  return {
    ready: blockers.length === 0,
    blockers,
    recommendedFormCode: 'SSA-SS5',
    autofillFields: autofill.fields.filter((field) => [
      'applicant.current_first_name',
      'applicant.current_middle_name',
      'applicant.current_last_name',
      'applicant.target_last_name',
      'legal.marriage_date',
    ].includes(field.targetField)),
    formPayload,
    checklist,
  };
}
