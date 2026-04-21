import { buildNameChangeAutofillPrepSnapshot } from './autofill';
import { evaluateNameChangeExecutionGates } from './executionGates';
import { buildNameChangeExecutionSequenceSnapshot } from './executionSequence';
import { NAME_CHANGE_FORM_BUILDERS } from './formRegistry';
import { buildNameChangeTargetChecklist } from './targetChecklist';
import { NAME_CHANGE_EXECUTION_TARGETS } from './targets';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExecutionTargetKey,
  NameChangeExtractedFieldInput,
  NameChangePlan,
  NameChangeTargetExecutionSnapshot,
} from './types';

export function buildNameChangeTargetExecutionSnapshot(
  targetKey: NameChangeExecutionTargetKey,
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
  plan: NameChangePlan | null = null,
): NameChangeTargetExecutionSnapshot {
  const target = NAME_CHANGE_EXECUTION_TARGETS[targetKey];
  const autofill = buildNameChangeAutofillPrepSnapshot(profile, documents, extractedFields);
  const sequence = buildNameChangeExecutionSequenceSnapshot(targetKey, profile, documents, extractedFields, plan);
  const checklist = buildNameChangeTargetChecklist(target, profile, documents, extractedFields);
  const formPayload = NAME_CHANGE_FORM_BUILDERS[target.formBuilderKey](profile, documents, extractedFields);
  const gates = evaluateNameChangeExecutionGates(sequence.dependencies, checklist, formPayload);
  const fieldRisks = formPayload.fields
    .filter((field) => !field.value || field.confidence === 'low')
    .map((field) => ({
      fieldKey: field.fieldKey,
      label: field.label,
      severity: field.value ? 'blocking' as const : 'attention' as const,
      reason: field.value
        ? `${field.label} is populated from a low-confidence source and still needs stronger document support.`
        : `${field.label} is still missing from the current packet draft.`,
      source: field.source,
      confidence: field.confidence,
      sourceDocumentKind: field.sourceDocumentKind,
      sourceFieldKey: field.sourceFieldKey,
    }));

  return {
    targetKey,
    targetLabel: target.label,
    ready: gates.ready,
    blockers: gates.blockers,
    recommendedFormCode: formPayload.formCode || target.recommendedFormCode,
    autofillFields: autofill.fields.filter((field) => target.autofillTargetFields.includes(field.targetField)),
    formPayload,
    fieldRisks,
    sequence,
    checklist,
  };
}
