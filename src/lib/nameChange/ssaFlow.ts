import { buildNameChangeAutofillPrepSnapshot } from './autofill';
import { buildNameChangeDocumentIntakeSnapshot } from './documentContract';
import { buildNameChangeExecutionSequenceSnapshot } from './executionSequence';
import { evaluateNameChangeRequirements } from './requirements';
import { buildNameChangeSs5FormSnapshot } from './ss5Form';
import { buildNameChangeTargetChecklist } from './targetChecklist';
import { NAME_CHANGE_EXECUTION_TARGETS } from './targets';
import type {
  NameChangeAutofillFieldMapping,
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExecutionSequenceSnapshot,
  NameChangeExtractedFieldInput,
  NameChangeFormPayloadSnapshot,
  NameChangePlan,
} from './types';

export interface NameChangeSsaExecutionSnapshot {
  ready: boolean;
  blockers: string[];
  recommendedFormCode: 'SSA-SS5';
  autofillFields: NameChangeAutofillFieldMapping[];
  formPayload: NameChangeFormPayloadSnapshot;
  sequence: NameChangeExecutionSequenceSnapshot;
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
  plan: NameChangePlan | null = null,
): NameChangeSsaExecutionSnapshot {
  const autofill = buildNameChangeAutofillPrepSnapshot(profile, documents, extractedFields);
  const formPayload = buildNameChangeSs5FormSnapshot(profile, documents, extractedFields);
  const sequence = buildNameChangeExecutionSequenceSnapshot('ssa', profile, documents, extractedFields, plan);
  const checklist = buildNameChangeTargetChecklist(NAME_CHANGE_EXECUTION_TARGETS.ssa, profile, documents, extractedFields) as NameChangeSsaExecutionSnapshot['checklist'];

  const blockers = [
    ...sequence.blockers,
    ...checklist.filter((item) => item.status === 'missing').map((item) => item.reason),
  ];

  return {
    ready: blockers.length === 0,
    blockers,
    recommendedFormCode: 'SSA-SS5',
    autofillFields: autofill.fields.filter((field) => NAME_CHANGE_EXECUTION_TARGETS.ssa.autofillTargetFields.includes(field.targetField)),
    formPayload,
    sequence,
    checklist,
  };
}
