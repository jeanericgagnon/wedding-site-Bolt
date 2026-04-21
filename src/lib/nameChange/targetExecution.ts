import { buildNameChangeAutofillPrepSnapshot } from './autofill';
import { evaluateNameChangeExecutionGates } from './executionGates';
import { buildNameChangeExecutionSequenceSnapshot } from './executionSequence';
import { buildNameChangeExtractionContractSnapshot } from './extractionContract';
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
  const extraction = buildNameChangeExtractionContractSnapshot(profile, documents, extractedFields);
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
  const blockingFieldRisks = fieldRisks.filter((risk) => risk.severity === 'blocking').length;
  const attentionFieldRisks = fieldRisks.filter((risk) => risk.severity === 'attention').length;
  const lowConfidenceFields = formPayload.fields.filter((field) => field.value && field.confidence === 'low').length;
  const missingFields = formPayload.fields.filter((field) => !field.value).length;
  const documentRepairDebt = new Set([
    ...fieldRisks
      .map((risk) => risk.sourceDocumentKind)
      .filter((kind): kind is NonNullable<typeof kind> => Boolean(kind)),
    ...target.checklistSpecs
      .filter((spec) => spec.kind === 'document_support')
      .filter((spec) => checklist.find((item) => item.key === spec.key)?.status !== 'ready')
      .map((spec) => spec.key),
  ]).size;
  const firstBlockingFieldRisk = fieldRisks.find((risk) => risk.severity === 'blocking');
  const firstMissingFieldRisk = fieldRisks.find((risk) => risk.severity === 'attention');
  const firstMissingDependency = sequence.dependencies.find((dependency) => dependency.required && dependency.status === 'missing');
  const firstAttentionDependency = sequence.dependencies.find((dependency) => dependency.status === 'attention');
  const firstMissingChecklistItem = checklist.find((item) => item.status === 'missing');
  const blockingAttentionChecklistKeys = new Set(['canonical-extraction-alignment']);
  const firstBlockingAttentionChecklistItem = checklist.find((item) => item.status === 'attention' && blockingAttentionChecklistKeys.has(item.key));
  const primaryCanonicalConflict = extraction.conflicts[0] ?? null;
  const firstAttentionChecklistItem = checklist.find((item) => item.status === 'attention');
  const buildCourtOrderNextAction = () => {
    const referenceExtractionDependency = sequence.dependencies.find((dependency) => dependency.key === 'court-order-reference-extraction' && dependency.status === 'missing');
    if (referenceExtractionDependency) {
      return {
        category: 'document' as const,
        label: 'Capture court-order reference fields',
        detail: referenceExtractionDependency.reason,
      };
    }

    const jurisdictionDependency = sequence.dependencies.find((dependency) => dependency.key === 'court-order-jurisdiction-context' && dependency.status === 'missing');
    if (jurisdictionDependency) {
      return {
        category: 'dependency' as const,
        label: 'Ground court-order jurisdiction review',
        detail: jurisdictionDependency.reason,
      };
    }

    const readinessChecklistItem = checklist.find((item) => item.key === 'court-order-path-readiness' && item.status === 'attention');
    if (readinessChecklistItem) {
      return {
        category: 'review' as const,
        label: 'Review court-order path readiness',
        detail: readinessChecklistItem.reason,
      };
    }

    return null;
  };
  const courtOrderNextAction = targetKey === 'courtOrder' ? buildCourtOrderNextAction() : null;
  const nextAction = firstBlockingFieldRisk
    ? {
        category: 'packet' as const,
        label: `Repair ${firstBlockingFieldRisk.label}`,
        detail: firstBlockingFieldRisk.reason,
      }
    : courtOrderNextAction
      ? courtOrderNextAction
    : firstMissingDependency
      ? {
          category: firstMissingDependency.key.includes('support') || firstMissingDependency.key.includes('document') ? 'document' as const : 'dependency' as const,
          label: `Unblock ${firstMissingDependency.label}`,
          detail: firstMissingDependency.reason,
        }
      : firstMissingChecklistItem
        ? {
            category: firstMissingChecklistItem.key.includes('support') || firstMissingChecklistItem.key.includes('document') ? 'document' as const : 'checklist' as const,
            label: `Complete ${firstMissingChecklistItem.label}`,
            detail: firstMissingChecklistItem.reason,
          }
        : firstBlockingAttentionChecklistItem
          ? {
              category: firstBlockingAttentionChecklistItem.key.includes('alignment') ? 'document' as const : 'review' as const,
              label: primaryCanonicalConflict
                ? `Resolve ${primaryCanonicalConflict.documentKind.replace(/_/g, ' ')} conflict`
                : `${firstBlockingAttentionChecklistItem.key.includes('alignment') ? 'Unblock' : 'Review'} ${firstBlockingAttentionChecklistItem.label}`,
              detail: primaryCanonicalConflict
                ? primaryCanonicalConflict.reason
                : firstBlockingAttentionChecklistItem.reason,
            }
          : firstMissingFieldRisk
          ? {
              category: firstMissingFieldRisk.sourceDocumentKind ? 'document' as const : 'packet' as const,
              label: `Fill ${firstMissingFieldRisk.label}`,
              detail: firstMissingFieldRisk.reason,
            }
          : firstAttentionDependency
            ? {
                category: 'review' as const,
                label: `Review ${firstAttentionDependency.label}`,
                detail: firstAttentionDependency.reason,
              }
            : firstAttentionChecklistItem
              ? {
                  category: firstAttentionChecklistItem.key.includes('support') || firstAttentionChecklistItem.key.includes('document') ? 'document' as const : 'review' as const,
                  label: `Review ${firstAttentionChecklistItem.label}`,
                  detail: firstAttentionChecklistItem.reason,
                }
              : {
                  category: 'review' as const,
                  label: `Prepare ${formPayload.formCode || target.recommendedFormCode}`,
                  detail: 'Packet is execution-ready. Final review and submission prep can move now.',
                };
  const readinessSummary = {
    status: gates.ready ? 'ready' as const : blockingFieldRisks > 0 || gates.blockers.length > 0 ? 'blocked' as const : 'attention' as const,
    blockingFieldRisks,
    attentionFieldRisks,
    lowConfidenceFields,
    missingFields,
    documentRepairDebt,
    summaryLabel: gates.ready
      ? 'Packet is execution-ready.'
      : blockingFieldRisks > 0
        ? `${blockingFieldRisks} blocking packet field risk${blockingFieldRisks === 1 ? '' : 's'} still need repair.`
        : missingFields > 0
          ? `${missingFields} packet field${missingFields === 1 ? '' : 's'} still missing.`
          : `${gates.blockers.length} non-field blocker${gates.blockers.length === 1 ? '' : 's'} still open.`,
  };

  return {
    targetKey,
    targetLabel: target.label,
    ready: gates.ready,
    blockers: gates.blockers,
    nextAction,
    readinessSummary,
    recommendedFormCode: formPayload.formCode || target.recommendedFormCode,
    autofillFields: autofill.fields.filter((field) => target.autofillTargetFields.includes(field.targetField)),
    formPayload,
    fieldRisks,
    sequence,
    checklist,
  };
}
