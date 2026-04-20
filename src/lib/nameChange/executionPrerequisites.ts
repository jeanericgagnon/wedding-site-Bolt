import type {
  NameChangeExecutionDependency,
  NameChangeExecutionPrerequisiteRule,
  NameChangePlan,
} from './types';

export function evaluateNameChangeExecutionPrerequisites(
  rules: NameChangeExecutionPrerequisiteRule[],
  plan: NameChangePlan | null,
): NameChangeExecutionDependency[] {
  return rules.map((rule) => {
    const step = plan?.steps.find((candidate) => candidate.id === rule.requiredStepId);
    const status = step?.executionStatus ?? 'todo';

    if (rule.requiredStatuses.includes(status)) {
      return {
        key: rule.key,
        label: rule.label,
        required: rule.required,
        status: 'satisfied',
        reason: rule.satisfiedReason,
      } satisfies NameChangeExecutionDependency;
    }

    if (status === 'in_progress' && rule.attentionReason) {
      return {
        key: rule.key,
        label: rule.label,
        required: rule.required,
        status: 'attention',
        reason: rule.attentionReason,
      } satisfies NameChangeExecutionDependency;
    }

    return {
      key: rule.key,
      label: rule.label,
      required: rule.required,
      status: 'missing',
      reason: rule.missingReason,
    } satisfies NameChangeExecutionDependency;
  });
}
