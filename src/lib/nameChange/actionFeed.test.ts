import { describe, expect, it } from 'vitest';
import { buildNameChangeActionFeed } from './actionFeed';
import type { NameChangeDocumentRepairQueueItem } from './documentRepairQueue';
import type { NameChangePlan } from './types';
import type { NameChangeReminderAttentionItem, NameChangeTargetExecutionSnapshot } from './types';

function makeTemplate(overrides: Partial<NonNullable<NameChangePlan['summary']['accountUpdateTemplates']>[number]> = {}): NonNullable<NameChangePlan['summary']['accountUpdateTemplates']>[number] {
  return {
    id: 'template-bank',
    audience: 'Bank accounts',
    subject: 'Name change update for banking profile',
    body: 'I can provide certified legal proof.',
    readiness: 'ready',
    readinessLabel: 'The core proof chain is already complete, so this should be a clean confirmation/update pass.',
    dependsOnStepIds: ['institution-banks'],
    proofChecklist: ['Certified legal name-change proof'],
    ...overrides,
  };
}

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
    canonicalConflictCount: 0,
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

function makeReminderAttention(overrides: Partial<NameChangeReminderAttentionItem> = {}): NameChangeReminderAttentionItem {
  return {
    reminderKey: 'reminder-marriage-name-mismatch',
    label: 'Resolve the target legal-name path before filing',
    dependsOnStepId: 'eligibility-proof',
    dependentStepTitle: 'Legal proof eligibility',
    dependentStepExecutionStatus: 'todo',
    reminderStatus: 'pending',
    urgency: 'high',
    priorityTier: 'critical',
    actionability: 'blocked_by_untouched_step',
    suggestedOffsetDays: 0,
    lastTouchedAt: null,
    isStale: true,
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
      laneLabel: 'Social Security Administration unblock',
      urgencyTier: 'elevated',
      urgencyReason: 'document_gap',
    });
  });

  it('shows the primary impacted target on document repair feed items', () => {
    const feed = buildNameChangeActionFeed([], [
      makeRepairItem({
        impactedTargets: ['U.S. Passport'],
        nextActions: [{
          category: 'document',
          label: 'Capture county + certificate number for certified marriage certificate',
          detail: 'Ground the certificate for passport follow-through.',
          documentKind: 'marriage_certificate',
        }],
      }),
    ]);

    expect(feed[0]).toMatchObject({
      origin: 'document_repair',
      title: 'Certified marriage certificate',
      laneLabel: 'U.S. Passport unblock',
      action: expect.objectContaining({
        label: 'Capture county + certificate number for certified marriage certificate',
      }),
    });
  });

  it('routes document-driven execution actions into the matching document repair card', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'passport',
        targetLabel: 'U.S. Passport',
        nextAction: {
          category: 'document',
          label: 'Capture county + certificate number for certified marriage certificate',
          detail: 'Ground the certificate for passport follow-through.',
          documentKind: 'marriage_certificate',
        },
      }),
    ], []);

    expect(feed[0]).toMatchObject({
      origin: 'execution',
      plannerIntent: 'open_document_repair',
      focusTargetId: 'document-marriage_certificate',
      action: expect.objectContaining({
        documentKind: 'marriage_certificate',
      }),
    });
  });

  it('dedupes document-routed execution work when a matching document repair card already exists', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'passport',
        targetLabel: 'U.S. Passport',
        nextAction: {
          category: 'document',
          label: 'Capture county + certificate number for certified marriage certificate',
          detail: 'Ground the certificate for passport follow-through.',
          documentKind: 'marriage_certificate',
        },
      }),
    ], [
      {
        kind: 'marriage_certificate',
        label: 'Certified marriage certificate',
        severity: 'blocking',
        score: 320,
        impactedTargets: ['U.S. Passport'],
        payoffSummary: ['U.S. Passport'],
        nextActions: [{
          category: 'document',
          label: 'Capture county + certificate number for certified marriage certificate',
          detail: 'Ground the certificate for passport follow-through.',
          documentKind: 'marriage_certificate',
        }],
        missingMetadata: [],
        missingExtractionFields: ['county', 'certificate_number'],
      },
    ]);

    expect(feed).toHaveLength(1);
    expect(feed[0]).toMatchObject({
      origin: 'document_repair',
      plannerIntent: 'open_document_repair',
      focusTargetId: 'document-marriage_certificate',
    });
  });

  it('keeps non-document execution actions routed to the execution card', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'dmv',
        targetLabel: 'California DMV',
        nextAction: {
          category: 'dependency',
          label: 'Unblock County / jurisdiction context',
          detail: 'County residence is still missing.',
        },
      }),
    ], []);

    expect(feed[0]).toMatchObject({
      origin: 'execution',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'execution-card-dmv',
    });
  });

  it('routes institutional execution work into the template section when copy-ready output is available', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'banks',
        targetLabel: 'Bank accounts',
        recommendedFormCode: 'BANK',
        nextAction: {
          category: 'review',
          label: 'Confirm bank update packet',
          detail: 'Ready for final bank review.',
        },
        blockers: [],
        ready: true,
        readinessSummary: {
          status: 'ready',
          blockingFieldRisks: 0,
          attentionFieldRisks: 0,
          lowConfidenceFields: 0,
          missingFields: 0,
          documentRepairDebt: 0,
          summaryLabel: 'Ready.',
        },
      }),
    ], [], [], [
      makeTemplate(),
    ]);

    expect(feed[0]).toMatchObject({
      plannerIntent: 'open_account_update_template',
      focusTargetId: 'account-update-template-template-bank',
      laneLabel: 'Bank accounts · ready template',
      action: expect.objectContaining({
        detail: expect.stringContaining('clean confirmation/update pass'),
      }),
    });
  });

  it('routes blocked institutional work into the readiness-aware template when intake guidance is still useful', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'insurance',
        targetLabel: 'Insurance carriers',
        recommendedFormCode: 'INS',
        nextAction: {
          category: 'dependency',
          label: 'Unblock insurance follow-through',
          detail: 'Need legal proof first.',
        },
      }),
    ], [], [], [
      makeTemplate({
        id: 'template-insurance',
        audience: 'Insurance carriers',
        readiness: 'blocked',
        readinessLabel: 'The legal-proof chain is still too early, so use this to learn the intake path now and wait to send documents until the upstream proof is real.',
      }),
    ]);

    expect(feed[0]).toMatchObject({
      plannerIntent: 'open_account_update_template',
      focusTargetId: 'account-update-template-template-insurance',
      laneLabel: 'Insurance carriers · blocked template',
      action: expect.objectContaining({
        detail: expect.stringContaining('learn the intake path now'),
      }),
    });
  });

  it('routes tax and voter follow-through into the tax template once proof is usable', () => {
    const taxTemplate = makeTemplate({
      id: 'template-tax',
      audience: 'Tax and state agencies',
      readiness: 'in_progress',
      readinessLabel: 'SSA and payroll tax alignment are already moving, so this is ready to draft.',
    });

    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'taxes',
        targetLabel: 'Tax records',
        recommendedFormCode: 'TAX',
        nextAction: {
          category: 'review',
          label: 'Queue tax agency update',
          detail: 'Tax packet can be prepped now.',
        },
        ready: true,
        blockers: [],
        readinessSummary: {
          status: 'ready',
          blockingFieldRisks: 0,
          attentionFieldRisks: 0,
          lowConfidenceFields: 0,
          missingFields: 0,
          documentRepairDebt: 0,
          summaryLabel: 'Ready.',
        },
      }),
      makeExecutionSnapshot({
        targetKey: 'voter',
        targetLabel: 'Voter registration',
        recommendedFormCode: 'VOTE',
        nextAction: {
          category: 'review',
          label: 'Prep voter/state update',
          detail: 'State-agency packet can be prepped now.',
        },
        ready: true,
        blockers: [],
        readinessSummary: {
          status: 'ready',
          blockingFieldRisks: 0,
          attentionFieldRisks: 0,
          lowConfidenceFields: 0,
          missingFields: 0,
          documentRepairDebt: 0,
          summaryLabel: 'Ready.',
        },
      }),
    ], [], [], [taxTemplate]);

    expect(feed.find((item) => item.title === 'Tax records')).toMatchObject({
      plannerIntent: 'open_account_update_template',
      focusTargetId: 'account-update-template-template-tax',
      laneLabel: 'Tax and state agencies · in progress template',
      action: expect.objectContaining({ detail: expect.stringContaining('ready to draft') }),
    });
    expect(feed.find((item) => item.title === 'Voter registration')).toMatchObject({
      plannerIntent: 'open_account_update_template',
      focusTargetId: 'account-update-template-template-tax',
      laneLabel: 'Tax and state agencies · in progress template',
    });
  });

  it('routes medical follow-through into the insurance template when the proof packet is reusable', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'medical',
        targetLabel: 'Medical records',
        recommendedFormCode: 'MED',
        nextAction: {
          category: 'review',
          label: 'Prep medical record update',
          detail: 'Medical packet can be queued now.',
        },
        ready: true,
        blockers: [],
        readinessSummary: {
          status: 'ready',
          blockingFieldRisks: 0,
          attentionFieldRisks: 0,
          lowConfidenceFields: 0,
          missingFields: 0,
          documentRepairDebt: 0,
          summaryLabel: 'Ready.',
        },
      }),
    ], [], [], [
      makeTemplate({ id: 'template-insurance', audience: 'Insurance and medical', readiness: 'ready' }),
    ]);

    expect(feed[0]).toMatchObject({
      plannerIntent: 'open_account_update_template',
      focusTargetId: 'account-update-template-template-insurance',
      laneLabel: 'Insurance and medical · ready template',
    });
  });

  it('routes utility follow-through into the blocked digital-identity template so intake rules are captured early', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'utilities',
        targetLabel: 'Utilities and phone',
        recommendedFormCode: 'UTIL',
        nextAction: {
          category: 'dependency',
          label: 'Prep utility name-change request',
          detail: 'Need the verification rules before changing billing records.',
        },
      }),
    ], [], [], [
      makeTemplate({
        id: 'template-digital-identity',
        audience: 'Phone, utilities, housing, or primary digital identity support',
        readiness: 'blocked',
        readinessLabel: 'The proof chain is still upstream, so use this to gather verification rules first.',
      }),
    ]);

    expect(feed[0]).toMatchObject({
      plannerIntent: 'open_account_update_template',
      focusTargetId: 'account-update-template-template-digital-identity',
      laneLabel: 'Phone, utilities, housing, or primary digital identity support · blocked template',
      action: expect.objectContaining({
        detail: expect.stringContaining('gather verification rules first'),
      }),
    });
  });

  it('routes legal-name setup blockers to the planner case-setup section', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'ssa',
        targetLabel: 'Social Security Administration',
        blockers: ['Case setup is still missing target middle name.'],
        nextAction: {
          category: 'dependency',
          label: 'Unblock Case legal-name setup complete',
          detail: 'Case setup is still missing target middle name.',
        },
      }),
    ], []);

    expect(feed[0]).toMatchObject({
      origin: 'execution',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'case-setup',
      urgencyReason: 'blocking_dependency',
    });
  });

  it('dedupes multiple execution lanes that all route to the same document repair target', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'passport',
        targetLabel: 'U.S. Passport',
        blockers: ['Missing grounded county + certificate number'],
        nextAction: {
          category: 'document',
          label: 'Capture county + certificate number for certified marriage certificate',
          detail: 'Ground the certificate for passport follow-through.',
          documentKind: 'marriage_certificate',
        },
      }),
      makeExecutionSnapshot({
        targetKey: 'tsa',
        targetLabel: 'TSA PreCheck / travel profiles',
        blockers: ['Missing grounded county + certificate number'],
        nextAction: {
          category: 'document',
          label: 'Capture county + certificate number for certified marriage certificate',
          detail: 'Ground the certificate for travel follow-through.',
          documentKind: 'marriage_certificate',
        },
      }),
    ], []);

    expect(feed).toHaveLength(1);
    expect(feed[0]).toMatchObject({
      origin: 'execution',
      title: 'TSA PreCheck / travel profiles',
      plannerIntent: 'open_document_repair',
      focusTargetId: 'document-marriage_certificate',
      action: expect.objectContaining({
        documentKind: 'marriage_certificate',
      }),
    });
  });

  it('collapses multi-target document repair lane labels into a compact summary', () => {
    const feed = buildNameChangeActionFeed([], [
      makeRepairItem({
        impactedTargets: ['U.S. Passport', 'TSA PreCheck / travel profiles', 'Social Security Administration'],
      }),
    ]);

    expect(feed[0]).toMatchObject({
      laneLabel: 'U.S. Passport +2 more',
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

  it('ranks blocking document-grounding work above packet cleanup when severity is tied', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'ssa',
        targetLabel: 'Social Security Administration',
        nextAction: {
          category: 'packet',
          label: 'Repair Current legal name available for SS-5',
          detail: 'Packet trust is broken.',
        },
        blockers: ['Packet trust is broken.'],
        readinessSummary: {
          status: 'blocked',
          blockingFieldRisks: 0,
          attentionFieldRisks: 0,
          lowConfidenceFields: 0,
          missingFields: 0,
          documentRepairDebt: 0,
          summaryLabel: 'Blocked.',
        },
      }),
      makeExecutionSnapshot({
        targetKey: 'passport',
        targetLabel: 'Passport',
        recommendedFormCode: 'DS-82',
        nextAction: {
          category: 'document',
          label: 'Review court-order proof',
          detail: 'Ground the source document first.',
        },
        blockers: ['Ground the source document first.'],
      }),
    ], []);

    expect(feed[0]).toMatchObject({
      title: 'Passport',
      urgencyReason: 'document_gap',
    });
  });

  it('surfaces reminder attention inside the ranked action feed', () => {
    const feed = buildNameChangeActionFeed([], [], [
      makeReminderAttention(),
    ]);

    expect(feed[0]).toMatchObject({
      origin: 'reminder',
      title: 'Resolve the target legal-name path before filing',
      laneLabel: 'Legal proof eligibility',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'execution-card-ssa',
      urgencyTier: 'critical',
      severity: 'blocking',
      sectionKey: 'cleanup',
    });
  });

  it('routes case legal-name setup reminders to the planner case-setup section', () => {
    const feed = buildNameChangeActionFeed([], [], [
      makeReminderAttention({
        reminderKey: 'reminder-case-legal-name-setup',
        label: 'Finish case legal-name setup before downstream filing',
      }),
    ]);

    expect(feed[0]).toMatchObject({
      origin: 'reminder',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'case-setup',
      sectionKey: 'cleanup',
    });
  });

  it('routes institution reminders to their institutional execution cards', () => {
    const feed = buildNameChangeActionFeed([], [], [
      makeReminderAttention({
        reminderKey: 'reminder-banks',
        label: 'Follow up on banks',
        dependsOnStepId: 'institution-banks',
        dependentStepTitle: 'Bank accounts',
        sectionKey: 'institutional',
        plannerIntent: 'open_execution_card',
        focusTargetId: 'execution-card-banks',
      }),
    ]);

    expect(feed[0]).toMatchObject({
      origin: 'reminder',
      plannerIntent: 'open_execution_card',
      focusTargetId: 'execution-card-banks',
      sectionKey: 'institutional',
    });
  });

  it('keeps critical reminder attention above lower-ranked ready execution work', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        ready: true,
        blockers: [],
        targetKey: 'passport',
        targetLabel: 'U.S. Passport',
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
    ], [], [
      makeReminderAttention({
        reminderKey: 'reminder-travel-bookings',
        label: 'Lock travel bookings to the current passport name until DS-82 timing is clear',
        dependsOnStepId: 'federal-passport',
        dependentStepTitle: 'U.S. passport',
        actionability: 'actionable_now',
      }),
    ]);

    expect(feed[0]).toMatchObject({
      origin: 'reminder',
      focusTargetId: 'execution-card-passport',
      sectionKey: 'core-government',
    });
  });
});
