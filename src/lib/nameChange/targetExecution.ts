import { buildNameChangeAutofillPrepSnapshot } from './autofill';
import { getNameChangeDocumentKindAliases } from './documentKinds';
import { evaluateNameChangeExecutionGates } from './executionGates';
import { buildNameChangeExecutionSequenceSnapshot } from './executionSequence';
import {
  buildNameChangeExtractionContractSnapshot,
  hasVerifiedLinkedDocumentFieldValue,
} from './extractionContract';
import { NAME_CHANGE_FORM_BUILDERS } from './formRegistry';
import { buildNameChangeSnapshotBackedExtractedFields } from './intakeDraft';
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
  dmv: ['state-photo-id'],
  passport: ['federal-passport'],
  employer: ['institution-irs-employer'],
  taxes: ['institution-irs-records', 'institution-state-tax-agency'],
  banks: ['institution-banks'],
  insurance: ['institution-insurance'],
  medical: ['institution-medical-providers'],
  utilities: ['institution-utilities-housing', 'institution-phone-digital-identity'],
  courtesy: ['institution-credit-bureaus', 'institution-subscriptions-social', 'institution-school-alumni-records'],
  voter: ['institution-voter-registration'],
  tsa: ['institution-tsa-precheck', 'institution-frequent-flyer-hotel-rail'],
  licenses: ['institution-professional-licenses'],
};

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
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;
  const explicitNotes = relevantSteps
    .map((step) => step.executionNote?.trim() || null)
    .filter((note): note is string => Boolean(note));
  const milestoneNotes = relevantMilestones
    .filter((milestone) => milestone.status === 'in_progress' || milestone.status === 'complete')
    .map((milestone) => `${milestone.status === 'complete' ? 'Confirmed' : 'Tracking'} milestone: ${milestone.label}`);
  const missingChecklist = checklist.filter((item) => item.status === 'missing');
  const attentionChecklist = checklist.filter((item) => item.status === 'attention');
  const readyChecklist = checklist.filter((item) => item.status === 'ready');
  const proofCounts = `${readyChecklist.length}/${checklist.length} checks ready`;
  const proofIssues = [...missingChecklist, ...attentionChecklist]
    .slice(0, 2)
    .map((item) => item.label)
    .join('; ');
  const proofSummary = proofIssues ? `${proofCounts} • Needs ${proofIssues}` : `${proofCounts} • Proof stack looks grounded`;
  const targetReminders = reminders.filter((reminder) => reminder.focus_target_id === targetKey && reminder.status !== 'dismissed');
  const latestReminder = [...targetReminders]
    .filter((reminder) => Boolean(reminder.updated_at))
    .sort((left, right) => new Date(right.updated_at ?? 0).getTime() - new Date(left.updated_at ?? 0).getTime())[0] ?? null;
  const latestReminderAt = latestReminder?.updated_at ?? null;
  const lastTouchedAt = [latestExecutionUpdatedAt, latestReminderAt]
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;
  const lastTouchedSource = lastTouchedAt === latestReminderAt && latestReminderAt
    ? 'reminder' as const
    : lastTouchedAt === latestExecutionUpdatedAt && latestExecutionUpdatedAt
      ? 'execution' as const
      : null;

  let status: NameChangeTargetExecutionSnapshot['statusVault']['status'] = 'todo';
  if (relevantSteps.some((step) => step.executionStatus === 'complete')) {
    status = 'complete';
  } else if (relevantSteps.some((step) => step.executionStatus === 'in_progress')) {
    status = 'in_progress';
  } else if (blockers.length > 0) {
    status = 'blocked';
  } else if (ready) {
    status = 'ready';
  }

  const notes = explicitNotes.length > 0
    ? explicitNotes
    : milestoneNotes.length > 0
      ? milestoneNotes
    : nextAction
      ? [nextAction.detail]
      : blockers.slice(0, 2);
  const reminderNote = latestReminder?.reason
    ? `Reminder: ${latestReminder.label} — ${latestReminder.reason}`
    : latestReminder?.label
      ? `Reminder: ${latestReminder.label}`
      : null;
  const notesWithReminder = reminderNote && lastTouchedSource === 'reminder'
    ? [reminderNote, ...notes.filter((note) => note !== reminderNote)]
    : notes;
  const executionNote = explicitNotes[0] ?? milestoneNotes[0] ?? (nextAction ? nextAction.detail : blockers[0] ?? null);

  return {
    status,
    proofSummary,
    proofCounts: {
      ready: readyChecklist.length,
      attention: attentionChecklist.length,
      missing: missingChecklist.length,
      total: checklist.length,
    },
    notes: notesWithReminder,
    executionNote,
    reminderNote,
    lastUpdatedAt: latestExecutionUpdatedAt,
    lastTouchedAt,
    lastTouchedSource,
    reminderSummary: {
      openCount: targetReminders.filter((reminder) => reminder.status === 'pending' || reminder.status === 'scheduled').length,
      highUrgencyCount: targetReminders.filter((reminder) => reminder.urgency === 'high' && reminder.status !== 'sent').length,
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
    const needsVerifiedCourtOrderTargetMiddleName = Boolean(profile.target_middle_name);
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

    if (groundingDependency.status !== 'missing' && groundingDependency.status !== 'attention') return null;

    const label = !hasMarriageCertificate
      ? 'Upload marriage certificate'
      : !hasReviewedMarriageCertificate
        ? 'Review marriage certificate'
        : !hasVerifiedMarriageCertificateCounty && !hasVerifiedMarriageCertificateNumber
          ? 'Capture marriage-certificate county + certificate number'
          : !hasVerifiedMarriageCertificateCounty
            ? 'Capture marriage-certificate county'
            : !hasVerifiedMarriageCertificateNumber
              ? 'Capture marriage-certificate certificate number'
              : 'Review marriage-certificate grounding';

    return {
      category: 'document' as const,
      label,
      detail: groundingDependency.reason,
      documentKind: 'marriage_certificate' as const,
    };
  };
  const buildPassportBranchNextAction = () => {
    if (targetKey !== 'passport') return null;

    const citizenshipDependency = sequence.dependencies.find((dependency) => dependency.key === 'citizenship-eligibility' && dependency.status === 'missing');
    if (citizenshipDependency) {
      return {
        category: 'dependency' as const,
        label: 'Route non-U.S. passport follow-through',
        detail: citizenshipDependency.reason,
      };
    }

    if (!profile.has_us_passport) {
      return {
        category: 'review' as const,
        label: 'Confirm first-passport eligibility path',
        detail: 'This passport update is really a first-passport branch, so confirm the initial application path and packet before treating it like a standard renewal.',
      };
    }

    const passportEligibilityDependency = sequence.dependencies.find((dependency) => dependency.key === 'passport-eligibility-path' && dependency.status !== 'satisfied');
    if (passportEligibilityDependency) {
      return {
        category: 'review' as const,
        label: profile.has_us_passport ? 'Confirm passport amendment or renewal path' : 'Confirm first-passport eligibility path',
        detail: passportEligibilityDependency.reason,
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
