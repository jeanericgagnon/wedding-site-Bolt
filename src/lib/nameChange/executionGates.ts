import type {
  NameChangeExecutionDependency,
  NameChangeExecutionGateSnapshot,
  NameChangeTargetExecutionSnapshot,
} from './types';

export type NameChangeChecklistItem = NameChangeTargetExecutionSnapshot['checklist'][number];

export function evaluateNameChangeExecutionGates(
  dependencies: NameChangeExecutionDependency[],
  checklist: NameChangeChecklistItem[],
): NameChangeExecutionGateSnapshot {
  const blockers = [
    ...dependencies.filter((dependency) => dependency.required && dependency.status === 'missing').map((dependency) => dependency.reason),
    ...checklist.filter((item) => item.status === 'missing').map((item) => item.reason),
  ];

  const attentionItems = [
    ...dependencies.filter((dependency) => dependency.status === 'attention').map((dependency) => dependency.reason),
    ...checklist.filter((item) => item.status === 'attention').map((item) => item.reason),
  ];

  return {
    ready: blockers.length === 0,
    blockers,
    attentionItems,
  };
}
