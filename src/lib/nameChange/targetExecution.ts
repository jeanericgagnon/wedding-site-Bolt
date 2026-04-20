import { buildNameChangeAutofillPrepSnapshot } from './autofill';
import { evaluateNameChangeExecutionGates } from './executionGates';
import { buildNameChangeExecutionSequenceSnapshot } from './executionSequence';
import { buildNameChangeTargetChecklist } from './targetChecklist';
import { NAME_CHANGE_EXECUTION_TARGETS } from './targets';
import { buildNameChangeSs5FormSnapshot } from './ss5Form';
import { buildNameChangeDmvFormSnapshot } from './dmvForm';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExtractedFieldInput,
  NameChangeFormPayloadSnapshot,
  NameChangePlan,
  NameChangeTargetExecutionSnapshot,
} from './types';

function buildTargetFormPayload(
  formBuilderKey: 'ss5' | 'dmv',
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeFormPayloadSnapshot {
  return formBuilderKey === 'ss5'
    ? buildNameChangeSs5FormSnapshot(profile, documents, extractedFields)
    : buildNameChangeDmvFormSnapshot(profile, documents, extractedFields);
}

export function buildNameChangeTargetExecutionSnapshot(
  targetKey: 'ssa' | 'dmv',
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
  plan: NameChangePlan | null = null,
): NameChangeTargetExecutionSnapshot {
  const target = NAME_CHANGE_EXECUTION_TARGETS[targetKey];
  const autofill = buildNameChangeAutofillPrepSnapshot(profile, documents, extractedFields);
  const sequence = buildNameChangeExecutionSequenceSnapshot(targetKey, profile, documents, extractedFields, plan);
  const checklist = buildNameChangeTargetChecklist(target, profile, documents, extractedFields);
  const formPayload = buildTargetFormPayload(target.formBuilderKey, profile, documents, extractedFields);
  const gates = evaluateNameChangeExecutionGates(sequence.dependencies, checklist);

  return {
    targetKey,
    targetLabel: target.label,
    ready: gates.ready,
    blockers: gates.blockers,
    recommendedFormCode: target.recommendedFormCode,
    autofillFields: autofill.fields.filter((field) => target.autofillTargetFields.includes(field.targetField)),
    formPayload,
    sequence,
    checklist,
  };
}
