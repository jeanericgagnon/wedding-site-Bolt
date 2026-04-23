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
  kind: 'requirement' | 'field_presence' | 'document_support';
  nextActionCategory?: 'packet' | 'checklist' | 'document' | 'review';
  blocksReady?: boolean;
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
        kind: spec.kind,
        nextActionCategory: spec.nextActionCategory,
        blocksReady: spec.blocksReady,
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
      const matchedFields = targetFields.map((targetField) => autofill.fields.find((candidate) => candidate.targetField === targetField));
      const allPresent = targetFields.length > 0 && matchedFields.every((field) => Boolean(field?.value.value));
      const allTrusted = allPresent && matchedFields.every((field) => field?.value.confidence !== 'low');

      return {
        key: spec.key,
        label: spec.label,
        kind: spec.kind,
        nextActionCategory: spec.nextActionCategory,
        blocksReady: spec.blocksReady,
        status: !allPresent ? 'missing' : allTrusted ? 'ready' : 'attention',
        reason: !allPresent
          ? spec.missingReason
          : allTrusted
            ? spec.satisfiedReason
            : spec.attentionReason ?? `${spec.label} is populated, but at least one field still comes from a low-confidence source.`,
      } satisfies NameChangeTargetChecklistItem;
    }

    const supported = intake.documents.some((document) => spec.documentKinds?.includes(document.kind) && document.intakeStatus !== 'not_started');
    return {
      key: spec.key,
      label: spec.label,
      kind: spec.kind,
      nextActionCategory: spec.nextActionCategory,
      blocksReady: spec.blocksReady,
      status: supported ? 'ready' : 'attention',
      reason: supported ? spec.satisfiedReason : spec.missingReason,
    } satisfies NameChangeTargetChecklistItem;
  });
}
