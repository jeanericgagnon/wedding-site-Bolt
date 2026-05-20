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
        kind: 'requirement',
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
        blocksReady: false,
      },
    ];
    const checklist: NameChangeTargetExecutionSnapshot['checklist'] = [
      {
        key: 'item-1',
        label: 'Checklist item',
        kind: 'requirement',
        status: 'attention',
        blocksReady: false,
        reason: 'Checklist attention',
      },
    ];

    const result = evaluateNameChangeExecutionGates(dependencies, checklist);
    expect(result.ready).toBe(true);
    expect(result.blockers).toEqual([]);
    expect(result.attentionItems).toEqual(['Dependency attention', 'Checklist attention']);
  });

  it('treats blocking dependency attention as a blocker while preserving the attention signal', () => {
    const dependencies: NameChangeExecutionDependency[] = [
      {
        key: 'dep-1',
        label: 'Dependency 1',
        required: true,
        status: 'attention',
        reason: 'Dependency attention blocker',
        blocksReady: true,
      },
    ];

    const result = evaluateNameChangeExecutionGates(dependencies, []);
    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual(['Dependency attention blocker']);
    expect(result.attentionItems).toEqual(['Dependency attention blocker']);
  });

  it('ignores optional low-confidence form fields when deciding packet readiness', () => {
    const result = evaluateNameChangeExecutionGates([], [], {
      formCode: 'TEST',
      formLabel: 'Test form',
      fields: [
        {
          fieldKey: 'optional.issueDate',
          label: 'Optional issue date',
          required: false,
          value: '2024-06-01',
          source: 'extracted_field',
          confidence: 'low',
        },
      ],
      summary: {
        ready: 0,
        missing: 0,
        trustedReady: 0,
        lowConfidence: 0,
        extractedBacked: 1,
      },
    });

    expect(result.ready).toBe(true);
    expect(result.blockers).toEqual([]);
    expect(result.attentionItems).toEqual([]);
  });

  it('treats canonical extraction alignment drift as a blocker', () => {
    const result = evaluateNameChangeExecutionGates([], [
      {
        key: 'canonical-extraction-alignment',
        label: 'Canonical vs extracted values aligned',
        kind: 'field_presence',
        status: 'attention',
        blocksReady: true,
        reason: 'Structured case truth and extracted document values still disagree.',
      },
    ]);

    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual(['Structured case truth and extracted document values still disagree.']);
    expect(result.attentionItems).toEqual([]);
  });
});
