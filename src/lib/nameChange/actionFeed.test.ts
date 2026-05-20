import { describe, expect, it } from 'vitest';
import {
  buildNameChangeActionFeed,
  ensureTerminalPeriod,
  formatAccountUpdateTemplateBlockerLine,
  formatBlockingProofHopStatePhrase,
  formatInlineProofList,
  getAccountUpdateTemplateAudienceLine,
  getAccountUpdateTemplateBlockedByLine,
  getAccountUpdateTemplateContextLines,
  getAccountUpdateTemplateCopyButtonLabel,
  getAccountUpdateTemplateStatusLabel,
  getAccountUpdateTemplateStatusLine,
  getAccountUpdateTemplateCurrentBlockerLine,
  getAccountUpdateTemplateChecklistLine,
  getAccountUpdateTemplateChecklistStatusLine,
  getExecutionNextActionDetail,
  getAccountUpdateTemplateMessageLine,
  getAccountUpdateTemplateNextAskLine,
  getAccountUpdateTemplateProofChecklistLine,
  getAccountUpdateTemplateProofDocumentsLine,
  getAccountUpdateTemplateProofStatusLine,
  getAccountUpdateTemplateReadinessDetailLine,
  getAccountUpdateTemplateReadinessLabel,
  getAccountUpdateTemplateReadinessLine,
  getAccountUpdateTemplateStateLine,
  getAccountUpdateTemplateSubjectLine,
  sanitizeAccountUpdateTemplateText,
} from './actionFeed';
import {
  getAccountUpdateTemplateActionLabel as getEngineAccountUpdateTemplateActionLabel,
  getAccountUpdateTemplateCopyLabel as getEngineAccountUpdateTemplateCopyLabel,
  getAccountUpdateTemplateReadinessLabel as getEngineAccountUpdateTemplateReadinessLabel,
  getAccountUpdateTemplateStateLine as getEngineAccountUpdateTemplateStateLine,
  getAccountUpdateTemplateStatusLabel as getEngineAccountUpdateTemplateStatusLabel,
  getDefaultAccountUpdateBlockingProofHopLabel,
} from './engine';
import type { NameChangeDocumentRepairQueueItem } from './documentRepairQueue';
import type { NameChangePlan } from './types';
import type { NameChangeReminderAttentionItem, NameChangeTargetExecutionSnapshot } from './types';

function makeTemplate(overrides: Partial<NonNullable<NameChangePlan['summary']['accountUpdateTemplates']>[number]> = {}): NonNullable<NameChangePlan['summary']['accountUpdateTemplates']>[number] {
  const audience = overrides.audience ?? 'Bank accounts';
  const id = overrides.id ?? 'template-bank';
  const readiness = overrides.readiness ?? 'ready';
  const blockingProofHopLabel = overrides.blockingProofHopLabel
    ?? getDefaultAccountUpdateBlockingProofHopLabel(id, readiness);
  return {
    id,
    audience,
    subject: overrides.subject ?? audience,
    body: 'I can provide certified legal proof.',
    readiness,
    readinessLabel: 'The core proof chain is already complete, so this should be a clean confirmation/update pass.',
    proofReadinessSummary: 'Send with certified legal proof now.',
    blockingProofHopLabel,
    requestSummary: 'Please tell me the fastest secure submission path and confirm whether cards, checks, statements, and my online profile will all update together.',
    dependsOnStepIds: ['institution-banks'],
    proofDocuments: overrides.proofDocuments ?? [overrides.proofChecklist?.[0] ?? 'Certified legal name-change proof'],
    proofChecklist: ['Certified legal name-change proof'],
    checklistHighlight: overrides.checklistHighlight ?? overrides.proofChecklist?.[1],
    checklistStatusNote: overrides.checklistStatusNote,
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
  } as unknown as NameChangeTargetExecutionSnapshot;
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

describe('account update template surface helpers', () => {
  it('keeps blocker state phrases natural without lowercasing acronyms', () => {
    expect(formatBlockingProofHopStatePhrase('Legal proof pending')).toBe('legal proof pending');
    expect(formatBlockingProofHopStatePhrase('SSA pending')).toBe('SSA pending');
    expect(formatBlockingProofHopStatePhrase('DMV receipt pending')).toBe('DMV receipt pending');
  });

  it('deduplicates inline proof summaries by normalized text', () => {
    expect(formatInlineProofList([
      'Certified legal name-change proof.',
      ' certified legal name-change proof ',
      'SSA confirmation',
      'ssa confirmation.',
    ])).toBe('Certified legal name-change proof · SSA confirmation');
  });

  it('normalizes checklist punctuation snippets through one shared helper', () => {
    expect(ensureTerminalPeriod('Already verified')).toBe('Already verified.');
    expect(ensureTerminalPeriod(' .  ')).toBeUndefined();
  });

  it('drops blank account-update template subject and message text through one shared helper', () => {
    expect(sanitizeAccountUpdateTemplateText('  Ready to send  ')).toBe('Ready to send');
    expect(sanitizeAccountUpdateTemplateText(' ... ')).toBeUndefined();
    expect(sanitizeAccountUpdateTemplateText('   ')).toBeUndefined();
  });

  it('formats blocker lines through one shared helper', () => {
    const template = makeTemplate({ readiness: 'upcoming', blockingProofHopLabel: 'SSA pending' });

    expect(formatAccountUpdateTemplateBlockerLine('Blocked by', template)).toBe('Blocked by: SSA pending.');
    expect(formatAccountUpdateTemplateBlockerLine('Current blocker', template)).toBe('Current blocker: SSA pending.');
  });

  it('formats readiness detail lines through one shared helper', () => {
    expect(getAccountUpdateTemplateReadinessDetailLine('Base detail.', makeTemplate({ readiness: 'ready' }))).toBe(
      'Base detail. Send this now with the current proof packet.',
    );
    expect(
      getAccountUpdateTemplateReadinessDetailLine('Base detail.', makeTemplate({ readiness: 'in_progress', blockingProofHopLabel: 'SSA pending' })),
    ).toBe('Base detail. Draft this now, then send it only after SSA pending clears.');
    expect(getAccountUpdateTemplateReadinessDetailLine('Base detail.', makeTemplate({ readiness: 'complete' }))).toBe(
      'Base detail. Use this only to confirm the downstream sync already landed.',
    );
  });

  it('formats subject, message, checklist, proof-status, next-ask, and proof-summary lines through shared helpers', () => {
    const template = makeTemplate({
      subject: 'Send now (proof packet ready): Name change update for banking profile',
      body: 'My proof packet is ready.',
      checklistHighlight: 'Gather the intake path only until legal proof is fully grounded',
      checklistStatusNote: 'Wait to send until legal proof is fully grounded',
      proofReadinessSummary: 'Proof packet ready for bank sync.',
      requestSummary: 'Ask the bank to update the legal name on file.',
      proofChecklist: ['Certified legal name-change proof.', 'Updated photo ID or DMV receipt'],
      proofDocuments: ['Certified legal name-change proof.', 'Updated photo ID or DMV receipt'],
    });

    expect(getAccountUpdateTemplateAudienceLine(template)).toBe('Audience: Bank accounts');
    expect(getAccountUpdateTemplateSubjectLine(template)).toBe(
      'Subject: Send now (proof packet ready): Name change update for banking profile',
    );
    expect(getAccountUpdateTemplateMessageLine(template)).toBe('Template message: My proof packet is ready.');
    expect(getAccountUpdateTemplateChecklistLine(template)).toBe('Checklist: Gather the intake path only until legal proof is fully grounded.');
    expect(getAccountUpdateTemplateChecklistStatusLine(template)).toBe('Checklist status: Wait to send until legal proof is fully grounded.');
    expect(getAccountUpdateTemplateProofStatusLine(template)).toBe('Proof status: Proof packet ready for bank sync.');
    expect(getAccountUpdateTemplateNextAskLine(template)).toBe('Next ask: Ask the bank to update the legal name on file.');
    expect(getAccountUpdateTemplateProofChecklistLine(template)).toBe(
      'Proof checklist: Certified legal name-change proof · Updated photo ID or DMV receipt',
    );
    expect(getAccountUpdateTemplateProofDocumentsLine(template)).toBe(
      'Proof to have handy: Certified legal name-change proof · Updated photo ID or DMV receipt',
    );
    expect(getAccountUpdateTemplateReadinessLine(template)).toBe(
      `Readiness: ${getAccountUpdateTemplateReadinessDetailLine(
        getEngineAccountUpdateTemplateReadinessLabel(template.readiness, template.blockingProofHopLabel),
        template,
      )}`,
    );
    expect(getAccountUpdateTemplateReadinessLine(template, { prefix: false })).toBe(
      getAccountUpdateTemplateReadinessDetailLine(
        getEngineAccountUpdateTemplateReadinessLabel(template.readiness, template.blockingProofHopLabel),
        template,
      ),
    );
    expect(getAccountUpdateTemplateStatusLabel(template)).toBe('send now (proof packet ready)');
    expect(getAccountUpdateTemplateStatusLine(template)).toBe('Status: send now (proof packet ready)');
    expect(getAccountUpdateTemplateContextLines(template, { includeAudience: true, includeStatus: true })).toEqual([
      getAccountUpdateTemplateAudienceLine(template),
      getAccountUpdateTemplateStatusLine(template),
      getAccountUpdateTemplateReadinessLine(template),
      getAccountUpdateTemplateChecklistLine(template)!,
      getAccountUpdateTemplateChecklistStatusLine(template)!,
      getAccountUpdateTemplateStateLine(template)!,
      getAccountUpdateTemplateProofStatusLine(template),
      getAccountUpdateTemplateNextAskLine(template),
      getAccountUpdateTemplateProofChecklistLine(template)!,
      getAccountUpdateTemplateProofDocumentsLine(template)!,
      getAccountUpdateTemplateSubjectLine(template),
      getAccountUpdateTemplateMessageLine(template),
    ]);
    expect(getAccountUpdateTemplateContextLines(template)).toEqual([
      getAccountUpdateTemplateReadinessLine(template),
      getAccountUpdateTemplateChecklistLine(template)!,
      getAccountUpdateTemplateChecklistStatusLine(template)!,
      getAccountUpdateTemplateStateLine(template)!,
      getAccountUpdateTemplateProofStatusLine(template),
      getAccountUpdateTemplateNextAskLine(template),
      getAccountUpdateTemplateProofChecklistLine(template)!,
      getAccountUpdateTemplateProofDocumentsLine(template)!,
      getAccountUpdateTemplateSubjectLine(template),
      getAccountUpdateTemplateMessageLine(template),
    ]);
    expect(
      getAccountUpdateTemplateContextLines(template, {
        includeSubject: false,
        includeMessage: false,
        prefixReadiness: false,
      }),
    ).toEqual([
      getAccountUpdateTemplateReadinessLine(template, { prefix: false }),
      getAccountUpdateTemplateChecklistLine(template)!,
      getAccountUpdateTemplateChecklistStatusLine(template)!,
      getAccountUpdateTemplateStateLine(template)!,
      getAccountUpdateTemplateProofStatusLine(template),
      getAccountUpdateTemplateNextAskLine(template),
      getAccountUpdateTemplateProofChecklistLine(template)!,
      getAccountUpdateTemplateProofDocumentsLine(template)!,
    ]);
  });

  it('keeps planner and feed readiness labels on the engine status copy map', () => {
    expect(getAccountUpdateTemplateReadinessLabel('ready')).toBe(getEngineAccountUpdateTemplateStatusLabel('ready'));
    expect(getAccountUpdateTemplateReadinessLabel('in_progress')).toBe(getEngineAccountUpdateTemplateStatusLabel('in_progress'));
    expect(getAccountUpdateTemplateReadinessLabel('complete')).toBe(getEngineAccountUpdateTemplateStatusLabel('complete'));
    expect(getAccountUpdateTemplateReadinessLabel('upcoming')).toBe(getEngineAccountUpdateTemplateStatusLabel('upcoming'));
    expect(getAccountUpdateTemplateReadinessLabel('blocked')).toBe(getEngineAccountUpdateTemplateStatusLabel('blocked'));
  });

  it('shares copy-button labels for readiness-aware template states', () => {
    expect(getAccountUpdateTemplateCopyButtonLabel(makeTemplate({ readiness: 'ready' }), null)).toBe(
      getEngineAccountUpdateTemplateCopyLabel('ready'),
    );
    expect(getAccountUpdateTemplateCopyButtonLabel(makeTemplate({ readiness: 'complete' }), null)).toBe(
      getEngineAccountUpdateTemplateCopyLabel('complete'),
    );
    expect(getAccountUpdateTemplateCopyButtonLabel(makeTemplate({ readiness: 'in_progress' }), null)).toBe(
      getEngineAccountUpdateTemplateCopyLabel('in_progress'),
    );
    expect(getAccountUpdateTemplateCopyButtonLabel(makeTemplate({ readiness: 'upcoming' }), null)).toBe(
      getEngineAccountUpdateTemplateCopyLabel('upcoming'),
    );
    expect(getAccountUpdateTemplateCopyButtonLabel(makeTemplate({ readiness: 'blocked' }), null)).toBe(
      getEngineAccountUpdateTemplateCopyLabel('blocked'),
    );
    expect(getAccountUpdateTemplateCopyButtonLabel(makeTemplate({ id: 'template-payroll' }), 'template-payroll')).toBe(
      getEngineAccountUpdateTemplateCopyLabel('blocked', true),
    );
  });

  it('keeps template state lines on the engine state helper', () => {
    const template = makeTemplate({
      readiness: 'in_progress',
      blockingProofHopLabel: 'Legal proof pending',
    });

    expect(getAccountUpdateTemplateStateLine(template)).toBe(
      getEngineAccountUpdateTemplateStateLine('in_progress', 'Legal proof pending'),
    );
  });

  it('preserves engine readiness narrative labels on linked templates', () => {
    const template = makeTemplate({
      readiness: 'upcoming',
      readinessLabel: 'stale readiness copy',
      blockingProofHopLabel: 'SSA pending',
    });

    expect(getAccountUpdateTemplateReadinessLine(template, { prefix: false })).toContain(
      getEngineAccountUpdateTemplateReadinessLabel('upcoming', 'SSA pending'),
    );
    expect(getAccountUpdateTemplateReadinessLine(template, { prefix: false })).not.toContain('stale readiness copy');
  });

  it('keeps planner and feed blocker/state copy on the same helpers', () => {
    const stagedTemplate = makeTemplate({
      id: 'template-payroll',
      audience: 'Employer payroll / HR',
      readiness: 'in_progress',
      blockingProofHopLabel: '   ',
    });
    const upcomingTemplate = makeTemplate({
      id: 'template-tax',
      audience: 'Tax agencies',
      readiness: 'upcoming',
      blockingProofHopLabel: 'SSA pending',
    });
    const blockedTemplate = makeTemplate({
      id: 'template-bank',
      audience: 'Bank accounts',
      readiness: 'blocked',
      blockingProofHopLabel: 'Legal proof pending',
    });

    expect(getAccountUpdateTemplateBlockedByLine(stagedTemplate)).toBe('Blocked by: current proof pending.');
    expect(getAccountUpdateTemplateCurrentBlockerLine(stagedTemplate)).toBe('Current blocker: current proof pending.');
    expect(getAccountUpdateTemplateStateLine(stagedTemplate)).toBe('Template state: draft now and wait for the current proof to clear before sending.');
    expect(getAccountUpdateTemplateBlockedByLine(upcomingTemplate)).toBe('Blocked by: SSA pending.');
    expect(getAccountUpdateTemplateCurrentBlockerLine(upcomingTemplate)).toBe('Current blocker: SSA pending.');
    expect(getAccountUpdateTemplateStateLine(upcomingTemplate)).toBe('Template state: prep the ask now and wait for SSA pending to clear before sending.');
    expect(getAccountUpdateTemplateStateLine(blockedTemplate)).toBe('Template state: intake-only until legal proof pending clears.');
  });
});

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
      makeRepairItem({
        kind: 'marriage_certificate',
        label: 'Certified marriage certificate',
        severity: 'blocking',
        score: 320,
        impactedTargets: ['U.S. Passport'],
        payoffSummary: 'U.S. Passport',
        nextActions: [{
          category: 'document',
          label: 'Capture county + certificate number for certified marriage certificate',
          detail: 'Ground the certificate for passport follow-through.',
          documentKind: 'marriage_certificate',
        }],
        metadataMissing: [],
        missingExtractionFields: ['county', 'certificate_number'],
      }),
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
      laneLabel: 'Bank accounts · send now (proof packet ready)',
      urgencyReason: 'packet_trust',
      action: expect.objectContaining({
        label: 'Send bank accounts update (proof packet ready)',
        detail: expect.stringContaining('You have enough upstream proof to send this now. Send this now with the current proof packet.'),
      }),
    });
    expect(feed[0]?.action.detail).toContain('Template state: proof packet ready to send now.');
  });

  it('shows complete template follow-through as confirmation work instead of another send-now packet', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'banks',
        targetLabel: 'Bank accounts',
        recommendedFormCode: 'BANK',
        nextAction: {
          category: 'review',
          label: 'Confirm bank rename landed',
          detail: 'Check whether the rename already synced across statements and cards.',
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
      makeTemplate({
        readiness: 'complete',
        subject: 'Confirm sync (proof chain complete): Name change update for banking profile',
        proofReadinessSummary: 'Use this as a confirmation pass that cards, checks, statements, and profile records already synced.',
        requestSummary: 'Please confirm cards, checks, statements, and my online profile already reflect the final legal name everywhere.',
        proofChecklist: [
          'Certified legal name-change proof',
          'Confirm cards, statements, and online banking all reflect the final legal name',
        ],
      }),
    ]);

    expect(feed[0]).toMatchObject({
      plannerIntent: 'open_account_update_template',
      focusTargetId: 'account-update-template-template-bank',
      title: 'Bank accounts',
      laneLabel: 'Bank accounts · confirm sync (proof chain complete)',
      severity: 'attention',
      urgencyReason: 'review_queue',
      urgencyTier: 'normal',
    });
    expect(feed[0]?.action.label).toBe('Confirm bank accounts sync (proof chain complete)');
    expect(feed[0]?.action.detail).toContain('Audience: Bank accounts');
    expect(feed[0]?.action.detail).toContain('Status: confirm sync (proof chain complete)');
    expect(feed[0]?.action.detail).toContain('Template state: proof chain complete; confirm the downstream sync only.');
    expect(feed[0]?.action.detail).toContain('Subject: Confirm sync (proof chain complete): Name change update for banking profile');
    expect(feed[0]?.action.detail).toContain('Use this only to confirm the downstream sync already landed.');
    expect(feed[0]?.action.detail).toContain('Subject: Confirm sync (proof chain complete): Name change update for banking profile\nTemplate message: I can provide certified legal proof.');
    expect(feed[0]?.action.detail).toContain('Template message: I can provide certified legal proof.');
    expect(feed[0]?.action.detail).toContain('Readiness: The core proof chain is already complete, so this should be a clean confirmation/update pass.');
    expect(feed[0]?.action.detail).toContain('clean confirmation/update pass');
    expect(feed[0]?.action.detail).toContain('Proof status: Use this as a confirmation pass that cards, checks, statements, and profile records already synced.');
    expect(feed[0]?.action.detail).toContain('Next ask: Please confirm cards, checks, statements, and my online profile already reflect the final legal name everywhere.');
    expect(feed[0]?.action.detail).toContain('Use this as a confirmation pass that cards, checks, statements, and profile records already synced.');
    expect(feed[0]?.action.detail).toContain('Please confirm cards, checks, statements, and my online profile already reflect the final legal name everywhere.');
    expect(feed[0]?.action.detail).toContain('Proof to have handy: Certified legal name-change proof');
  });

  it('keeps ready send-now template work ahead of complete confirmation passes', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'banks',
        targetLabel: 'Bank accounts',
        recommendedFormCode: 'BANK',
        nextAction: {
          category: 'review',
          label: 'Confirm bank rename landed',
          detail: 'Check whether the rename already synced across statements and cards.',
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
      makeExecutionSnapshot({
        targetKey: 'insurance',
        targetLabel: 'Insurance carriers',
        recommendedFormCode: 'INS',
        nextAction: {
          category: 'review',
          label: 'Send insurance update',
          detail: 'Insurance packet is ready to send.',
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
      makeTemplate({
        id: 'template-bank',
        audience: 'Bank accounts',
        readiness: 'complete',
      }),
      makeTemplate({
        id: 'template-insurance',
        audience: 'Insurance carriers',
        readiness: 'ready',
      }),
    ]);

    expect(feed[0]).toMatchObject({
      title: 'Insurance carriers',
      laneLabel: 'Insurance carriers · send now (proof packet ready)',
      urgencyTier: 'elevated',
    });
    expect(feed[1]).toMatchObject({
      title: 'Bank accounts',
      laneLabel: 'Bank accounts · confirm sync (proof chain complete)',
      urgencyTier: 'normal',
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
        proofReadinessSummary: 'Do not send yet; the legal proof chain still needs to clear before carrier evidence will stick.',
        requestSummary: 'Please just share the carrier evidence rules and intake path for now so I can return once the legal proof packet is grounded.',
        proofChecklist: [
          'Certified legal name-change proof',
          'Hold policy changes for now and just gather the carrier evidence rules',
        ],
      }),
    ]);

    expect(feed[0]).toMatchObject({
      plannerIntent: 'open_account_update_template',
      focusTargetId: 'account-update-template-template-insurance',
      laneLabel: 'Insurance carriers · ask intake rules now · legal proof pending',
      severity: 'blocking',
      urgencyReason: 'blocking_dependency',
      action: expect.objectContaining({
        label: 'Ask insurance carriers intake rules now (legal proof pending)',
        detail: expect.stringContaining('learn the intake path now'),
      }),
    });
    expect(feed[0]?.action.detail).toContain(
      'Readiness: The legal-proof chain is still too early, so use this to learn the intake path now and wait to send documents until the upstream proof is real (legal proof pending).',
    );
    expect(feed[0]?.action.detail).not.toContain('Need legal proof first.');
    expect(feed[0]?.action.detail).toContain('Subject: Insurance carriers');
    expect(feed[0]?.action.detail).toContain('Subject: Insurance carriers\nTemplate message: I can provide certified legal proof.');
    expect(feed[0]?.action.detail).toContain('Template message: I can provide certified legal proof.');
    expect(feed[0]?.action.detail).toContain('Do not send yet; the legal proof chain still needs to clear before carrier evidence will stick.');
    expect(feed[0]?.action.detail).toContain('Blocked by: legal proof pending.');
    expect(feed[0]?.action.detail).toContain('Current blocker: legal proof pending.');
    expect(feed[0]?.action.detail).toContain('Proof status: Do not send yet; the legal proof chain still needs to clear before carrier evidence will stick.');
    expect(feed[0]?.action.detail).toContain('Next ask: Please just share the carrier evidence rules and intake path for now so I can return once the legal proof packet is grounded.');
    expect(feed[0]?.action.detail).toContain('Please just share the carrier evidence rules and intake path for now so I can return once the legal proof packet is grounded.');
    expect(feed[0]?.action.detail).toContain('Proof to have handy: Certified legal name-change proof');
  });

  it('keeps real blocking execution work above complete template confirmation review', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'banks',
        targetLabel: 'Bank accounts',
        recommendedFormCode: 'BANK',
        nextAction: {
          category: 'review',
          label: 'Confirm bank rename landed',
          detail: 'Check whether the rename already synced across statements and cards.',
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
      makeExecutionSnapshot({
        targetKey: 'ssa',
        targetLabel: 'Social Security Administration',
        ready: false,
        blockers: ['Need legal proof'],
      }),
    ], [], [], [
      makeTemplate({
        id: 'template-bank',
        audience: 'Bank accounts',
        readiness: 'complete',
      }),
    ]);

    expect(feed[0]).toMatchObject({
      title: 'Social Security Administration',
      severity: 'blocking',
    });
    expect(feed[1]).toMatchObject({
      title: 'Bank accounts',
      severity: 'attention',
      laneLabel: 'Bank accounts · confirm sync (proof chain complete)',
    });
  });

  it('dedupes shared tax-template follow-through into one highest-priority template action once proof is usable', () => {
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

    const templateItems = feed.filter((item) => item.focusTargetId === 'account-update-template-template-tax');

    expect(templateItems).toHaveLength(1);
    expect(templateItems[0]).toMatchObject({
      title: 'Tax and state agencies',
      plannerIntent: 'open_account_update_template',
      focusTargetId: 'account-update-template-template-tax',
      laneLabel: 'Tax and state agencies · draft now, send after current proof clears · SSA pending',
      urgencyReason: 'blocking_dependency',
      action: expect.objectContaining({
        detail: expect.stringContaining(
          'The upstream identity work is already moving, so this outreach can be drafted now and sent as soon as the current step lands (SSA pending). Draft this now, then send it only after SSA pending clears.',
        ),
      }),
    });
  });

  it('dedupes shared travel-template follow-through so tsa and courtesy work do not spam the same intake card', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'tsa',
        targetLabel: 'TSA PreCheck',
        recommendedFormCode: 'TSA',
        nextAction: {
          category: 'review',
          label: 'Prep TSA update',
          detail: 'TSA update packet can be prepared now.',
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
        targetKey: 'courtesy',
        targetLabel: 'Courtesy notifications',
        recommendedFormCode: 'COURTESY',
        nextAction: {
          category: 'review',
          label: 'Prep courtesy update',
          detail: 'Courtesy update packet can be prepared now.',
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
      makeTemplate({
        id: 'template-travel',
        audience: 'Airline, hotel, loyalty, or travel support',
        readiness: 'ready',
      }),
    ]);

    const templateItems = feed.filter((item) => item.focusTargetId === 'account-update-template-template-travel');

    expect(templateItems).toHaveLength(1);
    expect(templateItems[0]).toMatchObject({
      title: 'Airline, hotel, loyalty, or travel support',
      laneLabel: 'Airline, hotel, loyalty, or travel support · send now (proof packet ready)',
      plannerIntent: 'open_account_update_template',
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
      laneLabel: 'Insurance and medical · send now (proof packet ready)',
    });
    expect(feed[0]?.action.detail).toContain('Certified legal name-change proof');
  });

  it('shows upcoming template work as elevated next-proof dependency work instead of looking send-ready', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'employer',
        targetLabel: 'Employer payroll',
        recommendedFormCode: 'PAYROLL',
        nextAction: {
          category: 'dependency',
          label: 'Prep payroll intake path',
          detail: 'Payroll packet depends on the next ID proof hop.',
        },
      }),
    ], [], [], [
      makeTemplate({
        id: 'template-payroll',
        audience: 'Employer payroll / HR',
        readiness: 'upcoming',
        readinessLabel: 'Your legal proof is grounded, but this still depends on the next ID or agency hop before it is ready to send.',
        checklistStatusNote: 'Wait to send until SSA is the next cleared proof hop.',
        proofChecklist: [
          'Certified legal name-change proof',
          'Use this to learn the payroll intake path while SSA alignment is still upstream',
        ],
      }),
    ]);

    expect(feed[0]).toMatchObject({
      plannerIntent: 'open_account_update_template',
      focusTargetId: 'account-update-template-template-payroll',
      laneLabel: 'Employer payroll / HR · ask before next proof hop · SSA pending',
      severity: 'blocking',
      urgencyReason: 'blocking_dependency',
      urgencyTier: 'elevated',
    });
    expect(feed[0]?.action.label).toBe(
      getEngineAccountUpdateTemplateActionLabel('upcoming', 'employer payroll / HR', 'SSA pending'),
    );
    expect(feed[0]?.action.detail).toContain('Template state: prep the ask now and wait for SSA pending to clear before sending.');
    expect(feed[0]?.action.detail).toContain('Prep this ask now, then send it only after SSA pending clears.');
    expect(feed[0]?.action.detail).toContain('Subject: Employer payroll / HR');
    expect(feed[0]?.action.detail).toContain('Subject: Employer payroll / HR\nTemplate message: I can provide certified legal proof.');
    expect(feed[0]?.action.detail).toContain('Template message: I can provide certified legal proof.');
    expect(feed[0]?.action.detail).toContain('Blocked by: SSA pending.');
    expect(feed[0]?.action.detail).toContain('Current blocker: SSA pending.');
    expect(feed[0]?.action.detail).toContain('Checklist: Use this to learn the payroll intake path while SSA alignment is still upstream.');
    expect(feed[0]?.action.detail).toContain('Checklist status: Wait to send until SSA is the next cleared proof hop.');
    expect(feed[0]?.action.detail).toContain('still depends on the next ID or agency hop');
  });

  it('preserves acronym casing inside template action labels', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'employer',
        targetLabel: 'Employer payroll',
        recommendedFormCode: 'PAYROLL',
        nextAction: {
          category: 'review',
          label: 'Queue employer update',
          detail: 'Payroll packet can be staged now.',
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
      makeTemplate({
        id: 'template-payroll',
        audience: 'Employer payroll / HR',
        readiness: 'ready',
      }),
    ]);

    expect(feed[0]?.action.label).toBe(
      getEngineAccountUpdateTemplateActionLabel('ready', 'employer payroll / HR'),
    );
  });

  it('uses blocking draft labels for in-progress template work that can be staged now', () => {
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
    ], [], [], [taxTemplate]);

    expect(feed[0]).toMatchObject({
      plannerIntent: 'open_account_update_template',
      focusTargetId: 'account-update-template-template-tax',
      laneLabel: 'Tax and state agencies · draft now, send after current proof clears · SSA pending',
      severity: 'blocking',
      urgencyReason: 'blocking_dependency',
    });
    expect(feed[0]?.action.label).toBe('Draft tax and state agencies update (SSA pending)');
  });

  it('keeps blocked template work above upcoming proof-hop asks without promoting the upcoming ask to critical', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'employer',
        targetLabel: 'Employer payroll',
        recommendedFormCode: 'PAYROLL',
        nextAction: {
          category: 'dependency',
          label: 'Prep payroll intake path',
          detail: 'Payroll packet depends on the next proof hop.',
        },
      }),
      makeExecutionSnapshot({
        targetKey: 'insurance',
        targetLabel: 'Insurance carriers',
        recommendedFormCode: 'INS',
        nextAction: {
          category: 'dependency',
          label: 'Prep carrier intake path',
          detail: 'Carrier packet is still blocked on the legal proof chain.',
        },
      }),
    ], [], [], [
      makeTemplate({
        id: 'template-payroll',
        audience: 'Employer payroll / HR',
        readiness: 'upcoming',
      }),
      makeTemplate({
        id: 'template-insurance',
        audience: 'Insurance carriers',
        readiness: 'blocked',
      }),
    ]);

    expect(feed[0]).toMatchObject({
      title: 'Insurance carriers',
      laneLabel: 'Insurance carriers · ask intake rules now · legal proof pending',
      severity: 'blocking',
      urgencyTier: 'critical',
    });
    expect(feed[0]?.action.label).toBe('Ask insurance carriers intake rules now (legal proof pending)');
    expect(feed[1]).toMatchObject({
      title: 'Employer payroll / HR',
      laneLabel: 'Employer payroll / HR · ask before next proof hop · SSA pending',
      severity: 'blocking',
      urgencyTier: 'elevated',
    });
    expect(feed[1]?.action.label).toBe('Ask employer payroll / HR before next proof hop (SSA pending)');
  });

  it('keeps upcoming proof-hop asks ahead of ready send-now follow-through without marking them critical', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'employer',
        targetLabel: 'Employer payroll',
        recommendedFormCode: 'PAYROLL',
        nextAction: {
          category: 'dependency',
          label: 'Prep payroll intake path',
          detail: 'Payroll packet depends on the next proof hop.',
        },
      }),
      makeExecutionSnapshot({
        targetKey: 'banks',
        targetLabel: 'Bank accounts',
        recommendedFormCode: 'BANK',
        nextAction: {
          category: 'review',
          label: 'Send bank update',
          detail: 'Bank packet is ready to send now.',
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
      makeTemplate({
        id: 'template-payroll',
        audience: 'Employer payroll / HR',
        readiness: 'upcoming',
      }),
      makeTemplate({
        id: 'template-bank',
        audience: 'Bank accounts',
        readiness: 'ready',
      }),
    ]);

    expect(feed[0]).toMatchObject({
      title: 'Employer payroll / HR',
      laneLabel: 'Employer payroll / HR · ask before next proof hop · SSA pending',
      severity: 'blocking',
      urgencyTier: 'elevated',
      urgencyReason: 'blocking_dependency',
    });
    expect(feed[0]?.action.label).toBe('Ask employer payroll / HR before next proof hop (SSA pending)');
    expect(feed[1]).toMatchObject({
      title: 'Bank accounts',
      laneLabel: 'Bank accounts · send now (proof packet ready)',
      severity: 'ready',
    });
    expect(feed[1]?.action.label).toBe('Send bank accounts update (proof packet ready)');
  });

  it('keeps staged blocker templates ahead of send-now follow-through', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'taxes',
        targetLabel: 'Tax records',
        recommendedFormCode: 'TAX',
        nextAction: {
          category: 'review',
          label: 'Queue tax agency update',
          detail: 'Tax packet can be drafted now.',
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
        targetKey: 'insurance',
        targetLabel: 'Insurance carriers',
        recommendedFormCode: 'INS',
        nextAction: {
          category: 'review',
          label: 'Send insurance update',
          detail: 'Insurance packet is ready to send.',
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
      makeTemplate({
        id: 'template-tax',
        audience: 'Tax and state agencies',
        readiness: 'in_progress',
      }),
      makeTemplate({
        id: 'template-insurance',
        audience: 'Insurance carriers',
        readiness: 'ready',
      }),
    ]);

    expect(feed[0]).toMatchObject({
      title: 'Tax and state agencies',
      laneLabel: 'Tax and state agencies · draft now, send after current proof clears · SSA pending',
      severity: 'blocking',
    });
    expect(feed[0]?.action.detail).toContain('Blocked by: SSA pending.');
    expect(feed[0]?.action.detail).toContain('Current blocker: SSA pending.');
    expect(feed[1]).toMatchObject({
      title: 'Insurance carriers',
      laneLabel: 'Insurance carriers · send now (proof packet ready)',
      severity: 'ready',
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
        proofChecklist: [
          'Certified legal name-change proof',
          'Hold identity changes for now and only gather verification rules',
        ],
      }),
    ]);

    expect(feed[0]).toMatchObject({
      plannerIntent: 'open_account_update_template',
      focusTargetId: 'account-update-template-template-digital-identity',
      laneLabel: 'Phone, utilities, housing, or primary digital identity support · ask intake rules now · legal proof pending',
      urgencyReason: 'blocking_dependency',
      action: expect.objectContaining({
        detail: expect.stringContaining('gather verification rules'),
      }),
    });
    expect(feed[0]?.action.detail).toContain('Blocked by: legal proof pending.');
    expect(feed[0]?.action.detail).toContain('Current blocker: legal proof pending.');
    expect(feed[0]?.action.detail).toContain('Hold identity changes for now and only gather verification rules');
  });

  it('uses confirm sync wording for completed template lane labels', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'banks',
        targetLabel: 'Banks',
        recommendedFormCode: 'BANK',
      }),
    ], [], [], [
      makeTemplate({
        id: 'template-bank',
        audience: 'Bank accounts',
        readiness: 'complete',
        blockingProofHopLabel: undefined,
      }),
    ]);

    expect(feed[0]?.laneLabel).toBe('Bank accounts · confirm sync (proof chain complete)');
  });

  it('keeps proof-phase detail fallback copy when staged templates have no named blocker', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({ targetKey: 'banks', targetLabel: 'Banks', recommendedFormCode: 'BANK' }),
      makeExecutionSnapshot({ targetKey: 'insurance', targetLabel: 'Insurance', recommendedFormCode: 'INS' }),
      makeExecutionSnapshot({ targetKey: 'taxes', targetLabel: 'Taxes', recommendedFormCode: 'TAX' }),
    ], [], [], [
      makeTemplate({ id: 'template-bank', audience: 'Bank accounts', readiness: 'in_progress', blockingProofHopLabel: undefined }),
      makeTemplate({ id: 'template-insurance', audience: 'Insurance carriers', readiness: 'upcoming', blockingProofHopLabel: undefined }),
      makeTemplate({ id: 'template-tax', audience: 'Tax agencies', readiness: 'blocked', blockingProofHopLabel: undefined }),
    ]);

    const bankTemplateItem = feed.find((item) => item.focusTargetId === 'account-update-template-template-bank');
    const insuranceTemplateItem = feed.find((item) => item.focusTargetId === 'account-update-template-template-insurance');
    const taxTemplateItem = feed.find((item) => item.focusTargetId === 'account-update-template-template-tax');

    expect(bankTemplateItem?.laneLabel).toBe('Bank accounts · draft now, send after current proof clears · current proof pending');
    expect(insuranceTemplateItem?.laneLabel).toBe('Insurance carriers · ask before next proof hop · next proof hop pending');
    expect(taxTemplateItem?.laneLabel).toBe('Tax agencies · ask intake rules now · proof chain pending');
    expect(bankTemplateItem?.action.label).toBe('Draft bank accounts update (current proof pending)');
    expect(insuranceTemplateItem?.action.label).toBe('Ask insurance carriers before next proof hop (next proof hop pending)');
    expect(taxTemplateItem?.action.label).toBe('Ask tax agencies intake rules now (proof chain pending)');
    expect(bankTemplateItem?.action.detail).toContain('Blocked by: current proof pending.');
    expect(insuranceTemplateItem?.action.detail).toContain('Blocked by: next proof hop pending.');
    expect(taxTemplateItem?.action.detail).toContain('Blocked by: proof chain pending.');
    expect(bankTemplateItem?.action.detail).toContain('Current blocker: current proof pending.');
    expect(insuranceTemplateItem?.action.detail).toContain('Current blocker: next proof hop pending.');
    expect(taxTemplateItem?.action.detail).toContain('Current blocker: proof chain pending.');
    expect(bankTemplateItem?.severity).toBe('blocking');
    expect(bankTemplateItem?.urgencyTier).toBe('elevated');
    expect(bankTemplateItem?.urgencyReason).toBe('blocking_dependency');
    expect(bankTemplateItem?.action.detail).toContain('Template state: draft now and wait for the current proof to clear before sending.');
    expect(insuranceTemplateItem?.action.detail).toContain('Template state: prep the ask now before the next proof hop clears.');
    expect(taxTemplateItem?.action.detail).toContain('Template state: intake-only until the proof chain is ready.');
    expect(bankTemplateItem?.action.detail).toContain('Draft this now, then send it only after the current proof clears.');
    expect(insuranceTemplateItem?.action.detail).toContain('Prep this ask now, then send it only after the next proof hop clears.');
    expect(taxTemplateItem?.action.detail).toContain('Use this only to capture intake rules until the proof chain is ready.');
  });

  it('avoids double punctuation in checklist detail lines', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({ targetKey: 'banks', targetLabel: 'Banks', recommendedFormCode: 'BANK' }),
    ], [], [], [
      makeTemplate({
        id: 'template-bank',
        audience: 'Bank accounts',
        readiness: 'blocked',
        checklistHighlight: 'Gather the tax/state process only until legal proof is fully grounded.',
        checklistStatusNote: 'Gather the tax/state process only until legal proof is fully grounded.',
      }),
    ]);

    expect(feed[0]?.action.detail).toContain('Checklist: Gather the tax/state process only until legal proof is fully grounded.');
    expect(feed[0]?.action.detail).toContain('Checklist status: Gather the tax/state process only until legal proof is fully grounded.');
    expect(feed[0]?.action.detail).not.toContain('grounded..');
  });

  it('keeps blocked template intake work above lower-value ready execution follow-through', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'insurance',
        targetLabel: 'Insurance carriers',
        recommendedFormCode: 'INS',
        nextAction: {
          category: 'dependency',
          label: 'Prep insurance intake path',
          detail: 'Need carrier rules before submitting proof.',
        },
      }),
      makeExecutionSnapshot({
        targetKey: 'courtesy',
        targetLabel: 'Courtesy notifications',
        recommendedFormCode: 'COURTESY',
        nextAction: {
          category: 'review',
          label: 'Send courtesy update',
          detail: 'Low-stakes courtesy notifications can go out now.',
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
      makeTemplate({
        id: 'template-insurance',
        audience: 'Insurance carriers',
        readiness: 'blocked',
        readinessLabel: 'The legal-proof chain is still too early, so use this to learn the intake path now and wait to send documents until the upstream proof is real.',
        proofChecklist: [
          'Certified legal name-change proof',
          'Hold policy changes for now and just gather the carrier evidence rules',
        ],
      }),
      makeTemplate({
        id: 'template-travel',
        audience: 'Travel profile support',
        readiness: 'ready',
        proofChecklist: [
          'Certified legal name-change proof',
          'Send the travel-safe packet now with the passport or identity proof now in hand',
        ],
      }),
    ]);

    expect(feed[0]).toMatchObject({
      title: 'Insurance carriers',
      plannerIntent: 'open_account_update_template',
      laneLabel: 'Insurance carriers · ask intake rules now · legal proof pending',
      urgencyTier: 'critical',
    });
    expect(feed[1]).toMatchObject({
      title: 'Travel profile support',
      plannerIntent: 'open_account_update_template',
    });
  });

  it('marks blocked travel templates with legal-proof blockers instead of passport blockers', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'tsa',
        targetLabel: 'Travel profile support',
        recommendedFormCode: 'TRAVEL',
      }),
    ], [], [], [
      makeTemplate({
        id: 'template-travel',
        audience: 'Travel profile support',
        readiness: 'blocked',
        readinessLabel: 'The legal-proof chain is still too early, so use this to learn the intake path now and wait to send documents until the upstream proof is real.',
        proofReadinessSummary: 'Do not send yet; the legal proof chain still needs to clear before travel-profile evidence will stick.',
        checklistStatusNote: 'Gather mismatch and booking rules only until legal proof is fully grounded.',
        proofChecklist: [
          'Certified legal name-change proof',
          'Ask for mismatch policy and booking rules before the legal proof packet is ready',
          'Gather mismatch and booking rules only until legal proof is fully grounded.',
        ],
      }),
    ]);

    const travelTemplateItem = feed.find((item) => item.plannerIntent === 'open_account_update_template');

    expect(travelTemplateItem?.laneLabel).toBe('Travel profile support · ask intake rules now · legal proof pending');
    expect(travelTemplateItem?.action.label).toBe('Ask travel profile support intake rules now (legal proof pending)');
    expect(travelTemplateItem?.action.detail).toContain('Blocked by: legal proof pending.');
    expect(travelTemplateItem?.action.detail).toContain('Current blocker: legal proof pending.');
    expect(travelTemplateItem?.action.detail).toContain('Checklist: Ask for mismatch policy and booking rules before the legal proof packet is ready.');
    expect(travelTemplateItem?.action.detail).toContain('Checklist status: Gather mismatch and booking rules only until legal proof is fully grounded.');
    expect(travelTemplateItem?.action.detail).toContain('Proof status: Do not send yet; the legal proof chain still needs to clear before travel-profile evidence will stick.');
    expect(travelTemplateItem?.action.detail).toContain('Proof checklist: Certified legal name-change proof · Ask for mismatch policy and booking rules before the legal proof packet is ready · Gather mismatch and booking rules only until legal proof is fully grounded');
    expect(travelTemplateItem?.action.detail).toContain('Proof to have handy: Certified legal name-change proof');
  });

  it('keeps blocked tax template next asks anchored to legal-proof readiness', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'taxes',
        targetLabel: 'Tax agency or payroll tax support',
        recommendedFormCode: 'TAX',
      }),
    ], [], [], [
      makeTemplate({
        id: 'template-tax',
        audience: 'Tax agency or payroll tax support',
        readiness: 'blocked',
        requestSummary: 'Please just confirm the tax/state process for now so I can return once the legal proof packet is grounded.',
        proofReadinessSummary: 'Do not send yet; the legal proof chain still needs to clear before tax updates can stick.',
        checklistStatusNote: 'Gather the tax/state process only until legal proof is fully grounded.',
        proofChecklist: [
          'Certified legal name-change proof',
          'Gather the tax/state process only until legal proof is fully grounded.',
        ],
      }),
    ]);

    expect(feed[0]?.laneLabel).toBe('Tax agency or payroll tax support · ask intake rules now · legal proof pending');
    expect(feed[0]?.action.label).toBe('Ask tax agency or payroll tax support intake rules now (legal proof pending)');
    expect(feed[0]?.action.detail).toContain('Template state: intake-only until legal proof pending clears.');
    expect(feed[0]?.action.detail).toContain('Use this only to capture intake rules until legal proof pending clears.');
    expect(feed[0]?.action.detail).toContain('Checklist: Gather the tax/state process only until legal proof is fully grounded.');
    expect(feed[0]?.action.detail).toContain('Checklist status: Gather the tax/state process only until legal proof is fully grounded.');
    expect(feed[0]?.action.detail).toContain('Next ask: Please just confirm the tax/state process for now so I can return once the legal proof packet is grounded.');
    expect(feed[0]?.action.detail).toContain('Proof status: Do not send yet; the legal proof chain still needs to clear before tax updates can stick.');
    expect(feed[0]?.action.detail).toContain('Proof checklist: Certified legal name-change proof · Gather the tax/state process only until legal proof is fully grounded');
    expect(feed[0]?.action.detail).toContain('Proof to have handy: Certified legal name-change proof');
  });

  it('keeps blocked payroll proof status anchored to legal-proof readiness', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'employer',
        targetLabel: 'Employer payroll / HR',
        recommendedFormCode: 'PAYROLL',
      }),
    ], [], [], [
      makeTemplate({
        id: 'template-payroll',
        audience: 'Employer payroll / HR',
        readiness: 'blocked',
        requestSummary: 'Please just confirm the intake path and payroll timing for now so I can come back once the legal proof packet is grounded.',
        proofReadinessSummary: 'Do not send yet; the legal proof chain still needs to clear before payroll updates can stick.',
        checklistStatusNote: 'Gather the intake path only until legal proof is fully grounded.',
        proofChecklist: [
          'Certified legal name-change proof',
          'Gather the intake path only until legal proof is fully grounded.',
        ],
      }),
    ]);

    const payrollTemplateItem = feed.find((item) => item.plannerIntent === 'open_account_update_template');

    expect(payrollTemplateItem?.action.detail).toContain('Checklist: Gather the intake path only until legal proof is fully grounded.');
    expect(payrollTemplateItem?.action.detail).toContain('Checklist status: Gather the intake path only until legal proof is fully grounded.');
    expect(payrollTemplateItem?.action.detail).toContain('Next ask: Please just confirm the intake path and payroll timing for now so I can come back once the legal proof packet is grounded.');
    expect(payrollTemplateItem?.action.detail).toContain('Proof status: Do not send yet; the legal proof chain still needs to clear before payroll updates can stick.');
    expect(payrollTemplateItem?.action.detail).toContain('Proof checklist: Certified legal name-change proof · Gather the intake path only until legal proof is fully grounded');
    expect(payrollTemplateItem?.action.detail).toContain('Proof to have handy: Certified legal name-change proof');
  });

  it('keeps blocked bank and license template next asks anchored to legal-proof readiness', () => {
    const bankFeed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'banks',
        targetLabel: 'Bank or credit card support',
        recommendedFormCode: 'BANK',
      }),
    ], [], [], [
      makeTemplate({
        id: 'template-bank',
        audience: 'Bank or credit card support',
        readiness: 'blocked',
        requestSummary: 'Please just send the exact bank/card document rules and intake path for now so I can return once the legal proof packet is grounded.',
      }),
    ]);
    const licenseFeed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'licenses',
        targetLabel: 'Licensing board or credentialing support',
        recommendedFormCode: 'LICENSE',
      }),
    ], [], [], [
      makeTemplate({
        id: 'template-licenses',
        audience: 'Licensing board or credentialing support',
        readiness: 'blocked',
        requestSummary: 'Please just share the board submission rules for now so I can return once the legal proof packet is grounded.',
      }),
    ]);

    const bankTemplateItem = bankFeed.find((item) => item.plannerIntent === 'open_account_update_template');
    const licenseTemplateItem = licenseFeed.find((item) => item.plannerIntent === 'open_account_update_template');

    expect(bankTemplateItem?.laneLabel).toBe('Bank or credit card support · ask intake rules now · legal proof pending');
    expect(bankTemplateItem?.action.label).toBe('Ask bank or credit card support intake rules now (legal proof pending)');
    expect(bankTemplateItem?.action.detail).toContain('Next ask: Please just send the exact bank/card document rules and intake path for now so I can return once the legal proof packet is grounded.');
    expect(licenseTemplateItem?.laneLabel).toBe('Licensing board or credentialing support · ask intake rules now · legal proof pending');
    expect(licenseTemplateItem?.action.label).toBe('Ask licensing board or credentialing support intake rules now (legal proof pending)');
    expect(licenseTemplateItem?.action.detail).toContain('Next ask: Please just share the board submission rules for now so I can return once the legal proof packet is grounded.');
  });

  it('keeps blocked insurance, travel, and digital-identity next asks anchored to legal-proof readiness', () => {
    const insuranceFeed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'insurance',
        targetLabel: 'Insurance carriers',
        recommendedFormCode: 'INSURANCE',
      }),
    ], [], [], [
      makeTemplate({
        id: 'template-insurance',
        audience: 'Insurance carriers',
        readiness: 'blocked',
        requestSummary: 'Please just share the carrier evidence rules and intake path for now so I can return once the legal proof packet is grounded.',
      }),
    ]);
    const travelFeed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'tsa',
        targetLabel: 'Travel profile support',
        recommendedFormCode: 'TRAVEL',
      }),
    ], [], [], [
      makeTemplate({
        id: 'template-travel',
        audience: 'Travel profile support',
        readiness: 'blocked',
        requestSummary: 'Please just share your mismatch policy and acceptable temporary-proof rules for now so I can return once the legal proof packet is grounded.',
        proofChecklist: [
          'Certified legal name-change proof',
          'Ask for mismatch policy and booking rules before the legal proof packet is ready',
          'Gather mismatch and booking rules only until legal proof is fully grounded.',
        ],
      }),
    ]);
    const digitalFeed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'utilities',
        targetLabel: 'Phone, utilities, housing, or primary digital identity support',
        recommendedFormCode: 'DIGITAL',
      }),
    ], [], [], [
      makeTemplate({
        id: 'template-digital-identity',
        audience: 'Phone, utilities, housing, or primary digital identity support',
        readiness: 'blocked',
        requestSummary: 'Please just share the verification rules for now so I can return once the legal proof packet is grounded.',
      }),
    ]);

    const insuranceTemplateItem = insuranceFeed.find((item) => item.plannerIntent === 'open_account_update_template');
    const travelTemplateItem = travelFeed.find((item) => item.plannerIntent === 'open_account_update_template');
    const digitalTemplateItem = digitalFeed.find((item) => item.plannerIntent === 'open_account_update_template');

    expect(insuranceTemplateItem?.action.detail).toContain('Next ask: Please just share the carrier evidence rules and intake path for now so I can return once the legal proof packet is grounded.');
    expect(travelTemplateItem?.action.detail).toContain('Next ask: Please just share your mismatch policy and acceptable temporary-proof rules for now so I can return once the legal proof packet is grounded.');
    expect(digitalTemplateItem?.action.detail).toContain('Next ask: Please just share the verification rules for now so I can return once the legal proof packet is grounded.');
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

  it('routes legal-proof edge reminders to the owning execution surfaces', () => {
    const feed = buildNameChangeActionFeed([], [], [
      makeReminderAttention({
        reminderKey: 'reminder-court-order-packet',
        label: 'Check court-order packet and hearing progress',
      }),
      makeReminderAttention({
        reminderKey: 'reminder-mismatch-recovery',
        label: 'Reset the legal-proof path before continuing downstream updates',
      }),
    ]);

    expect(feed.map((item) => item.focusTargetId)).toEqual(['execution-card-courtOrder', 'case-setup']);
    expect(feed.map((item) => item.sectionKey)).toEqual(['cleanup', 'cleanup']);
  });

  it('routes name-format consistency reminders to the planner case-setup section', () => {
    const feed = buildNameChangeActionFeed([], [], [
      makeReminderAttention({
        reminderKey: 'reminder-name-format-consistency',
        dependsOnStepId: 'federal-ssa',
      }),
    ]);

    expect(feed[0]).toMatchObject({
      focusTargetId: 'case-setup',
      sectionKey: 'cleanup',
    });
  });

  it('routes county-record proof reminders to the planner case-setup section', () => {
    const feed = buildNameChangeActionFeed([], [], [
      makeReminderAttention({
        reminderKey: 'reminder-county-office-variation',
        label: 'Confirm the issuing county record path before filing follow-through',
      }),
      makeReminderAttention({
        reminderKey: 'reminder-out-of-state-proof-grounding',
        label: 'Ground the out-of-state certificate county, number, and issuing authority before downstream filing',
      }),
    ]);

    expect(feed.map((item) => item.focusTargetId)).toEqual(['case-setup', 'case-setup']);
    expect(feed.map((item) => item.sectionKey)).toEqual(['cleanup', 'cleanup']);
  });

  it('routes document-mismatch reminders to the planner case-setup section', () => {
    const feed = buildNameChangeActionFeed([], [], [
      makeReminderAttention({
        reminderKey: 'reminder-document-name-mismatch',
        label: 'Resolve document-name conflicts before trusting downstream filing',
      }),
    ]);

    expect(feed[0]).toMatchObject({
      focusTargetId: 'case-setup',
      sectionKey: 'cleanup',
      plannerIntent: 'open_execution_card',
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

  it('routes tax and legal-government reminders to their government execution cards', () => {
    const feed = buildNameChangeActionFeed([], [], [
      makeReminderAttention({
        reminderKey: 'reminder-tax-followup',
        label: 'Follow up on tax records',
        dependsOnStepId: 'institution-state-tax-agency',
        dependentStepTitle: 'State tax agency',
        sectionKey: 'core-government',
        plannerIntent: 'open_execution_card',
        focusTargetId: 'execution-card-taxes',
      }),
      makeReminderAttention({
        reminderKey: 'reminder-legal-government-followup',
        label: 'Follow up on county and immigration records',
        dependsOnStepId: 'institution-uscis-immigration-records',
        dependentStepTitle: 'USCIS immigration records',
        sectionKey: 'core-government',
        plannerIntent: 'open_execution_card',
        focusTargetId: 'execution-card-legalGovernment',
      }),
    ]);

    expect(feed.map((item) => item.focusTargetId)).toEqual(expect.arrayContaining(['execution-card-taxes', 'execution-card-legalGovernment']));
    expect(feed.map((item) => item.sectionKey)).toEqual(expect.arrayContaining(['core-government']));
  });

  it('keeps cleanup and courtesy reminders in the same planner sections as their execution cards', () => {
    const feed = buildNameChangeActionFeed([], [], [
      makeReminderAttention({
        reminderKey: 'reminder-voter-registration',
        label: 'Follow up on voter registration',
        dependsOnStepId: 'institution-voter-registration',
        dependentStepTitle: 'Voter registration',
        plannerIntent: 'open_execution_card',
        focusTargetId: 'execution-card-voter',
      }),
      makeReminderAttention({
        reminderKey: 'reminder-courtesy',
        label: 'Follow up on courtesy notifications',
        dependsOnStepId: 'institution-courtesy-social-sync',
        dependentStepTitle: 'Courtesy / social identity sync',
        plannerIntent: 'open_execution_card',
        focusTargetId: 'execution-card-courtesy',
      }),
      makeReminderAttention({
        reminderKey: 'reminder-travel-rollout',
        label: 'Follow up on travel profiles',
        dependsOnStepId: 'institution-travel-hospitality',
        dependentStepTitle: 'Travel profiles',
        plannerIntent: 'open_execution_card',
        focusTargetId: 'execution-card-tsa',
      }),
    ]);

    expect(feed.find((item) => item.focusTargetId === 'execution-card-voter')).toMatchObject({ sectionKey: 'cleanup' });
    expect(feed.find((item) => item.focusTargetId === 'execution-card-courtesy')).toMatchObject({ sectionKey: 'institutional' });
    expect(feed.find((item) => item.focusTargetId === 'execution-card-tsa')).toMatchObject({ sectionKey: 'cleanup' });
  });

  it('routes granular institutional reminders to their owning execution cards', () => {
    const feed = buildNameChangeActionFeed([], [], [
      makeReminderAttention({
        reminderKey: 'reminder-irs-employer',
        label: 'Follow up on payroll records',
        dependsOnStepId: 'institution-irs-employer',
        dependentStepTitle: 'Payroll records',
        plannerIntent: 'open_execution_card',
        focusTargetId: 'execution-card-employer',
      }),
      makeReminderAttention({
        reminderKey: 'reminder-financial-rollout',
        label: 'Follow up on credit bureau updates',
        dependsOnStepId: 'institution-credit-bureaus',
        dependentStepTitle: 'Credit bureaus',
        plannerIntent: 'open_execution_card',
        focusTargetId: 'execution-card-banks',
      }),
      makeReminderAttention({
        reminderKey: 'reminder-travel-rollout-granular',
        label: 'Follow up on travel loyalty profiles',
        dependsOnStepId: 'institution-frequent-flyer-hotel-rail',
        dependentStepTitle: 'Travel loyalty profiles',
        plannerIntent: 'open_execution_card',
        focusTargetId: 'execution-card-tsa',
      }),
    ]);

    expect(feed.find((item) => item.focusTargetId === 'execution-card-employer')).toMatchObject({
      sectionKey: 'work-identity',
      focusTargetId: 'execution-card-employer',
    });
    expect(feed.find((item) => item.focusTargetId === 'execution-card-banks')).toMatchObject({
      sectionKey: 'institutional',
      focusTargetId: 'execution-card-banks',
    });
    expect(feed.find((item) => item.focusTargetId === 'execution-card-tsa')).toMatchObject({
      sectionKey: 'cleanup',
      focusTargetId: 'execution-card-tsa',
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
      focusTargetId: 'execution-card-tsa',
      sectionKey: 'cleanup',
    });
  });

  it('keeps legal-government execution work linked to tax/government templates in core-government', () => {
    const feed = buildNameChangeActionFeed(
      [makeExecutionSnapshot({
        targetKey: 'legalGovernment',
        targetLabel: 'County recorder and immigration record alignment',
        recommendedFormCode: 'TAX-SSA-STATE-ALIGNMENT-PACKET',
      })],
      [],
      [],
      [makeTemplate({
        id: 'template-tax',
        audience: 'Tax agency, county recorder, immigration, or government record support',
        readiness: 'blocked',
        blockingProofHopLabel: 'legal proof pending',
      })],
    );

    expect(feed[0]).toMatchObject({
      focusTargetId: 'account-update-template-template-tax',
      sectionKey: 'core-government',
    });
  });

  it('keeps tax execution work in core-government', () => {
    const feed = buildNameChangeActionFeed([
      makeExecutionSnapshot({
        targetKey: 'taxes',
        targetLabel: 'Tax records',
        recommendedFormCode: 'TAX',
      }),
    ], [], []);

    expect(feed[0]).toMatchObject({
      focusTargetId: 'execution-card-taxes',
      sectionKey: 'core-government',
    });
  });

  it('trims terminal punctuation from proof-document summaries', () => {
    const feed = buildNameChangeActionFeed(
      [makeExecutionSnapshot({ targetKey: 'banks', targetLabel: 'Banks', recommendedFormCode: 'BANK' })],
      [],
      [],
      [makeTemplate({
        id: 'template-bank',
        audience: 'Bank accounts',
        proofDocuments: ['Certified legal name-change proof.', 'Updated photo ID or DMV receipt.'],
        proofChecklist: ['Certified legal name-change proof.'],
      })],
    );

    expect(feed[0]?.action.detail).toContain('Proof to have handy: Certified legal name-change proof · Updated photo ID or DMV receipt');
    expect(feed[0]?.action.detail).not.toContain('Proof to have handy: Certified legal name-change proof. · Updated photo ID or DMV receipt.');
  });

  it('deduplicates normalized proof-document summaries', () => {
    const feed = buildNameChangeActionFeed(
      [makeExecutionSnapshot({ targetKey: 'banks', targetLabel: 'Banks', recommendedFormCode: 'BANK' })],
      [],
      [],
      [makeTemplate({
        id: 'template-bank',
        audience: 'Bank accounts',
        proofDocuments: ['Certified legal name-change proof.', 'Certified legal name-change proof', ' Updated photo ID or DMV receipt. '],
        proofChecklist: ['Certified legal name-change proof.'],
      })],
    );

    expect(feed[0]?.action.detail).toContain('Proof to have handy: Certified legal name-change proof · Updated photo ID or DMV receipt');
    expect(feed[0]?.action.detail).not.toContain('Proof to have handy: Certified legal name-change proof · Certified legal name-change proof');
  });

  it('omits blank normalized proof summaries from template detail', () => {
    const feed = buildNameChangeActionFeed(
      [makeExecutionSnapshot({ targetKey: 'banks', targetLabel: 'Banks', recommendedFormCode: 'BANK' })],
      [],
      [],
      [makeTemplate({
        id: 'template-bank',
        audience: 'Bank accounts',
        proofDocuments: ['.', '   '],
        proofChecklist: ['.', '   '],
      })],
    );

    expect(feed[0]?.action.detail).not.toContain('Proof checklist:');
    expect(feed[0]?.action.detail).not.toContain('Proof to have handy:');
  });

  it('omits punctuation-only checklist detail lines', () => {
    const feed = buildNameChangeActionFeed(
      [makeExecutionSnapshot({ targetKey: 'banks', targetLabel: 'Banks', recommendedFormCode: 'BANK' })],
      [],
      [],
      [makeTemplate({
        id: 'template-bank',
        audience: 'Bank accounts',
        checklistHighlight: ' . ',
        checklistStatusNote: '.',
      })],
    );

    expect(feed[0]?.action.detail).not.toContain('Checklist:');
    expect(feed[0]?.action.detail).not.toContain('Checklist status:');
  });

  it('omits blank subject, message, proof status, and next ask lines from template detail', () => {
    const feed = buildNameChangeActionFeed(
      [makeExecutionSnapshot({ targetKey: 'banks', targetLabel: 'Banks', recommendedFormCode: 'BANK' })],
      [],
      [],
      [makeTemplate({
        id: 'template-bank',
        audience: 'Bank accounts',
        subject: '   ',
        body: ' . ',
        proofReadinessSummary: ' - ',
        requestSummary: ' ... ',
      })],
    );

    expect(feed[0]?.action.detail).not.toContain('Subject:');
    expect(feed[0]?.action.detail).not.toContain('Template message:');
    expect(feed[0]?.action.detail).not.toContain('Proof status:');
    expect(feed[0]?.action.detail).not.toContain('Next ask:');
  });

  it('adds supportive do-now and safe-to-wait guidance for blocked downstream execution targets', () => {
    const snapshot = makeExecutionSnapshot({
      targetKey: 'banks',
      targetLabel: 'Banks',
      nextAction: {
        category: 'dependency',
        label: 'Unblock DMV completion',
        detail: 'Wait for the DMV update before submitting bank changes.',
      },
      recommendedFormCode: 'BANK',
    });

    expect(getExecutionNextActionDetail(snapshot)).toBe(
      'Wait for the DMV update before submitting bank changes. Do now: Gather account numbers, policy details, and contact routes now. Why it helps: That handoff moves faster once DMV completion clears. Can wait: Actual submission can safely wait.',
    );

    const feed = buildNameChangeActionFeed([snapshot], [], []);
    expect(feed[0]?.action.detail).toBe(getExecutionNextActionDetail(snapshot));
    expect(feed[0]?.urgencyReason).toBe('review_queue');
  });

  it('keeps deferred downstream urgency softened when execution detail is already labeled', () => {
    const snapshot = makeExecutionSnapshot({
      targetKey: 'banks',
      targetLabel: 'Banks',
      nextAction: {
        category: 'dependency',
        label: 'Unblock DMV completion',
        detail: 'Wait for the DMV update before submitting bank changes. Do now: Gather account numbers, policy details, and contact routes now. Why it helps: That handoff moves faster once DMV completion clears. Can wait: Actual submission can safely wait.',
      },
      recommendedFormCode: 'BANK',
    });

    const feed = buildNameChangeActionFeed([snapshot], [], []);

    expect(feed[0]?.action.detail).toBe(snapshot.nextAction.detail);
    expect(feed[0]?.urgencyReason).toBe('review_queue');
  });

  it('falls back to generic blocker text when the blocker label is blank whitespace', () => {
    const feed = buildNameChangeActionFeed(
      [makeExecutionSnapshot({ targetKey: 'banks', targetLabel: 'Banks', recommendedFormCode: 'BANK' })],
      [],
      [],
      [makeTemplate({
        id: 'template-bank',
        audience: 'Bank accounts',
        readiness: 'in_progress',
        blockingProofHopLabel: '   ',
      })],
    );

    expect(feed[0]?.action.detail).toContain('Blocked by: current proof pending.');
    expect(feed[0]?.action.detail).toContain('Current blocker: current proof pending.');
    expect(feed[0]?.action.detail).toContain('Template state: draft now and wait for the current proof to clear before sending.');
    expect(feed[0]?.action.detail).toContain('Draft this now, then send it only after the current proof clears.');
    expect(feed[0]?.laneLabel).toBe('Bank accounts · draft now, send after current proof clears · current proof pending');
    expect(feed[0]?.action.label).toBe('Draft bank accounts update (current proof pending)');
    expect(feed[0]?.severity).toBe('blocking');
    expect(feed[0]?.urgencyTier).toBe('elevated');
    expect(feed[0]?.urgencyReason).toBe('blocking_dependency');
    expect(feed[0]?.action.detail).not.toContain('Blocked by:    .');
  });
});
