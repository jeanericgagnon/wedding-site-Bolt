import { describe, expect, it } from 'vitest';
import { getHighestPriorityNameChangeExecutionCard, getNameChangeGuidedActionWeight, rankNameChangeExecutionCards } from './executionPrioritization';
import type { NameChangeTargetExecutionSnapshot } from './types';

function makeSnapshot(overrides: Partial<NameChangeTargetExecutionSnapshot> = {}): NameChangeTargetExecutionSnapshot {
  return {
    targetKey: 'ssa',
    targetLabel: 'Social Security Administration',
    ready: false,
    blockers: [],
    nextAction: {
      category: 'review',
      label: 'Review packet',
      detail: 'Review packet detail.',
    },
    readinessSummary: {
      status: 'blocked',
      blockingFieldRisks: 0,
      attentionFieldRisks: 0,
      lowConfidenceFields: 0,
      missingFields: 0,
      documentRepairDebt: 0,
      summaryLabel: 'Blocked.',
    },
    recommendedFormCode: 'SSA-SS5',
    autofillFields: [],
    formPayload: {
      formCode: 'SSA-SS5',
      fields: [],
      summary: {
        ready: 0,
        missing: 0,
        trustedReady: 0,
        lowConfidence: 0,
        extractedBacked: 0,
      },
    },
    fieldRisks: [],
    sequence: {
      target: 'ssa',
      lane: 'federal',
      ready: false,
      blockers: [],
      dependencies: [],
    },
    checklist: [],
    ...overrides,
  } as unknown as NameChangeTargetExecutionSnapshot;
}

describe('name change execution prioritization', () => {
  it('keeps guided action weights in descending urgency order', () => {
    expect(getNameChangeGuidedActionWeight('document')).toBeGreaterThan(getNameChangeGuidedActionWeight('dependency'));
    expect(getNameChangeGuidedActionWeight('dependency')).toBeGreaterThan(getNameChangeGuidedActionWeight('packet'));
    expect(getNameChangeGuidedActionWeight('packet')).toBeGreaterThan(getNameChangeGuidedActionWeight('checklist'));
    expect(getNameChangeGuidedActionWeight('checklist')).toBeGreaterThan(getNameChangeGuidedActionWeight('review'));
  });

  it('prefers blocked cards over already-ready cards', () => {
    const ranked = rankNameChangeExecutionCards([
      { key: 'ready-card', title: 'Ready card', snapshot: makeSnapshot({ ready: true, blockers: [], nextAction: { category: 'review', label: 'Prepare SSA-SS5', detail: 'Ready.' } }) },
      { key: 'blocked-card', title: 'Blocked card', snapshot: makeSnapshot({ ready: false, blockers: ['Need legal proof'], nextAction: { category: 'dependency', label: 'Unblock Legal proof', detail: 'Need legal proof.' } }) },
    ]);

    expect(ranked[0]?.key).toBe('blocked-card');
  });

  it('breaks blocker ties using next-action urgency instead of arbitrary card order', () => {
    const top = getHighestPriorityNameChangeExecutionCard([
      { key: 'packet-card', title: 'Packet card', snapshot: makeSnapshot({ blockers: ['Need work'], nextAction: { category: 'packet', label: 'Repair passport issue date', detail: 'Packet trust is broken.' } }) },
      { key: 'document-card', title: 'Document card', snapshot: makeSnapshot({ blockers: ['Need work'], nextAction: { category: 'document', label: 'Review court-order proof', detail: 'Ground the source document first.' } }) },
    ]);

    expect(top?.key).toBe('document-card');
  });

  it('falls back to attention load when readiness, blockers, and action category are tied', () => {
    const top = getHighestPriorityNameChangeExecutionCard([
      {
        key: 'lighter-card',
        title: 'Lighter card',
        snapshot: makeSnapshot({
          blockers: ['Need review'],
          nextAction: { category: 'review', label: 'Review card', detail: 'Needs review.' },
          checklist: [{ key: 'a', label: 'A', kind: 'requirement', status: 'attention', reason: 'One attention item.' }],
        }),
      },
      {
        key: 'heavier-card',
        title: 'Heavier card',
        snapshot: makeSnapshot({
          blockers: ['Need review'],
          nextAction: { category: 'review', label: 'Review card', detail: 'Needs review.' },
          checklist: [
            { key: 'a', label: 'A', kind: 'requirement', status: 'attention', reason: 'One attention item.' },
            { key: 'b', label: 'B', kind: 'requirement', status: 'attention', reason: 'Another attention item.' },
          ],
        }),
      },
    ]);

    expect(top?.key).toBe('heavier-card');
  });
});
