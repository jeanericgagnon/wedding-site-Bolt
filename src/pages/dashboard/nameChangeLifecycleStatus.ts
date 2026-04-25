import type { NameChangePlan } from '../../lib/nameChange/types';

export type NameChangeLifecycleStatus = 'ready' | 'in_progress' | 'complete';

export function deriveNameChangeLifecycleStatus(plan: NameChangePlan): NameChangeLifecycleStatus {
  const executionCounts = plan.summary.executionCounts ?? { todo: plan.steps.length, in_progress: 0, complete: 0 };
  if (executionCounts.complete > 0 && executionCounts.todo === 0 && executionCounts.in_progress === 0) {
    return 'complete';
  }
  if (executionCounts.in_progress > 0 || executionCounts.complete > 0) {
    return 'in_progress';
  }
  return 'ready';
}
