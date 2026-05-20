import { buildNameChangeAutofillPrepSnapshot } from './autofill';
import { getNameChangeDocumentKindAliases } from './documentKinds';
import { evaluateNameChangeExecutionGates } from './executionGates';
import { buildNameChangeExecutionSequenceSnapshot } from './executionSequence';
import {
  buildNameChangeExtractionContractSnapshot,
  hasVerifiedLinkedDocumentFieldValue,
} from './extractionContract';
import { NAME_CHANGE_FORM_BUILDERS } from './formRegistry';
import { buildDraftNameChangeDocumentMetadataFromSnapshot, buildNameChangeSnapshotBackedExtractedFields } from './intakeDraft';
import { buildNameChangeTargetChecklist } from './targetChecklist';
import { NAME_CHANGE_EXECUTION_TARGETS } from './targets';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExecutionTargetKey,
  NameChangeExtractedFieldInput,
  NameChangePlan,
  NameChangeReminderInput,
  NameChangeTargetExecutionSnapshot,
} from './types';

function getNameChangeTargetExecutionTimestamp(value: string | null | undefined): number {
  const trimmed = value?.trim();
  if (!trimmed) return Number.NEGATIVE_INFINITY;

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  const date = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(trimmed);
  if (
    dateOnlyMatch
    && (date.getFullYear() !== Number(dateOnlyMatch[1])
      || date.getMonth() !== Number(dateOnlyMatch[2]) - 1
      || date.getDate() !== Number(dateOnlyMatch[3]))
  ) {
    return Number.NEGATIVE_INFINITY;
  }
  return Number.isNaN(date.getTime()) ? Number.NEGATIVE_INFINITY : date.getTime();
}

function getDocumentIssuingAuthority(document: NameChangeDocumentInput | undefined) {
  if (!document) return null;
  const snapshotMetadata = buildDraftNameChangeDocumentMetadataFromSnapshot(document.extracted_snapshot);
  return document.issuing_authority?.trim() || snapshotMetadata.issuingAuthority?.trim() || null;
}

function getDocumentExpirationDate(document: NameChangeDocumentInput | undefined) {
  if (!document) return null;
  const snapshotMetadata = buildDraftNameChangeDocumentMetadataFromSnapshot(document.extracted_snapshot);
  return document.expires_on?.trim() || snapshotMetadata.expiresOn?.trim() || null;
}

function hasDualPartnerNameChange(profile: NameChangeCaseInput) {
  return profile.structured_intake.bothPartnersChangeName === true
    || profile.change_reasons.some((reason) => /both_partners_change_name|dual/i.test(reason));
}

function isDualPartnerExecutionTarget(targetKey: NameChangeExecutionTargetKey) {
  return [
    'ssa',
    'dmv',
    'employer',
    'taxes',
    'legalGovernment',
    'banks',
    'insurance',
    'medical',
    'utilities',
    'courtesy',
    'voter',
    'tsa',
    'licenses',
  ].includes(targetKey);
}

const TARGET_STATUS_VAULT_STEP_IDS: Partial<Record<NameChangeExecutionTargetKey, string[]>> = {
  courtOrder: ['eligibility-proof', 'state-court-order'],
  ssa: ['federal-ssa'],
  dmv: ['state-dmv'],
  passport: ['federal-passport'],
  employer: ['institution-irs-employer', 'institution-retirement-benefits'],
  taxes: ['institution-irs-records', 'institution-state-tax-agency'],
  legalGovernment: ['institution-county-recorder-property', 'institution-uscis-immigration-records'],
  banks: [
    'institution-banks',
    'institution-investments-loans',
    'institution-student-loans-financial-aid',
    'institution-mortgage-property-records',
    'institution-credit-bureaus',
  ],
  insurance: [
    'institution-insurance',
    'institution-disability-insurance',
    'institution-workers-comp-leave',
  ],
  medical: ['institution-medical-records'],
  utilities: ['institution-utilities-housing', 'institution-phone-digital-identity'],
  courtesy: ['institution-subscriptions-social', 'institution-school-alumni-records', 'institution-courtesy-social-sync'],
  voter: ['institution-voter-registration'],
  tsa: [
    'institution-tsa-precheck',
    'institution-travel-hospitality',
    'institution-dmv-registration-title',
    'institution-frequent-flyer-hotel-rail',
  ],
  licenses: ['institution-professional-licenses'],
};

function getSupportiveExecutionWaitGuidance(snapshot: Pick<NameChangeTargetExecutionSnapshot, 'targetKey' | 'nextAction'>) {
  const blockingLabel = snapshot.nextAction.label.replace(/^Unblock\s+/, '').trim();
  if (!blockingLabel) return undefined;

  if (snapshot.targetKey === 'passport') {
    if (/marriage-certificate county|certificate number|issuing authority/i.test(blockingLabel)) {
      return {
        doNow: 'Pull the reviewed marriage certificate, issuing county name, certificate number, and issuing office into one proof note now.',
        whyItHelps: 'That gives the passport packet the exact out-of-state reference details it needs once filing moves.',
        canWait: 'Actual submission can safely wait until the marriage-certificate grounding is complete.',
      };
    }

    if (/non-u\.s\.|non-us/i.test(blockingLabel)) {
      return {
        doNow: 'Gather your current passport, citizenship record, and the country-specific change instructions now.',
        whyItHelps: 'That makes the handoff faster once the right consulate or foreign passport authority path is confirmed.',
        canWait: 'Actual submission can safely wait until the correct authority is confirmed.',
      };
    }

    if (/first-passport/i.test(blockingLabel)) {
      return {
        doNow: 'Gather citizenship proof, photo ID, and the in-person acceptance packet details now.',
        whyItHelps: 'That keeps the first-passport packet ready once the initial application path is confirmed.',
        canWait: 'Actual submission can safely wait until the first-passport branch is confirmed.',
      };
    }

    if (/amendment or renewal/i.test(blockingLabel)) {
      return {
        doNow: 'Pull the current passport, issue date, and the supporting name-change proof you would use for either branch now.',
        whyItHelps: 'That makes it faster to lock the correct DS form path once the amendment-versus-renewal rule is confirmed.',
        canWait: 'Actual submission can safely wait until the correct passport filing path is confirmed.',
      };
    }

    if (/finish ssa before passport packet/i.test(blockingLabel)) {
      return {
        doNow: 'Prep the passport photo, current passport, and citizenship proof now, but hold the packet until SSA progress is real.',
        whyItHelps: 'That keeps the passport handoff ready without getting ahead of the federal identity chain.',
        canWait: 'Actual submission can safely wait until SSA progress clears the passport dependency.',
      };
    }

    if (/split passport work into two partner chains/i.test(blockingLabel)) {
      return {
        doNow: 'Separate each partner’s passport proof, travel bookings, and submission timing into two distinct checklists now.',
        whyItHelps: 'That prevents one partner’s passport timing from scrambling the other partner’s travel and filing path.',
        canWait: 'Actual submission can safely wait until each partner has a clean separate passport chain.',
      };
    }
  }

  if (snapshot.targetKey === 'courtOrder') {
    if (/ground court-order jurisdiction review/i.test(blockingLabel)) {
      return {
        doNow: 'Confirm the filing county, residence county, and any court location details now.',
        whyItHelps: 'That grounds the court-order path in the right jurisdiction before downstream packet prep leans on it.',
        canWait: 'Actual downstream filing can safely wait until the court-order jurisdiction context is grounded.',
      };
    }

    if (/upload court-order proof/i.test(blockingLabel)) {
      return {
        doNow: 'Pull the petition, filing receipt, hearing details, or signed order draft into one place now.',
        whyItHelps: 'That makes the court-order packet faster to review once the proof is actually in intake.',
        canWait: 'Downstream SSA, DMV, and passport updates can safely wait until the court-order proof is uploaded.',
      };
    }

    if (
      /review court-order proof|court-order path readiness|court-order target legal name|case reference fields|capture court-order target (first|middle|last) name|capture court-order case number|capture court-order signed date|review court-order extraction grounding/i
        .test(blockingLabel)
    ) {
      return {
        doNow: 'Confirm the exact target legal name, case number, and hearing or signed-order status now.',
        whyItHelps: 'That keeps the court-order packet grounded before downstream government and account updates depend on it.',
        canWait: 'Actual downstream filing can safely wait until the court-order path is verified.',
      };
    }
  }

  if (/open two ssa partner packets/i.test(blockingLabel)) {
    return {
      doNow: 'Split each partner into a separate SS-5 packet, evidence stack, and appointment or mailing checklist now.',
      whyItHelps: 'That keeps one partner’s federal proof or submission timing from blocking the other partner’s SSA chain.',
      canWait: 'Actual submission can safely wait until both partner packets are cleanly separated.',
    };
  }

  if (/open two dmv partner appointment tracks/i.test(blockingLabel)) {
    return {
      doNow: 'Break out separate DMV appointment timing, temporary-ID handling, and title follow-through notes for each partner now.',
      whyItHelps: 'That keeps the state-ID chain honest when one partner can finish DMV earlier than the other.',
      canWait: 'Actual submission can safely wait until each partner has a separate DMV track.',
    };
  }

  if (/track separate partner completion proof/i.test(blockingLabel)) {
    return {
      doNow: 'Create one completion checklist and proof bucket per partner for this downstream lane now.',
      whyItHelps: 'That prevents shared account rollout from looking done when only one partner’s update actually cleared.',
      canWait: 'Actual submission can safely wait until both partner proof tracks are separated.',
    };
  }

  if (/split travel-profile follow-through by partner/i.test(blockingLabel)) {
    return {
      doNow: 'Break TSA, airline, loyalty, and booked-trip follow-through into one proof checklist per partner now.',
      whyItHelps: 'That keeps one partner’s travel timing or traveler-profile change from hiding incomplete rollout for the other partner.',
      canWait: 'Actual travel-profile submissions can safely wait until each partner has a separate travel rollout track.',
    };
  }

  if (/track downstream rollout separately for each partner/i.test(blockingLabel)) {
    return {
      doNow: 'Create one downstream checklist, mailed-notice log, and proof bucket per partner for this lane now.',
      whyItHelps: 'That keeps a shared rollout lane from collapsing two different completion states into one fake finish.',
      canWait: 'Actual submission can safely wait until both partner rollout tracks are separated.',
    };
  }

  if (
    snapshot.targetKey === 'tsa'
    && /marriage-certificate county|certificate number|issuing authority/i.test(blockingLabel)
  ) {
    return {
      doNow: 'Pull the reviewed marriage certificate, issuing county name, certificate number, and issuing office into one proof note now.',
      whyItHelps: 'That keeps travel, title, and loyalty follow-through aligned once the out-of-state proof details are grounded.',
      canWait: 'Actual submission can safely wait until the marriage-certificate grounding is complete.',
    };
  }

  if (snapshot.nextAction.category !== 'dependency') return undefined;

  switch (snapshot.targetKey) {
    case 'banks':
    case 'insurance':
    case 'medical':
    case 'utilities':
      return {
        doNow: 'Gather account numbers, policy details, and contact routes now.',
        whyItHelps: `That handoff moves faster once ${blockingLabel} clears.`,
        canWait: 'Actual submission can safely wait.',
      };
    case 'employer':
    case 'licenses':
      return {
        doNow: 'Collect HR, payroll, or licensing contacts now.',
        whyItHelps: `That handoff gets easier once ${blockingLabel} clears.`,
        canWait: 'Actual submission can safely wait.',
      };
    case 'taxes':
      return {
        doNow: 'Line up prior returns, withholding records, and state login access now.',
        whyItHelps: `Filing follow-through gets easier once ${blockingLabel} clears.`,
        canWait: 'Actual submission can safely wait.',
      };
    case 'legalGovernment':
      return {
        doNow: 'Gather filing references, alien-number or case IDs, and county recording details now.',
        whyItHelps: `Government follow-through gets easier once ${blockingLabel} clears.`,
        canWait: 'Actual submission can safely wait.',
      };
    case 'voter':
      return {
        doNow: 'Confirm your registration jurisdiction and current voter record now.',
        whyItHelps: `That update goes faster once ${blockingLabel} clears.`,
        canWait: 'Actual submission can safely wait.',
      };
    case 'tsa':
      if (/dmv|photo id/i.test(blockingLabel)) {
        return {
          doNow: 'Review upcoming bookings, traveler profiles, loyalty accounts, title records, and auto-policy details now.',
          whyItHelps: 'That keeps travel, title, and auto-policy updates lined up once the DMV identity chain is moving.',
          canWait: 'Actual submission can safely wait.',
        };
      }

      return {
        doNow: 'Review upcoming bookings, traveler profiles, loyalty accounts, title records, and auto-policy details now.',
        whyItHelps: `That sync goes quicker once ${blockingLabel} clears.`,
        canWait: 'Actual submission can safely wait.',
      };
    case 'courtesy':
      return {
        doNow: 'List the low-stakes profiles and social accounts you want to touch later now.',
        whyItHelps: `Cleanup is easier once ${blockingLabel} clears.`,
        canWait: 'Actual submission can safely wait.',
      };
    default:
      return undefined;
  }
}

export function hasExecutionSupportiveWaitGuidance(
  snapshot: Pick<NameChangeTargetExecutionSnapshot, 'targetKey' | 'nextAction'>,
) {
  const parsedGuidance = parseExecutionNextActionGuidance(snapshot.nextAction.detail);
  return Boolean(
    parsedGuidance.doNow
    || parsedGuidance.whyItHelps
    || parsedGuidance.canWait
    || getSupportiveExecutionWaitGuidance(snapshot),
  );
}

function parseExecutionNextActionGuidance(detail: string) {
  const trimmed = detail.trim();
  const labelPattern = /(Do now|Why it helps|Can wait):\s*/g;
  const firstLabelMatch = labelPattern.exec(trimmed);

  if (!firstLabelMatch) {
    return {
      overview: trimmed,
      doNow: null,
      whyItHelps: null,
      canWait: null,
    };
  }

  const guidance = {
    overview: trimmed.slice(0, firstLabelMatch.index).trim(),
    doNow: null as string | null,
    whyItHelps: null as string | null,
    canWait: null as string | null,
  };

  let currentLabel = firstLabelMatch[1] as 'Do now' | 'Why it helps' | 'Can wait';
  let currentIndex = labelPattern.lastIndex;
  let nextMatch = labelPattern.exec(trimmed);

  while (true) {
    const value = trimmed.slice(currentIndex, nextMatch?.index ?? trimmed.length).trim();
    if (currentLabel === 'Do now') guidance.doNow = value || null;
    if (currentLabel === 'Why it helps') guidance.whyItHelps = value || null;
    if (currentLabel === 'Can wait') guidance.canWait = value || null;
    if (!nextMatch) break;
    currentLabel = nextMatch[1] as 'Do now' | 'Why it helps' | 'Can wait';
    currentIndex = labelPattern.lastIndex;
    nextMatch = labelPattern.exec(trimmed);
  }

  return guidance;
}

export function getExecutionNextActionGuidance(
  snapshot: Pick<NameChangeTargetExecutionSnapshot, 'targetKey' | 'nextAction'>,
) {
  const parsedGuidance = parseExecutionNextActionGuidance(snapshot.nextAction.detail);
  if (parsedGuidance.doNow || parsedGuidance.whyItHelps || parsedGuidance.canWait) {
    return parsedGuidance;
  }

  const overview = parsedGuidance.overview;
  const supportiveWaitGuidance = getSupportiveExecutionWaitGuidance(snapshot);
  if (!supportiveWaitGuidance) {
    return {
      overview,
      doNow: null,
      whyItHelps: null,
      canWait: null,
    };
  }

  return {
    overview,
    doNow: supportiveWaitGuidance.doNow,
    whyItHelps: supportiveWaitGuidance.whyItHelps,
    canWait: supportiveWaitGuidance.canWait,
  };
}

export function getExecutionNextActionDetail(snapshot: Pick<NameChangeTargetExecutionSnapshot, 'targetKey' | 'nextAction'>) {
  const guidance = getExecutionNextActionGuidance(snapshot);
  if (!guidance.doNow && !guidance.whyItHelps && !guidance.canWait) {
    return snapshot.nextAction.detail;
  }

  if (snapshot.nextAction.detail.includes('Actual submission can safely wait.')) {
    return snapshot.nextAction.detail;
  }

  return [
    guidance.overview,
    guidance.doNow ? `Do now: ${guidance.doNow}` : null,
    guidance.whyItHelps ? `Why it helps: ${guidance.whyItHelps}` : null,
    guidance.canWait ? `Can wait: ${guidance.canWait}` : null,
  ].filter(Boolean).join(' ');
}

export function getExecutionStatusVaultNotes(
  snapshot: Pick<NameChangeTargetExecutionSnapshot, 'targetKey' | 'nextAction'> & {
    statusVault: Pick<NameChangeTargetExecutionSnapshot['statusVault'], 'notes'>;
  },
) {
  if (!snapshot.nextAction) {
    return snapshot.statusVault.notes;
  }

  const guidedNextActionDetail = getExecutionNextActionDetail(snapshot);
  return snapshot.statusVault.notes.filter((note) => note !== guidedNextActionDetail);
}

function getTargetStatusVaultSnapshot(
  targetKey: NameChangeExecutionTargetKey,
  plan: NameChangePlan | null | undefined,
  reminders: NameChangeReminderInput[],
  checklist: NameChangeTargetExecutionSnapshot['checklist'],
  ready: boolean,
  blockers: string[],
  nextAction: NameChangeTargetExecutionSnapshot['nextAction'],
): NameChangeTargetExecutionSnapshot['statusVault'] {
  const relevantStepIds = new Set(TARGET_STATUS_VAULT_STEP_IDS[targetKey] ?? []);
  const relevantSteps = (plan?.steps ?? []).filter((step) => relevantStepIds.has(step.id));
  const relevantMilestones = (plan?.summary.milestoneChecklist ?? []).filter((milestone) => milestone.dependsOnStepIds.some((stepId) => relevantStepIds.has(stepId)));
  const latestExecutionUpdatedAt = relevantSteps
    .flatMap((step) => [step.executionUpdatedAt, step.completedAt])
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => getNameChangeTargetExecutionTimestamp(right) - getNameChangeTargetExecutionTimestamp(left))[0] ?? null;
  const latestMilestoneUpdatedAt = relevantMilestones
    .filter((milestone) => milestone.status === 'in_progress' || milestone.status === 'complete')
    .map((milestone) => milestone.lastUpdatedAt ?? null)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => getNameChangeTargetExecutionTimestamp(right) - getNameChangeTargetExecutionTimestamp(left))[0] ?? null;
  const explicitNotes = relevantSteps
    .map((step) => step.executionNote?.trim() || null)
    .filter((note): note is string => Boolean(note));
  const milestoneNotes = relevantMilestones
    .filter((milestone) => milestone.status === 'in_progress' || milestone.status === 'complete')
    .map((milestone) => `${milestone.status === 'complete' ? 'Confirmed' : 'Tracking'} milestone: ${milestone.label}`);
  const milestoneCounts = relevantMilestones.reduce(
    (summary, milestone) => {
      if (milestone.status === 'complete') {
        summary.complete += 1;
      } else if (milestone.status === 'in_progress') {
        summary.inProgress += 1;
      }

      summary.total += 1;
      return summary;
    },
    { inProgress: 0, complete: 0, total: 0 },
  );
  const missingChecklist = checklist.filter((item) => item.status === 'missing');
  const attentionChecklist = checklist.filter((item) => item.status === 'attention');
  const readyChecklist = checklist.filter((item) => item.status === 'ready');
  const executionCounts = relevantSteps.reduce(
    (summary, step) => {
      if (step.executionStatus === 'complete') {
        summary.complete += 1;
      } else if (step.executionStatus === 'in_progress') {
        summary.inProgress += 1;
      } else {
        summary.todo += 1;
      }

      summary.total += 1;
      return summary;
    },
    { todo: 0, inProgress: 0, complete: 0, total: 0 },
  );
  const proofCounts = `${readyChecklist.length}/${checklist.length} checks ready`;
  const proofIssues = [...missingChecklist, ...attentionChecklist]
    .slice(0, 2)
    .map((item) => item.label)
    .join('; ');
  const proofStateSummary = [
    missingChecklist.length > 0 ? `${missingChecklist.length} missing` : null,
    attentionChecklist.length > 0 ? `${attentionChecklist.length} attention` : null,
  ].filter((value): value is string => Boolean(value)).join(' • ');
  const proofSummary = proofIssues
    ? `${proofCounts} • ${proofStateSummary} • Needs ${proofIssues}`
    : `${proofCounts} • Proof stack looks grounded`;
  const targetReminders = reminders.filter((reminder) => reminder.focus_target_id === targetKey && reminder.status !== 'dismissed');
  const openTargetReminders = targetReminders.filter((reminder) => reminder.status === 'pending' || reminder.status === 'scheduled');
  const latestReminder = [...openTargetReminders]
    .filter((reminder) => Boolean(reminder.updated_at))
    .sort((left, right) => getNameChangeTargetExecutionTimestamp(right.updated_at) - getNameChangeTargetExecutionTimestamp(left.updated_at))[0] ?? null;
  const latestReminderAt = latestReminder?.updated_at ?? null;
  const lastTouchedAt = [latestExecutionUpdatedAt, latestMilestoneUpdatedAt, latestReminderAt]
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => getNameChangeTargetExecutionTimestamp(right) - getNameChangeTargetExecutionTimestamp(left))[0] ?? null;
  const lastTouchedSource = lastTouchedAt === latestReminderAt && latestReminderAt
    ? 'reminder' as const
    : lastTouchedAt === latestMilestoneUpdatedAt && latestMilestoneUpdatedAt
      ? 'milestone' as const
    : lastTouchedAt === latestExecutionUpdatedAt && latestExecutionUpdatedAt
      ? 'execution' as const
      : null;

  let status: NameChangeTargetExecutionSnapshot['statusVault']['status'] = 'todo';
  const hasTrackedExecution = executionCounts.total > 0;
  const allTrackedStepsComplete = hasTrackedExecution && executionCounts.complete === executionCounts.total;
  if (allTrackedStepsComplete) {
    status = 'complete';
  } else if (executionCounts.inProgress > 0 || executionCounts.complete > 0) {
    status = 'in_progress';
  } else if (blockers.length > 0) {
    status = 'blocked';
  } else if (ready) {
    status = 'ready';
  }

  const reminderNote = latestReminder?.reason
    ? `Reminder: ${latestReminder.label} — ${latestReminder.reason}`
    : latestReminder?.label
      ? `Reminder: ${latestReminder.label}`
      : null;
  const executionNote = explicitNotes[0] ?? nextAction?.detail ?? blockers[0] ?? null;
  const milestoneNote = milestoneNotes[0] ?? null;
  const proofNote = proofIssues ? `Proof needs: ${proofIssues}` : null;
  const primaryExecutionNote = explicitNotes[0] ?? null;
  const fallbackNotes = explicitNotes.length > 0
    ? explicitNotes
    : milestoneNotes.length > 0
      ? milestoneNotes
      : nextAction
        ? [getExecutionNextActionDetail({ targetKey, nextAction })]
        : blockers.slice(0, 2);
  const prioritizedNotes = [
    lastTouchedSource === 'reminder' ? reminderNote : (primaryExecutionNote ?? milestoneNote ?? executionNote),
    lastTouchedSource === 'reminder' ? (primaryExecutionNote ?? milestoneNote ?? executionNote) : reminderNote,
    milestoneNote,
    proofNote,
    ...fallbackNotes,
  ].filter((note, index, items): note is string => Boolean(note) && items.indexOf(note) === index);

  return {
    status,
    proofSummary,
    proofCounts: {
      ready: readyChecklist.length,
      attention: attentionChecklist.length,
      missing: missingChecklist.length,
      total: checklist.length,
    },
    notes: prioritizedNotes,
    executionNote,
    milestoneNote,
    proofNote,
    reminderNote,
    lastUpdatedAt: latestExecutionUpdatedAt,
    milestoneUpdatedAt: latestMilestoneUpdatedAt,
    lastTouchedAt,
    lastTouchedSource,
    executionCounts,
    milestoneCounts,
    reminderSummary: {
      openCount: targetReminders.filter((reminder) => reminder.status === 'pending' || reminder.status === 'scheduled').length,
      highUrgencyCount: openTargetReminders.filter((reminder) => reminder.urgency === 'high').length,
      latestReminderAt,
    },
  };
}

function isDualPartnerDownstreamExecutionTarget(targetKey: NameChangeExecutionTargetKey) {
  return targetKey !== 'ssa' && targetKey !== 'dmv';
}

export function buildNameChangeTargetExecutionSnapshot(
  targetKey: NameChangeExecutionTargetKey,
  profile: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
  plan: NameChangePlan | null = null,
  reminders: NameChangeReminderInput[] = [],
): NameChangeTargetExecutionSnapshot {
  const mergedExtractedFields = buildNameChangeSnapshotBackedExtractedFields(documents, extractedFields);
  const target = NAME_CHANGE_EXECUTION_TARGETS[targetKey];
  const autofill = buildNameChangeAutofillPrepSnapshot(profile, documents, extractedFields);
  const sequence = buildNameChangeExecutionSequenceSnapshot(targetKey, profile, documents, extractedFields, plan);
  const checklist = buildNameChangeTargetChecklist(target, profile, documents, extractedFields);
  const extraction = buildNameChangeExtractionContractSnapshot(profile, documents, mergedExtractedFields);
  const formPayload = NAME_CHANGE_FORM_BUILDERS[target.formBuilderKey](profile, documents, extractedFields);
  const gates = evaluateNameChangeExecutionGates(sequence.dependencies, checklist, formPayload);
  const fieldRisks = formPayload.fields
    .filter((field) => field.required && (!field.value || field.confidence === 'low'))
    .map((field) => ({
      fieldKey: field.fieldKey,
      label: field.label,
      severity: field.value ? 'blocking' as const : 'attention' as const,
      reason: field.value
        ? `${field.label} is populated from a low-confidence source and still needs stronger document support.`
        : `${field.label} is still missing from the current packet draft.`,
      source: field.source,
      confidence: field.confidence,
      sourceDocumentKind: field.sourceDocumentKind,
      sourceFieldKey: field.sourceFieldKey,
    }));
  const blockingFieldRisks = fieldRisks.filter((risk) => risk.severity === 'blocking').length;
  const attentionFieldRisks = fieldRisks.filter((risk) => risk.severity === 'attention').length;
  const lowConfidenceFields = formPayload.fields.filter((field) => field.required && field.value && field.confidence === 'low').length;
  const missingFields = formPayload.fields.filter((field) => field.required && !field.value).length;
  const documentRepairDebt = new Set([
    ...fieldRisks
      .map((risk) => risk.sourceDocumentKind)
      .filter((kind): kind is NonNullable<typeof kind> => Boolean(kind)),
    ...target.checklistSpecs
      .filter((spec) => spec.kind === 'document_support')
      .filter((spec) => checklist.find((item) => item.key === spec.key)?.status !== 'ready')
      .map((spec) => spec.key),
  ]).size;
  const firstBlockingFieldRisk = fieldRisks.find((risk) => risk.severity === 'blocking');
  const firstMissingFieldRisk = fieldRisks.find((risk) => risk.severity === 'attention');
  const firstBlockingDependency = sequence.dependencies.find((dependency) => dependency.blocksReady ?? (dependency.required && dependency.status === 'missing'));
  const travelDmvDependency = targetKey === 'tsa' && profile.structured_intake.travelBookedSoon
    ? sequence.dependencies.find((dependency) => dependency.key === 'dmv-progress' && dependency.status !== 'satisfied') ?? null
    : null;
  const firstAttentionDependency = sequence.dependencies.find((dependency) => dependency.status === 'attention');
  const firstMissingChecklistItem = checklist.find((item) => item.status === 'missing');
  const firstBlockingAttentionChecklistItem = checklist.find((item) => item.status === 'attention' && item.blocksReady);
  const primaryCanonicalConflict = extraction.conflicts[0] ?? null;
  const firstAttentionChecklistItem = checklist.find((item) => item.status === 'attention');
  const checklistSpecByKey = new Map(target.checklistSpecs.map((spec) => [spec.key, spec]));
  const getChecklistDocumentKind = (item: typeof checklist[number]) => {
    const documentKinds = checklistSpecByKey.get(item.key)?.documentKinds ?? [];
    return item.kind === 'document_support' && documentKinds.length === 1 ? documentKinds[0] : undefined;
  };
  const buildCourtOrderNextAction = () => {
    const hasVerifiedCourtOrderTargetFirstName = hasVerifiedLinkedDocumentFieldValue(documents, mergedExtractedFields, 'court_order', 'first_name');
    const hasVerifiedCourtOrderTargetMiddleName = hasVerifiedLinkedDocumentFieldValue(documents, mergedExtractedFields, 'court_order', 'middle_name');
    const hasVerifiedCourtOrderTargetLastName = hasVerifiedLinkedDocumentFieldValue(documents, mergedExtractedFields, 'court_order', 'last_name');
    const hasVerifiedCourtOrderCaseNumber = hasVerifiedLinkedDocumentFieldValue(documents, mergedExtractedFields, 'court_order', 'case_number');
    const hasVerifiedCourtOrderSignedDate = hasVerifiedLinkedDocumentFieldValue(documents, mergedExtractedFields, 'court_order', 'court_order_date');
    const needsVerifiedCourtOrderTargetMiddleName = Boolean(profile.target_middle_name || profile.current_middle_name);
    const courtOrderKinds = new Set(getNameChangeDocumentKindAliases('court_order'));
    const courtOrderDocuments = documents.filter((document) => courtOrderKinds.has(document.document_kind));
    const hasCourtOrderProof = courtOrderDocuments.length > 0;
    const hasReviewedCourtOrderProof = courtOrderDocuments.some((document) => document.intake_status === 'reviewed');
    const referenceExtractionDependency = sequence.dependencies.find((dependency) => dependency.key === 'court-order-reference-extraction');
    const hasCompleteCourtOrderGrounding = hasVerifiedCourtOrderTargetFirstName
      && hasVerifiedCourtOrderTargetLastName
      && (!needsVerifiedCourtOrderTargetMiddleName || hasVerifiedCourtOrderTargetMiddleName)
      && hasVerifiedCourtOrderCaseNumber
      && hasVerifiedCourtOrderSignedDate;

    if (referenceExtractionDependency && !hasCompleteCourtOrderGrounding) {
      const label = !hasCourtOrderProof
        ? 'Upload court-order proof'
        : !hasReviewedCourtOrderProof
          ? 'Review court-order proof'
          : !hasVerifiedCourtOrderTargetFirstName
            && (!needsVerifiedCourtOrderTargetMiddleName || !hasVerifiedCourtOrderTargetMiddleName)
            && !hasVerifiedCourtOrderTargetLastName
            ? 'Capture court-order target legal name + case reference fields'
            : !hasVerifiedCourtOrderTargetFirstName
              ? 'Capture court-order target first name'
              : needsVerifiedCourtOrderTargetMiddleName && !hasVerifiedCourtOrderTargetMiddleName
                ? 'Capture court-order target middle name'
                : !hasVerifiedCourtOrderTargetLastName
                  ? 'Capture court-order target last name'
                  : !hasVerifiedCourtOrderCaseNumber
                    ? 'Capture court-order case number'
                    : !hasVerifiedCourtOrderSignedDate
                      ? 'Capture court-order signed date'
                      : 'Review court-order extraction grounding';

      return {
        category: 'document' as const,
        label,
        detail: referenceExtractionDependency.reason,
        documentKind: 'court_order' as const,
      };
    }

    const jurisdictionDependency = sequence.dependencies.find((dependency) => dependency.key === 'court-order-jurisdiction-context' && dependency.status === 'missing');
    if (jurisdictionDependency) {
      return {
        category: 'dependency' as const,
        label: 'Ground court-order jurisdiction review',
        detail: jurisdictionDependency.reason,
      };
    }

    return null;
  };
  const buildMarriageCertificateGroundingNextAction = () => {
    const groundingDependency = sequence.dependencies.find((dependency) => dependency.key === 'out-of-state-marriage-certificate-grounding');
    if (!groundingDependency) return null;

    const marriageCertificateKinds = new Set(getNameChangeDocumentKindAliases('marriage_certificate'));
    const marriageCertificateDocuments = documents.filter((document) => marriageCertificateKinds.has(document.document_kind));
    const hasMarriageCertificate = marriageCertificateDocuments.length > 0;
    const hasReviewedMarriageCertificate = marriageCertificateDocuments.some((document) => document.intake_status === 'reviewed');
    const hasVerifiedMarriageCertificateCounty = hasVerifiedLinkedDocumentFieldValue(documents, mergedExtractedFields, 'marriage_certificate', 'county');
    const hasVerifiedMarriageCertificateNumber = hasVerifiedLinkedDocumentFieldValue(documents, mergedExtractedFields, 'marriage_certificate', 'certificate_number');
    const hasMarriageCertificateIssuingAuthority = marriageCertificateDocuments.some((document) => Boolean(getDocumentIssuingAuthority(document)));

    if (groundingDependency.status !== 'missing' && groundingDependency.status !== 'attention') return null;

    const label = !hasMarriageCertificate
      ? 'Upload marriage certificate'
      : !hasReviewedMarriageCertificate
        ? 'Review marriage certificate'
        : !hasVerifiedMarriageCertificateCounty && !hasVerifiedMarriageCertificateNumber && !hasMarriageCertificateIssuingAuthority
          ? 'Capture marriage-certificate county + certificate number + issuing authority'
          : !hasVerifiedMarriageCertificateCounty && !hasVerifiedMarriageCertificateNumber
            ? 'Capture marriage-certificate county + certificate number'
            : !hasVerifiedMarriageCertificateCounty && !hasMarriageCertificateIssuingAuthority
              ? 'Capture marriage-certificate county + issuing authority'
              : !hasVerifiedMarriageCertificateNumber && !hasMarriageCertificateIssuingAuthority
                ? 'Capture marriage-certificate certificate number + issuing authority'
                : !hasVerifiedMarriageCertificateCounty
                  ? 'Capture marriage-certificate county'
                  : !hasVerifiedMarriageCertificateNumber
                    ? 'Capture marriage-certificate certificate number'
                    : !hasMarriageCertificateIssuingAuthority
                      ? 'Capture marriage-certificate issuing authority'
                      : 'Review marriage-certificate grounding';

    return {
      category: 'document' as const,
      label,
      detail: groundingDependency.reason,
      documentKind: 'marriage_certificate' as const,
    };
  };
  const buildPassportBranchNextAction = () => {
    if (targetKey !== 'passport' && targetKey !== 'tsa') return null;

    const citizenshipDependency = sequence.dependencies.find((dependency) => dependency.key === 'citizenship-eligibility' && dependency.status === 'missing');
    if (citizenshipDependency) {
      return {
        category: 'dependency' as const,
        label: 'Route non-U.S. passport follow-through',
        detail: citizenshipDependency.reason,
      };
    }

    const passportEligibilityDependency = sequence.dependencies.find((dependency) => dependency.key === 'passport-eligibility-path' && dependency.status !== 'satisfied');

    if (!profile.has_us_passport && passportEligibilityDependency?.status === 'missing') {
      return {
        category: 'document' as const,
        label: 'Add citizenship proof for first-passport branch',
        detail: passportEligibilityDependency.reason,
        documentKind: 'birth_certificate' as const,
      };
    }

    if (!profile.has_us_passport) {
      return {
        category: 'review' as const,
        label: 'Confirm first-passport eligibility path',
        detail: targetKey === 'tsa'
          ? 'Travel-profile follow-through depends on a first-passport branch, so confirm the initial application path and packet before treating TSA updates like a standard passport-renewal chain.'
          : 'This passport update is really a first-passport branch, so confirm the initial application path and packet before treating it like a standard renewal.',
      };
    }

    if (passportEligibilityDependency) {
      return {
        category: 'review' as const,
        label: profile.has_us_passport ? 'Confirm passport amendment or renewal path' : 'Confirm first-passport eligibility path',
        detail: passportEligibilityDependency.reason,
      };
    }

    const passportExpirationDependency = sequence.dependencies.find((dependency) => dependency.key === 'passport-expiration-grounding' && dependency.status === 'missing');
    const currentPassportDocument = documents.find((document) => document.document_kind === 'current_passport');
    if (profile.has_us_passport && profile.structured_intake.travelBookedSoon && passportExpirationDependency && !getDocumentExpirationDate(currentPassportDocument)) {
      return {
        category: 'document' as const,
        label: targetKey === 'tsa'
          ? 'Add passport expiration date before TSA travel updates'
          : 'Add passport expiration date before passport travel review',
        detail: passportExpirationDependency.reason,
        documentKind: 'current_passport' as const,
      };
    }

    const ssaDependency = sequence.dependencies.find((dependency) => dependency.key === 'federal-ssa-progress' && dependency.status !== 'satisfied');
    if (ssaDependency) {
      return {
        category: 'dependency' as const,
        label: 'Finish SSA before passport packet',
        detail: ssaDependency.reason,
      };
    }

    if (hasDualPartnerNameChange(profile)) {
      return {
        category: 'review' as const,
        label: 'Split passport work into two partner chains',
        detail: 'Both partners are changing names, so passport follow-through should track separate document packets, travel timing, and submission checkpoints for each partner.',
      };
    }

    return null;
  };
  const buildTravelTimingNextAction = () => {
    const hasTravelTimingGuidance = Boolean(profile.structured_intake.travelBookedSoon);
    if (!hasTravelTimingGuidance) return null;

    if (targetKey === 'tsa') {
      return {
        category: 'review' as const,
        label: 'Review traveler-profile timing before TSA updates',
        detail: 'Upcoming travel is already booked, so line up TSA, airline traveler profiles, loyalty accounts, and booking-name changes with the same passport and DMV identity chain. Do not switch travel profiles onto the new name while booked trips still depend on the old-name documents.',
      };
    }

    return null;
  };
  const buildInternationalTravelIdentityNextAction = () => {
    const hasInternationalPassportGuidance = Boolean(
      !profile.is_us_citizen
      || plan?.summary.edgeCaseGuidance?.some((item) => item.id === 'edge-non-us-passport'),
    );
    if (!hasInternationalPassportGuidance || targetKey !== 'tsa') return null;

    return {
      category: 'review' as const,
      label: 'Route travel-profile updates through the non-U.S. passport chain',
      detail: 'This case depends on a non-U.S. passport or immigration identity path, so keep TSA, airline traveler profiles, loyalty accounts, and booking-name updates aligned with that same international document chain instead of assuming the standard U.S. passport flow.',
    };
  };
  const buildNameFormatConsistencyNextAction = () => {
    const hyphenatedGuidance = plan?.summary.edgeCaseGuidance?.find((item) => item.id === 'edge-hyphenated-name');
    const dualNameGuidance = plan?.summary.edgeCaseGuidance?.find((item) => item.id === 'edge-dual-name-path');
    const activeGuidance = hyphenatedGuidance ?? dualNameGuidance;
    if (!activeGuidance) return null;

    if (!['ssa', 'dmv', 'passport', 'employer', 'tsa'].includes(targetKey)) return null;

    const label = hyphenatedGuidance
      ? 'Review surname formatting before submission'
      : 'Review dual-surname order before submission';

    return {
      category: 'review' as const,
      label,
      detail: activeGuidance.detail,
    };
  };
  const buildDualPartnerExecutionNextAction = () => {
    if (!hasDualPartnerNameChange(profile) || !isDualPartnerExecutionTarget(targetKey)) return null;

    if (targetKey === 'ssa') {
      return {
        category: 'packet' as const,
        label: 'Open two SSA partner packets',
        detail: 'Both partners are changing names, so SSA execution should branch into one SS-5 packet, evidence stack, and submission checkpoint set per partner instead of one shared federal chain.',
      };
    }

    if (targetKey === 'dmv') {
      return {
        category: 'packet' as const,
        label: 'Open two DMV partner appointment tracks',
        detail: 'Both partners are changing names, so DMV execution should branch into separate appointment timing, temporary-ID handling, and title/registration follow-through per partner.',
      };
    }

    if (targetKey === 'tsa') {
      return {
        category: 'checklist' as const,
        label: 'Split travel-profile follow-through by partner',
        detail: 'Both partners are changing names, so TSA, airline traveler profiles, loyalty accounts, and booking-name updates should keep separate completion proof and booked-trip timing for each partner instead of one shared travel rollout.',
      };
    }

    if (isDualPartnerDownstreamExecutionTarget(targetKey)) {
      return {
        category: 'checklist' as const,
        label: 'Track separate partner completion proof',
        detail: `Both partners are changing names, so ${target.label.toLowerCase()} should keep separate completion status, confirmation artifacts, and mailed-notice proof for each partner. Mark this lane complete only after both partner tracks are finished.`,
      };
    }

    return {
      category: 'checklist' as const,
      label: 'Track downstream rollout separately for each partner',
      detail: 'Both partners are changing names, so this rollout lane should keep separate account confirmations, mailed notices, and completion proof for each partner instead of collapsing everything into one checklist.',
    };
  };
  const courtOrderNextAction = targetKey === 'courtOrder' ? buildCourtOrderNextAction() : null;
  const marriageCertificateGroundingNextAction = buildMarriageCertificateGroundingNextAction();
  const passportBranchNextAction = buildPassportBranchNextAction();
  const travelTimingNextAction = buildTravelTimingNextAction();
  const internationalTravelIdentityNextAction = buildInternationalTravelIdentityNextAction();
  const nameFormatConsistencyNextAction = buildNameFormatConsistencyNextAction();
  const dualPartnerExecutionNextAction = buildDualPartnerExecutionNextAction();
  const blockingFieldConflict = primaryCanonicalConflict && firstBlockingFieldRisk
    && primaryCanonicalConflict.documentKind === firstBlockingFieldRisk.sourceDocumentKind
    && primaryCanonicalConflict.fieldKey === firstBlockingFieldRisk.sourceFieldKey
      ? primaryCanonicalConflict
      : null;
  const getChecklistCategory = (item: typeof checklist[number]) => {
    if (item.nextActionCategory === 'document') {
      return 'document' as const;
    }

    if (item.nextActionCategory === 'packet') {
      return 'packet' as const;
    }

    if (item.nextActionCategory === 'review') {
      return 'review' as const;
    }

    if (item.kind === 'document_support') {
      return 'document' as const;
    }

    if (item.kind === 'field_presence') {
      return 'packet' as const;
    }

    return 'checklist' as const;
  };
  const getMissingChecklistLabel = (item: typeof checklist[number]) => {
    if (item.kind === 'field_presence') {
      return `Fill ${item.label}`;
    }

    return `Complete ${item.label}`;
  };
  const getAttentionChecklistCategory = (item: typeof checklist[number]) => {
    if (item.nextActionCategory === 'document') {
      return 'document' as const;
    }

    if (item.nextActionCategory === 'packet') {
      return 'packet' as const;
    }

    if (item.nextActionCategory === 'checklist') {
      return 'checklist' as const;
    }

    if (item.kind === 'document_support') {
      return 'document' as const;
    }

    if (item.kind === 'field_presence') {
      return 'packet' as const;
    }

    return 'review' as const;
  };
  const getAttentionChecklistLabel = (item: typeof checklist[number]) => {
    if (item.kind === 'field_presence') {
      return `Repair ${item.label}`;
    }

    return `Review ${item.label}`;
  };
  const getDependencyCategory = (
    dependency: NonNullable<typeof firstBlockingDependency>,
    fallback: 'dependency' | 'review',
  ) => {
    if (dependency.nextActionCategory === 'document') {
      return 'document' as const;
    }

    if (dependency.nextActionCategory === 'review') {
      return 'review' as const;
    }

    return fallback;
  };
  const getBlockingDependencyLabel = (dependency: NonNullable<typeof firstBlockingDependency>) => {
    const category = getDependencyCategory(dependency, 'dependency');
    return `${category === 'review' ? 'Review' : 'Unblock'} ${dependency.label}`;
  };
  const nextAction = blockingFieldConflict
    ? {
        category: 'document' as const,
        label: `Resolve ${blockingFieldConflict.documentKind.replace(/_/g, ' ')} conflict`,
        detail: blockingFieldConflict.reason,
        documentKind: blockingFieldConflict.documentKind,
      }
    : courtOrderNextAction
      ? courtOrderNextAction
    : marriageCertificateGroundingNextAction
      ? marriageCertificateGroundingNextAction
    : passportBranchNextAction
      ? passportBranchNextAction
    : internationalTravelIdentityNextAction
      ? internationalTravelIdentityNextAction
    : firstBlockingFieldRisk
      ? {
          category: 'packet' as const,
          label: `Repair ${firstBlockingFieldRisk.label}`,
          detail: firstBlockingFieldRisk.reason,
        }
    : firstBlockingDependency
      ? {
          category: getDependencyCategory(firstBlockingDependency, 'dependency'),
          label: getBlockingDependencyLabel(firstBlockingDependency),
          detail: firstBlockingDependency.reason,
        }
      : travelDmvDependency
        ? {
            category: getDependencyCategory(travelDmvDependency, 'dependency'),
            label: getBlockingDependencyLabel(travelDmvDependency),
            detail: travelDmvDependency.reason,
          }
      : travelTimingNextAction && targetKey === 'tsa'
        ? travelTimingNextAction
      : firstMissingChecklistItem
        ? {
            category: getChecklistCategory(firstMissingChecklistItem),
            label: getMissingChecklistLabel(firstMissingChecklistItem),
            detail: firstMissingChecklistItem.reason,
            documentKind: getChecklistCategory(firstMissingChecklistItem) === 'document'
              ? getChecklistDocumentKind(firstMissingChecklistItem)
              : undefined,
          }
        : firstBlockingAttentionChecklistItem
          ? {
              category: getAttentionChecklistCategory(firstBlockingAttentionChecklistItem),
              label: primaryCanonicalConflict
                ? `Resolve ${primaryCanonicalConflict.documentKind.replace(/_/g, ' ')} conflict`
                : getAttentionChecklistLabel(firstBlockingAttentionChecklistItem),
              detail: primaryCanonicalConflict
                ? primaryCanonicalConflict.reason
                : firstBlockingAttentionChecklistItem.reason,
              documentKind: primaryCanonicalConflict
                ? primaryCanonicalConflict.documentKind
                : getAttentionChecklistCategory(firstBlockingAttentionChecklistItem) === 'document'
                  ? getChecklistDocumentKind(firstBlockingAttentionChecklistItem)
                  : undefined,
            }
          : firstMissingFieldRisk
          ? {
              category: firstMissingFieldRisk.sourceDocumentKind ? 'document' as const : 'packet' as const,
              label: `Fill ${firstMissingFieldRisk.label}`,
              detail: firstMissingFieldRisk.reason,
              documentKind: firstMissingFieldRisk.sourceDocumentKind,
            }
          : nameFormatConsistencyNextAction
            ? nameFormatConsistencyNextAction
          : firstAttentionDependency
            ? {
                category: getDependencyCategory(firstAttentionDependency, 'review'),
                label: `Review ${firstAttentionDependency.label}`,
                detail: firstAttentionDependency.reason,
              }
          : firstAttentionChecklistItem
            ? {
                    category: getAttentionChecklistCategory(firstAttentionChecklistItem),
                    label: getAttentionChecklistLabel(firstAttentionChecklistItem),
                    detail: firstAttentionChecklistItem.reason,
                    documentKind: getAttentionChecklistCategory(firstAttentionChecklistItem) === 'document'
                      ? getChecklistDocumentKind(firstAttentionChecklistItem)
                      : undefined,
                  }
              : {
                  category: 'review' as const,
                  label: `Prepare ${formPayload.formCode || target.recommendedFormCode}`,
                  detail: 'Packet is execution-ready. Final review and submission prep can move now.',
                };
  const hasStartedTargetExecution = (plan?.steps ?? []).some((step) => {
    const trackedStepIds = TARGET_STATUS_VAULT_STEP_IDS[targetKey] ?? [];
    return trackedStepIds.includes(step.id) && (step.executionStatus === 'in_progress' || step.executionStatus === 'complete');
  });
  const nextActionWithDualPartnerBranch = dualPartnerExecutionNextAction
    && nextAction.category === 'review'
    && nextAction.label === `Prepare ${formPayload.formCode || target.recommendedFormCode}`
      ? dualPartnerExecutionNextAction
      : dualPartnerExecutionNextAction
        && nextAction.category === 'review'
        && targetKey !== 'passport'
        && targetKey !== 'courtOrder'
        && nextAction.label.startsWith('Review ')
          ? dualPartnerExecutionNextAction
          : dualPartnerExecutionNextAction
            && (targetKey === 'tsa' || isDualPartnerDownstreamExecutionTarget(targetKey))
            && hasStartedTargetExecution
            && nextAction.category === 'document'
            && nextAction.label === 'Review Identity document coverage'
              ? dualPartnerExecutionNextAction
              : nextAction;
  const statusVault = getTargetStatusVaultSnapshot(
    targetKey,
    plan,
    reminders,
    checklist,
    gates.ready,
    gates.blockers,
    nextActionWithDualPartnerBranch,
  );
  const readinessSummary = {
    status: gates.ready ? 'ready' as const : blockingFieldRisks > 0 || gates.blockers.length > 0 ? 'blocked' as const : 'attention' as const,
    blockingFieldRisks,
    attentionFieldRisks,
    lowConfidenceFields,
    missingFields,
    documentRepairDebt,
    summaryLabel: gates.ready
      ? 'Packet is execution-ready.'
      : blockingFieldRisks > 0
        ? `${blockingFieldRisks} blocking packet field risk${blockingFieldRisks === 1 ? '' : 's'} still need repair.`
        : missingFields > 0
          ? `${missingFields} packet field${missingFields === 1 ? '' : 's'} still missing.`
          : `${gates.blockers.length} non-field blocker${gates.blockers.length === 1 ? '' : 's'} still open.`,
  };

  return {
    targetKey,
    targetLabel: target.label,
    ready: gates.ready,
    blockers: gates.blockers,
    nextAction: nextActionWithDualPartnerBranch,
    statusVault,
    readinessSummary,
    recommendedFormCode: formPayload.formCode || target.recommendedFormCode,
    autofillFields: autofill.fields.filter((field) => target.autofillTargetFields.includes(field.targetField)),
    formPayload,
    fieldRisks,
    sequence,
    checklist,
  };
}
