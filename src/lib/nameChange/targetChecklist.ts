import { buildNameChangeAutofillPrepSnapshot } from './autofill';
import { buildNameChangeDocumentIntakeSnapshot } from './documentContract';
import { evaluateNameChangeRequirements } from './requirements';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExecutionTargetDefinition,
  NameChangeExtractedFieldInput,
} from './types';

export type NameChangeTargetChecklistItem = {
  key: string;
  label: string;
  status: 'ready' | 'missing' | 'attention';
  reason: string;
};

export function buildNameChangeTargetChecklist(
  target: NameChangeExecutionTargetDefinition,
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeTargetChecklistItem[] {
  const requirements = evaluateNameChangeRequirements(profile, documents, extractedFields);
  const intake = buildNameChangeDocumentIntakeSnapshot(profile, documents, extractedFields);
  const autofill = buildNameChangeAutofillPrepSnapshot(profile, documents, extractedFields);

  return target.checklistSpecs.map((spec) => {
    if (spec.kind === 'requirement') {
      const requirement = requirements.results.find((result) => result.key === spec.requirementKey);
      return {
        key: spec.key,
        label: spec.label,
        status: requirement?.status === 'satisfied' ? 'ready' : requirement?.status === 'attention' ? 'attention' : 'missing',
        reason: requirement?.reason ?? spec.missingReason,
      } satisfies NameChangeTargetChecklistItem;
    }

    if (spec.kind === 'field_presence') {
      const targetFields = spec.targetFields?.length
        ? spec.targetFields
        : spec.targetField
          ? [spec.targetField]
          : [];
      const ready = targetFields.length > 0
        && targetFields.every((targetField) => {
          const field = autofill.fields.find((candidate) => candidate.targetField === targetField);
          return Boolean(field?.value.value);
        });

      return {
        key: spec.key,
        label: spec.label,
        status: ready ? 'ready' : 'missing',
        reason: ready ? spec.satisfiedReason : spec.missingReason,
      } satisfies NameChangeTargetChecklistItem;
    }

    const supported = intake.documents.some((document) => spec.documentKinds?.includes(document.kind) && document.intakeStatus !== 'not_started');
    return {
      key: spec.key,
      label: spec.label,
      status: supported ? 'ready' : 'attention',
      reason: supported ? spec.satisfiedReason : spec.missingReason,
    } satisfies NameChangeTargetChecklistItem;
  });
}
