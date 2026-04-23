import type {
  NameChangeExecutionDependency,
  NameChangeExecutionGateSnapshot,
  NameChangeFormPayloadSnapshot,
  NameChangeTargetExecutionSnapshot,
} from './types';

export type NameChangeChecklistItem = NameChangeTargetExecutionSnapshot['checklist'][number];

export function evaluateNameChangeExecutionGates(
  dependencies: NameChangeExecutionDependency[],
  checklist: NameChangeChecklistItem[],
  formPayload?: NameChangeFormPayloadSnapshot,
): NameChangeExecutionGateSnapshot {
  const lowConfidenceFields = (formPayload?.fields ?? []).filter((field) => field.required && field.value && field.confidence === 'low');
  const blockers = [
    ...dependencies.filter((dependency) => dependency.blocksReady ?? (dependency.required && dependency.status === 'missing')).map((dependency) => dependency.reason),
    ...checklist.filter((item) => item.status === 'missing').map((item) => item.reason),
    ...checklist
      .filter((item) => item.status === 'attention' && item.blocksReady)
      .map((item) => item.reason),
    ...lowConfidenceFields.map((field) => `${field.label} is populated from a low-confidence source and still needs stronger document support.`),
  ];

  const attentionItems = [
    ...dependencies.filter((dependency) => dependency.status === 'attention').map((dependency) => dependency.reason),
    ...checklist
      .filter((item) => item.status === 'attention' && !item.blocksReady)
      .map((item) => item.reason),
    ...lowConfidenceFields.map((field) => `${field.label} should be reviewed before treating this packet as execution-ready.`),
  ];

  return {
    ready: blockers.length === 0,
    blockers,
    attentionItems,
  };
}
