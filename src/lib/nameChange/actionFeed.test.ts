import { describe, expect, it } from 'vitest';
import { buildNameChangeActionFeed } from './actionFeed';
import type { NameChangeDocumentRepairQueueItem } from './documentRepairQueue';
import type { NameChangeTargetExecutionSnapshot } from './types';

function makeExecutionSnapshot(overrides: Partial<NameChangeTargetExecutionSnapshot> = {}): NameChangeTargetExecutionSnapshot {
  return {
    targetKey: 'ssa',
    targetLabel: 'Social Security Administration',
    ready: false,
    blockers: ['Need legal proof'],
    nextAction: {
      category: 'dependency',
      label: 'Unblock Legal proof document ready',
      detail: 'Need legal proof.',
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
      blockers: ['Need legal proof'],
      dependencies: [],
    },
    checklist: [],
    ...overrides,
  };
}

function makeRepairItem(overrides: Partial<NameChangeDocumentRepairQueueItem> = {}): NameChangeDocumentRepairQueueItem {
  return {
    kind: 'marriage_certificate',
    label: 'Certified marriage certificate',
    severity: 'blocking',
    score: 120,
    impactSummary: 'not started',
    payoffSummary: 'restores a missing required artifact',
    nextActions: [{
      category: 'document',
      label: 'Add certified marriage certificate to intake',
      detail: 'Capture baseline metadata so this document can support downstream packets.',
    }],
    impactedTargets: ['Social Security Administration'],
    impactedFields: [],
    blockingRiskCount: 0,
    attentionRiskCount: 0,
    metadataMissing: [],
    missingExtractionFields: [],
    intakeStatus: 'not_started',
    required: true,
    ...overrides,
  };
}

describe('name change action feed', () => {
  it('merges execution and document repair actions into one ranked feed', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot(),
    ], [
      makeRepairItem(),
    ]);

    expect(feed).toHaveLength(2);
    expect(feed.map((item) => item.origin)).toEqual(expect.arrayContaining(['execution', 'document_repair']));
    expect(feed.map((item) => item.focusTargetId)).toEqual(expect.arrayContaining(['execution-card-ssa', 'document-marriage_certificate']));
    expect(feed.map((item) => item.plannerIntent)).toEqual(expect.arrayContaining(['open_execution_card', 'open_document_repair']));
    expect(feed.map((item) => item.sectionKey)).toEqual(expect.arrayContaining(['core-government', 'documents']));
    expect(feed.map((item) => item.urgencyTier)).toEqual(expect.arrayContaining(['elevated']));
    expect(feed.map((item) => item.urgencyReason)).toEqual(expect.arrayContaining(['blocking_dependency', 'document_gap']));
  });

  it('keeps higher-severity execution work above ready review work', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'ssa',
        targetLabel: 'Social Security Administration',
        ready: false,
        blockers: ['Need legal proof'],
      }),
      makeExecutionSnapshot({
        targetKey: 'passport',
        targetLabel: 'Passport',
        ready: true,
        blockers: [],
        nextAction: {
          category: 'review',
          label: 'Prepare DS-82',
          detail: 'Ready for final review.',
        },
        readinessSummary: {
          status: 'ready',
          blockingFieldRisks: 0,
          attentionFieldRisks: 0,
          lowConfidenceFields: 0,
          missingFields: 0,
          documentRepairDebt: 0,
          summaryLabel: 'Ready.',
        },
        recommendedFormCode: 'DS-82',
      }),
    ], []);

    expect(feed[0]?.title).toBe('Social Security Administration');
  });

  it('uses document repair score when ranking document-origin actions', () => {
    const feed = buildNameChangeActionFeed([], [
      makeRepairItem({ label: 'Passport', kind: 'current_passport', score: 110 }),
      makeRepairItem({ label: 'Certified marriage certificate', kind: 'marriage_certificate', score: 140 }),
    ]);

    expect(feed[0]).toMatchObject({
      origin: 'document_repair',
      title: 'Certified marriage certificate',
      sectionKey: 'documents',
      urgencyTier: 'elevated',
      urgencyReason: 'document_gap',
    });
  });

  it('promotes very high-scoring blocking items to critical urgency', () => {
    const feed = buildNameChangeActionFeed([], [
      makeRepairItem({ score: 320, severity: 'blocking' }),
    ]);

    expect(feed[0]).toMatchObject({ urgencyTier: 'critical' });
  });

  it('marks packet repair actions with packet-trust urgency reason', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        nextAction: {
          category: 'packet',
          label: 'Repair New last name',
          detail: 'Low-confidence packet field.',
        },
        blockers: ['Low-confidence packet field.'],
        readinessSummary: {
          status: 'blocked',
          blockingFieldRisks: 1,
          attentionFieldRisks: 0,
          lowConfidenceFields: 1,
          missingFields: 0,
          documentRepairDebt: 1,
          summaryLabel: 'Blocked.',
        },
      }),
    ], []);

    expect(feed[0]).toMatchObject({ urgencyReason: 'packet_trust' });
  });
});
