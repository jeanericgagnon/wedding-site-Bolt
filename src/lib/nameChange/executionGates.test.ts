import { describe, expect, it } from 'vitest';
import { evaluateNameChangeExecutionGates } from './executionGates';
import type { NameChangeExecutionDependency, NameChangeTargetExecutionSnapshot } from './types';

describe('name change execution gates', () => {
  it('collects blockers from required missing dependencies and checklist items', () => {
    const dependencies: NameChangeExecutionDependency[] = [
      {
        key: 'dep-1',
        label: 'Dependency 1',
        required: true,
        status: 'missing',
        reason: 'Dependency blocker',
      },
    ];
    const checklist: NameChangeTargetExecutionSnapshot['checklist'] = [
      {
        key: 'item-1',
        label: 'Checklist item',
        status: 'missing',
        reason: 'Checklist blocker',
      },
    ];

    const result = evaluateNameChangeExecutionGates(dependencies, checklist);
    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual(['Dependency blocker', 'Checklist blocker']);
  });

  it('tracks attention separately from blockers when the attention is advisory', () => {
    const dependencies: NameChangeExecutionDependency[] = [
      {
        key: 'dep-1',
        label: 'Dependency 1',
        required: false,
        status: 'attention',
        reason: 'Dependency attention',
      },
    ];
    const checklist: NameChangeTargetExecutionSnapshot['checklist'] = [
      {
        key: 'item-1',
        label: 'Checklist item',
        status: 'attention',
        reason: 'Checklist attention',
      },
    ];

    const result = evaluateNameChangeExecutionGates(dependencies, checklist);
    expect(result.ready).toBe(true);
    expect(result.blockers).toEqual([]);
    expect(result.attentionItems).toEqual(['Dependency attention', 'Checklist attention']);
  });
});
