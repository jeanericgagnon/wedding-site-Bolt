import type { NameChangeGuidedAction, NameChangeTargetExecutionSnapshot } from './types';

export interface NameChangeExecutionPriorityInput {
  key: string;
  title: string;
  snapshot: Pick<NameChangeTargetExecutionSnapshot, 'ready' | 'blockers' | 'checklist' | 'nextAction'>;
}

export function getNameChangeGuidedActionWeight(category: NameChangeGuidedAction['category']) {
  switch (category) {
    case 'packet':
      return 5;
    case 'dependency':
      return 4;
    case 'document':
      return 3;
    case 'checklist':
      return 2;
    case 'review':
    default:
      return 1;
  }
}

export function rankNameChangeExecutionCards(cards: NameChangeExecutionPriorityInput[]): NameChangeExecutionPriorityInput[] {
  return [...cards].sort((left, right) => {
    if (left.snapshot.ready !== right.snapshot.ready) return Number(left.snapshot.ready) - Number(right.snapshot.ready);

    const leftBlockers = left.snapshot.blockers.length;
    const rightBlockers = right.snapshot.blockers.length;
    if (leftBlockers !== rightBlockers) return rightBlockers - leftBlockers;

    const leftActionWeight = getNameChangeGuidedActionWeight(left.snapshot.nextAction.category);
    const rightActionWeight = getNameChangeGuidedActionWeight(right.snapshot.nextAction.category);
    if (leftActionWeight !== rightActionWeight) return rightActionWeight - leftActionWeight;

    const leftAttention = left.snapshot.checklist.filter((item) => item.status === 'attention').length;
    const rightAttention = right.snapshot.checklist.filter((item) => item.status === 'attention').length;
    if (leftAttention !== rightAttention) return rightAttention - leftAttention;

    return left.title.localeCompare(right.title);
  });
}

export function getHighestPriorityNameChangeExecutionCard(cards: NameChangeExecutionPriorityInput[]): NameChangeExecutionPriorityInput | null {
  return rankNameChangeExecutionCards(cards)[0] ?? null;
}
