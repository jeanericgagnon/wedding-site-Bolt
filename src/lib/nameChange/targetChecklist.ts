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
      if (spec.key === 'current-legal-name') {
        const first = autofill.fields.find((field) => field.targetField === 'applicant.current_first_name');
        const last = autofill.fields.find((field) => field.targetField === 'applicant.current_last_name');
        const ready = Boolean(first?.value.value && last?.value.value);
        return {
          key: spec.key,
          label: spec.label,
          status: ready ? 'ready' : 'missing',
          reason: ready ? spec.satisfiedReason : spec.missingReason,
        } satisfies NameChangeTargetChecklistItem;
      }

      if (spec.key === 'target-surname-county') {
        const targetLast = autofill.fields.find((field) => field.targetField === 'applicant.target_last_name');
        const county = autofill.fields.find((field) => field.targetField === 'applicant.county');
        const ready = Boolean(targetLast?.value.value && county?.value.value);
        return {
          key: spec.key,
          label: spec.label,
          status: ready ? 'ready' : 'missing',
          reason: ready ? spec.satisfiedReason : spec.missingReason,
        } satisfies NameChangeTargetChecklistItem;
      }

      const field = autofill.fields.find((candidate) => candidate.targetField === spec.targetField);
      return {
        key: spec.key,
        label: spec.label,
        status: field?.value.value ? 'ready' : 'missing',
        reason: field?.value.value ? spec.satisfiedReason : spec.missingReason,
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
