import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { buildNameChangeBankExecutionSnapshot } from '../../../lib/nameChange/bankFlow';
import { buildNameChangeAutofillPrepSnapshot } from '../../../lib/nameChange/autofill';
import { buildNameChangeActionFeed, ensureTerminalPeriod, getAccountUpdateTemplateContextLines, getAccountUpdateTemplateCopyButtonLabel, getExecutionNextActionDetail } from '../../../lib/nameChange/actionFeed';
import { normalizeDraftNameChangeDocumentId } from '../../../lib/nameChange/intakeDraft';
import { buildNameChangeCourtesyExecutionSnapshot } from '../../../lib/nameChange/courtesyFlow';
import { NAME_CHANGE_DOCUMENT_CONTRACTS } from '../../../lib/nameChange/documentContract';
import { buildNameChangeDocumentIntakeSnapshot } from '../../../lib/nameChange/documentContract';
import { buildNameChangeDocumentRepairQueue } from '../../../lib/nameChange/documentRepairQueue';
import { buildNameChangeExtractionContractSnapshot } from '../../../lib/nameChange/extractionContract';
import { buildNameChangeDmvExecutionSnapshot } from '../../../lib/nameChange/dmvFlow';
import { matchesNameChangeDocumentKind } from '../../../lib/nameChange/documentKinds';
import { buildNameChangeEmployerExecutionSnapshot } from '../../../lib/nameChange/employerFlow';
import { getHighestPriorityNameChangeExecutionCard } from '../../../lib/nameChange/executionPrioritization';
import { buildNameChangeInsuranceExecutionSnapshot } from '../../../lib/nameChange/insuranceFlow';
import { buildNameChangeLicenseExecutionSnapshot } from '../../../lib/nameChange/licenseFlow';
import { buildNameChangeMedicalExecutionSnapshot } from '../../../lib/nameChange/medicalFlow';
import { buildNameChangePassportExecutionSnapshot } from '../../../lib/nameChange/passportFlow';
import { NAME_CHANGE_FORM_REGISTRY, NAME_CHANGE_INSTITUTION_LIBRARY } from '../../../lib/nameChange/registry';
import { copyTextOrDownload } from '../../../lib/copyText';
import { evaluateNameChangeRequirements } from '../../../lib/nameChange/requirements';
import { bulkUpdateNameChangeReminderStatus, deriveNameChangeReminderAttention, summarizeNameChangeReminderAttention, summarizeNameChangeReminders, updateNameChangeReminderStatus } from '../../../lib/nameChange/reminders';
import { buildNameChangeSsaExecutionSnapshot } from '../../../lib/nameChange/ssaFlow';
import { buildNameChangeTsaExecutionSnapshot } from '../../../lib/nameChange/tsaFlow';
import { buildNameChangeUtilitiesExecutionSnapshot } from '../../../lib/nameChange/utilitiesFlow';
import { buildNameChangeVoterExecutionSnapshot } from '../../../lib/nameChange/voterFlow';
import { getExecutionNextActionGuidance, getExecutionStatusVaultNotes } from '../../../lib/nameChange/targetExecution';
import { formatNameChangeExecutionDateTime, getNameChangeExecutionTimestamp } from './nameChangeExecutionTime';
import { buildNameChangeOverviewCardModel } from '../nameChangeOverviewCard';
import { buildNameChangeOverviewInsights } from '../nameChangeOverviewInsights';
import { deriveNameChangeLifecycleStatus } from '../nameChangeLifecycleStatus';
import { buildNameChangeInstitutionPackets, buildNameChangePlannerExports, resolveNameChangeStatePlaybook } from '../../../lib/nameChange/plannerDeepWork';
import { buildNameChangeExecutionSections } from './nameChangeExecutionSections';
import { NameChangeExecutionSectionsPanel } from './NameChangePlannerExecutionPanels';
import {
  NameChangeAccountUpdateTemplatesPanel,
  NameChangeCaseSetupPanel,
  NameChangeDocumentVaultPanel,
  NameChangeDocumentWorkspacePanel,
  NameChangeDualPartnerRolloutPanel,
  NameChangeGeneratedChecklistPanel,
  NameChangeInstitutionCoveragePanel,
  NameChangeInstitutionPacketsPanel,
  NameChangeNextStepsPanel,
  NameChangePlannerAdminReviewPanel,
  NameChangePlannerExportsPanel,
  NameChangePlannerRecentActivityPanel,
  NameChangePreparationOverviewPanel,
  NameChangeReminderAttentionPanel,
  NameChangeStatePlaybookPanel,
  NameChangeStatusTrackingPanel,
  NameChangeSuggestedRemindersPanel,
  NameChangeWorkspaceSummaryPanel,
} from './NameChangePlannerPanels';
import type { NameChangeCaseInput, NameChangeDocumentInput, NameChangeExtractedFieldInput, NameChangePlan, NameChangeReminderInput } from '../../../lib/nameChange/types';
import {
  EXECUTION_SECTION_STEP_IDS, TARGET_STATUS_VAULT_STATUS_PRIORITY, formatAccountUpdateTemplateCopy,
  getAccountUpdateTemplateBodyText, getAccountUpdateTemplateStatusChip, getAccountUpdateTemplateSubjectText,
  getActionFeedCtaLabel, getActionFeedSectionLabel, getActionFeedUrgencyClass, getActionFeedUrgencyReasonLabel,
  getActivitySourceLabel, getDocumentStorageModeLabel, getEffectiveBlockingProofHopLabel,
  getExecutionStatusLabel, getExecutionSummaryTone, getNameChangeStatusChipLabel,
  getReminderCtaLabel, getWorkflowStatusLabel, readNameChangeAdminPreference, readNameChangeCollapsedSections,
  writeNameChangeAdminPreference, writeNameChangeCollapsedSections, type ExecutionCardConfig,
  type ExecutionCardSectionConfig, type ExecutionSectionSummary, type ReminderPostureCardConfig,
  type TargetStatusVaultRow,
} from './nameChangePlannerUi';

interface Props {
  storageScope?: string | null;
  draft: NameChangeCaseInput;
  documents: NameChangeDocumentInput[];
  extractedFields: NameChangeExtractedFieldInput[];
  plan: NameChangePlan;
  reminders: NameChangeReminderInput[];
  saving: boolean;
  onDraftChange: (updates: Partial<NameChangeCaseInput>) => void;
  onStructuredIntakeChange: (key: string, value: unknown) => void;
  onDocumentsChange: (documents: NameChangeDocumentInput[]) => void;
  onExtractedFieldsChange: (fields: NameChangeExtractedFieldInput[]) => void;
  onRemindersChange: (
    reminders: NameChangeReminderInput[],
    context?: { action: 'single-update' | 'bulk-update' | 'schedule-stale' },
  ) => void;
  onStepExecutionStatusChange: (
    stepId: string,
    executionStatus: 'todo' | 'in_progress' | 'complete',
  ) => void;
  onStepExecutionNoteChange: (stepId: string, note: string) => void;
  onSave: () => Promise<void>;
  initialTargetId?: string;
}

export const NameChangePlannerTab: React.FC<Props> = ({
  storageScope = null,
  draft,
  documents,
  extractedFields,
  plan,
  reminders,
  saving,
  onDraftChange,
  onStructuredIntakeChange,
  onDocumentsChange,
  onExtractedFieldsChange,
  onRemindersChange,
  onStepExecutionStatusChange,
  onStepExecutionNoteChange,
  onSave,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showAdmin, setShowAdmin] = useState(() => readNameChangeAdminPreference(storageScope));
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => readNameChangeCollapsedSections(storageScope));
  const [documentSnapshotDrafts, setDocumentSnapshotDrafts] = useState<Record<string, string>>({});
  const [plannerActionError, setPlannerActionError] = useState<string | null>(null);
  const [copyingTemplateId, setCopyingTemplateId] = useState<string | null>(null);
  const [copyingPlannerExportKey, setCopyingPlannerExportKey] = useState<string | null>(null);
  const [copyingInstitutionPacketKey, setCopyingInstitutionPacketKey] = useState<string | null>(null);
  const [copiedTemplateNotice, setCopiedTemplateNotice] = useState<{ id: string; mode: 'copied' | 'downloaded' } | null>(null);
  const [copiedPlannerExportNotice, setCopiedPlannerExportNotice] = useState<{ key: string; mode: 'copied' | 'downloaded' } | null>(null);
  const [copiedInstitutionPacketNotice, setCopiedInstitutionPacketNotice] = useState<{ key: string; mode: 'copied' | 'downloaded' } | null>(null);
  const copiedTemplateNoticeTimeoutRef = useRef<number | null>(null);
  const copiedPlannerExportNoticeTimeoutRef = useRef<number | null>(null);
  const copiedInstitutionPacketNoticeTimeoutRef = useRef<number | null>(null);
  const templateCopyRequestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const stepCounts = useMemo(() => ({
    ready: plan.steps.filter((step) => step.status === 'ready').length,
    blocked: plan.steps.filter((step) => step.status === 'blocked').length,
    later: plan.steps.filter((step) => step.status === 'later').length,
  }), [plan.steps]);
  const effectiveReminders = useMemo(() => reminders, [reminders]);
  const milestoneChecklist = useMemo(() => plan.summary.milestoneChecklist ?? [], [plan.summary.milestoneChecklist]);
  const nextOptionalMilestone = useMemo(
    () => milestoneChecklist.find((milestone) => milestone.status === 'ready' || milestone.status === 'upcoming') ?? null,
    [milestoneChecklist],
  );
  const dualPartnerProofTracks = useMemo(() => plan.summary.dualPartnerProofTracks ?? [], [plan.summary.dualPartnerProofTracks]);
  const institutionCategoryCoverage = useMemo(() => plan.summary.institutionCategoryCoverage ?? [], [plan.summary.institutionCategoryCoverage]);
  const accountUpdateTemplates = useMemo(() => plan.summary.accountUpdateTemplates ?? [], [plan.summary.accountUpdateTemplates]);
  const accountUpdateTemplateContextKey = useMemo(() => JSON.stringify(accountUpdateTemplates.map((template) => [
    template.id,
    template.audience,
    template.subject,
    template.body,
    getAccountUpdateTemplateStatusChip(template),
    template.blockingProofHopLabel,
    template.checklistHighlight,
    template.checklistStatusNote,
    template.proofReadinessSummary,
    template.proofChecklist,
  ])), [accountUpdateTemplates]);
  const accountUpdateTemplateContextKeyRef = useRef(accountUpdateTemplateContextKey);
  accountUpdateTemplateContextKeyRef.current = accountUpdateTemplateContextKey;
  const executionTracks = useMemo(() => plan.summary.executionTracks ?? [], [plan.summary.executionTracks]);
  const edgeCaseGuidance = useMemo(() => plan.summary.edgeCaseGuidance ?? [], [plan.summary.edgeCaseGuidance]);
  const statePlaybook = useMemo(
    () => resolveNameChangeStatePlaybook(draft),
    [draft],
  );
  const hasExecutionActivity = useMemo(
    () => (plan.summary.executionCounts?.in_progress ?? 0) > 0 || (plan.summary.executionCounts?.complete ?? 0) > 0,
    [plan.summary.executionCounts],
  );
  const workflowStatus = useMemo(() => deriveNameChangeLifecycleStatus(plan), [plan]);
  const resumeCard = useMemo(
    () => buildNameChangeOverviewCardModel({
      hasWorkspace: true,
      workflowStatus,
      hasExecutionActivity,
    }),
    [hasExecutionActivity, workflowStatus],
  );
  const lifecycleInsights = useMemo(
    () => buildNameChangeOverviewInsights({ plan, reminders: effectiveReminders }),
    [effectiveReminders, plan],
  );
  const launchCoverageSummary = useMemo(() => {
    if (draft.launch_state === 'california') {
      return 'California-guided state filing, plus the U.S. federal identity chain, passport work, payroll, tax, travel, and downstream account follow-through.';
    }

    return 'Federal identity, passport, payroll, tax, travel, and downstream account follow-through are in scope here, but the state-specific filing lane still needs a California-guided setup.';
  }, [draft.launch_state]);
  const jurisdictionGuidance = useMemo(() => {
    const marriageState = (draft.marriage_state ?? '').trim();
    if (!marriageState) {
      return 'Add the marriage state and county so the certificate chain stays grounded before the state ID, passport, and downstream follow-through lanes move.';
    }

    if (marriageState.toLowerCase() === 'california') {
      return 'California is saved as the marriage jurisdiction. Keep the county and certificate reference grounded before moving the DMV and passport lanes.';
    }

    return `${marriageState} is saved as the marriage jurisdiction. Keep the issuing county and certificate reference grounded before moving the passport and downstream follow-through lanes.`;
  }, [draft.marriage_state]);
  const documentVaultRows = useMemo(() => documents.map((document) => {
    const contract = NAME_CHANGE_DOCUMENT_CONTRACTS.find((entry) => matchesNameChangeDocumentKind(document.document_kind, entry.kind));
    const linkedFieldCount = extractedFields.filter((field) => {
      const documentId = normalizeDraftNameChangeDocumentId(document.id);
      return documentId && normalizeDraftNameChangeDocumentId(field.document_id) === documentId;
    }).length;

    return {
      key: document.id ?? document.document_kind,
      label: document.display_name,
      status: document.intake_status,
      storageMode: document.storage_mode,
      linkedFieldCount,
      expectedFieldCount: contract?.extractionFields.length ?? 0,
    };
  }), [documents, extractedFields]);
  const requirementSnapshot = useMemo(() => evaluateNameChangeRequirements(draft, documents, extractedFields), [draft, documents, extractedFields]);
  const documentIntakeSnapshot = useMemo(() => buildNameChangeDocumentIntakeSnapshot(draft, documents, extractedFields), [draft, documents, extractedFields]);
  const extractionContractSnapshot = useMemo(() => buildNameChangeExtractionContractSnapshot(draft, documents, extractedFields), [draft, documents, extractedFields]);
  const autofillPrepSnapshot = useMemo(() => buildNameChangeAutofillPrepSnapshot(draft, documents, extractedFields), [draft, documents, extractedFields]);
  const executionSnapshotBundle = useMemo(() => ({
    bankExecutionSnapshot: buildNameChangeBankExecutionSnapshot(draft, documents, extractedFields, plan),
    courtesyExecutionSnapshot: buildNameChangeCourtesyExecutionSnapshot(draft, documents, extractedFields, plan),
    dmvExecutionSnapshot: buildNameChangeDmvExecutionSnapshot(draft, documents, extractedFields, plan),
    employerExecutionSnapshot: buildNameChangeEmployerExecutionSnapshot(draft, documents, extractedFields, plan),
    insuranceExecutionSnapshot: buildNameChangeInsuranceExecutionSnapshot(draft, documents, extractedFields, plan),
    licenseExecutionSnapshot: buildNameChangeLicenseExecutionSnapshot(draft, documents, extractedFields, plan),
    medicalExecutionSnapshot: buildNameChangeMedicalExecutionSnapshot(draft, documents, extractedFields, plan),
    passportExecutionSnapshot: buildNameChangePassportExecutionSnapshot(draft, documents, extractedFields, plan),
    ssaExecutionSnapshot: buildNameChangeSsaExecutionSnapshot(draft, documents, extractedFields, plan),
    tsaExecutionSnapshot: buildNameChangeTsaExecutionSnapshot(draft, documents, extractedFields, plan),
    utilitiesExecutionSnapshot: buildNameChangeUtilitiesExecutionSnapshot(draft, documents, extractedFields, plan),
    voterExecutionSnapshot: buildNameChangeVoterExecutionSnapshot(draft, documents, extractedFields, plan),
  }), [draft, documents, extractedFields, plan]);
  const executionSnapshots = useMemo(() => [
    executionSnapshotBundle.ssaExecutionSnapshot,
    executionSnapshotBundle.dmvExecutionSnapshot,
    executionSnapshotBundle.passportExecutionSnapshot,
    executionSnapshotBundle.employerExecutionSnapshot,
    executionSnapshotBundle.bankExecutionSnapshot,
    executionSnapshotBundle.insuranceExecutionSnapshot,
    executionSnapshotBundle.medicalExecutionSnapshot,
    executionSnapshotBundle.utilitiesExecutionSnapshot,
    executionSnapshotBundle.courtesyExecutionSnapshot,
    executionSnapshotBundle.voterExecutionSnapshot,
    executionSnapshotBundle.tsaExecutionSnapshot,
    executionSnapshotBundle.licenseExecutionSnapshot,
  ], [executionSnapshotBundle]);
  const documentRepairQueue = useMemo(
    () => buildNameChangeDocumentRepairQueue(documentIntakeSnapshot, executionSnapshots),
    [documentIntakeSnapshot, executionSnapshots],
  );
  const reminderSummary = useMemo(() => summarizeNameChangeReminders(effectiveReminders), [effectiveReminders]);
  const reminderAttention = useMemo(() => deriveNameChangeReminderAttention(effectiveReminders, plan), [effectiveReminders, plan]);
  const actionFeed = useMemo(
    () => buildNameChangeActionFeed(executionSnapshots, documentRepairQueue, reminderAttention, accountUpdateTemplates),
    [accountUpdateTemplates, documentRepairQueue, executionSnapshots, reminderAttention],
  );
  const targetStatusVaultRows = useMemo<TargetStatusVaultRow[]>(() => executionSnapshots.map((snapshot) => {
    const visibleStatusVaultNotes = getExecutionStatusVaultNotes(snapshot);
    const guidedNextActionDetail = snapshot.nextAction ? getExecutionNextActionDetail(snapshot) : null;
    const guidedNextAction = snapshot.nextAction ? getExecutionNextActionGuidance(snapshot) : null;
    const targetReminders = effectiveReminders.filter((reminder) => reminder.focus_target_id === snapshot.targetKey && reminder.status !== 'dismissed');
    const openReminderCount = targetReminders.filter((reminder) => reminder.status === 'pending' || reminder.status === 'scheduled').length;
    const highUrgencyCount = targetReminders.filter((reminder) => reminder.urgency === 'high' && reminder.status !== 'sent').length;
    const latestReminderAt = targetReminders
      .map((reminder) => reminder.updated_at ?? null)
      .filter((value): value is string => Boolean(value))
      .filter((value) => getNameChangeExecutionTimestamp(value) !== Number.NEGATIVE_INFINITY)
      .sort((left, right) => getNameChangeExecutionTimestamp(right) - getNameChangeExecutionTimestamp(left))[0] ?? null;
    return {
      key: snapshot.targetKey,
      title: snapshot.targetLabel,
      vaultStatus: snapshot.statusVault.status,
      ready: snapshot.ready,
      proofSummary: snapshot.statusVault.proofSummary,
      proofReadyCount: snapshot.statusVault.proofCounts.ready,
      proofTotalCount: snapshot.statusVault.proofCounts.total,
      proofMissingCount: snapshot.statusVault.proofCounts.missing,
      proofAttentionCount: snapshot.statusVault.proofCounts.attention,
      executionTodoCount: snapshot.statusVault.executionCounts.todo,
      executionInProgressCount: snapshot.statusVault.executionCounts.inProgress,
      executionCompleteCount: snapshot.statusVault.executionCounts.complete,
      executionTotalCount: snapshot.statusVault.executionCounts.total,
      milestoneInProgressCount: snapshot.statusVault.milestoneCounts.inProgress,
      milestoneCompleteCount: snapshot.statusVault.milestoneCounts.complete,
      milestoneTotalCount: snapshot.statusVault.milestoneCounts.total,
      reminderOpenCount: snapshot.statusVault.reminderSummary.openCount,
      reminderHighUrgencyCount: snapshot.statusVault.reminderSummary.highUrgencyCount,
      note: visibleStatusVaultNotes[0] ?? null,
      additionalNotes: visibleStatusVaultNotes.slice(1, 4),
      executionNote: snapshot.statusVault.executionNote === guidedNextActionDetail ? null : snapshot.statusVault.executionNote,
      milestoneNote: snapshot.statusVault.milestoneNote,
      proofNote: snapshot.statusVault.proofNote,
      reminderNote: snapshot.statusVault.reminderNote,
      updatedLabel: snapshot.statusVault.lastTouchedAt
        ? `Latest touch ${formatNameChangeExecutionDateTime(snapshot.statusVault.lastTouchedAt)}${snapshot.statusVault.lastTouchedSource === 'reminder' ? ' · reminder' : snapshot.statusVault.lastTouchedSource === 'milestone' ? ' · milestone' : snapshot.statusVault.lastTouchedSource === 'execution' ? ' · step' : ''}`
        : null,
      executionUpdatedLabel: snapshot.statusVault.lastUpdatedAt
        && snapshot.statusVault.lastUpdatedAt !== snapshot.statusVault.lastTouchedAt
        ? `Step updated ${formatNameChangeExecutionDateTime(snapshot.statusVault.lastUpdatedAt)}`
        : null,
      milestoneUpdatedLabel: snapshot.statusVault.milestoneUpdatedAt
        && snapshot.statusVault.milestoneUpdatedAt !== snapshot.statusVault.lastTouchedAt
        ? `Milestone updated ${formatNameChangeExecutionDateTime(snapshot.statusVault.milestoneUpdatedAt)}`
        : null,
      reminderUpdatedLabel: latestReminderAt
        && latestReminderAt !== snapshot.statusVault.lastTouchedAt
        ? `Reminder updated ${formatNameChangeExecutionDateTime(latestReminderAt)}`
        : null,
      nextActionLabel: snapshot.nextAction?.label ?? null,
      nextActionDetail: guidedNextAction?.overview || guidedNextAction?.doNow || guidedNextAction?.whyItHelps || guidedNextAction?.canWait
        ? [
          guidedNextAction.overview,
          guidedNextAction.doNow ? `Do now: ${guidedNextAction.doNow}` : null,
          guidedNextAction.whyItHelps ? `Why it helps: ${guidedNextAction.whyItHelps}` : null,
          guidedNextAction.canWait ? `Can wait: ${guidedNextAction.canWait}` : null,
        ].filter(Boolean).join(' ')
        : guidedNextActionDetail,
      reminderLabel: openReminderCount > 0
        ? `${openReminderCount} reminder${openReminderCount === 1 ? '' : 's'}${highUrgencyCount > 0 ? ` • ${highUrgencyCount} high urgency` : ''}`
        : null,
    };
  }).sort((left, right) => {
    const leftTouched = left.updatedLabel ? executionSnapshots.find((snapshot) => snapshot.targetKey === left.key)?.statusVault.lastTouchedAt ?? null : null;
    const rightTouched = right.updatedLabel ? executionSnapshots.find((snapshot) => snapshot.targetKey === right.key)?.statusVault.lastTouchedAt ?? null : null;
    if (leftTouched && rightTouched && leftTouched !== rightTouched) {
      return getNameChangeExecutionTimestamp(rightTouched) - getNameChangeExecutionTimestamp(leftTouched);
    }
    if (leftTouched && !rightTouched) return -1;
    if (!leftTouched && rightTouched) return 1;
    const statusDelta = TARGET_STATUS_VAULT_STATUS_PRIORITY[left.vaultStatus] - TARGET_STATUS_VAULT_STATUS_PRIORITY[right.vaultStatus];
    if (statusDelta !== 0) return statusDelta;
    return left.title.localeCompare(right.title);
  }), [effectiveReminders, executionSnapshots]);
  const targetStatusOverviewForSummary = useMemo(() => ({
    ...plan.summary.targetStatusOverview,
    missingProofTargets: targetStatusVaultRows.filter((row) => row.proofMissingCount > 0).length,
    attentionProofTargets: targetStatusVaultRows.filter((row) => row.proofAttentionCount > 0).length,
    touchedByExecution: targetStatusVaultRows.filter((row) => (
      row.executionInProgressCount > 0
      || row.executionCompleteCount > 0
      || Boolean(row.updatedLabel)
      || Boolean(row.executionUpdatedLabel)
    )).length,
    touchedByReminder: targetStatusVaultRows.filter((row) => row.reminderOpenCount > 0 || Boolean(row.reminderUpdatedLabel)).length,
  }), [plan.summary.targetStatusOverview, targetStatusVaultRows]);
  const preparationOverviewRows = useMemo(() => {
    const topRequirementGap = requirementSnapshot.results.find((result) => result.status !== 'satisfied');
    const intakeGap = documentIntakeSnapshot.documents.find((document) => (
      document.required
      && (document.intakeStatus !== 'reviewed' || document.metadataMissing.length > 0 || document.canonicalConflicts.length > 0)
    ));
    const autofillGap = autofillPrepSnapshot.fields.find((field) => !field.value.value);

    return [
      {
        key: 'requirements',
        label: 'Requirements and proof readiness',
        statusLabel: `${requirementSnapshot.summary.satisfied} satisfied · ${requirementSnapshot.summary.missing} missing · ${requirementSnapshot.summary.attention} attention`,
        note: topRequirementGap?.reason ?? 'Core legal-basis, identity, and government requirements are represented for this case.',
        additionalNotes: [
          requirementSnapshot.summary.missing > 0 ? `${requirementSnapshot.summary.missing} requirement gap${requirementSnapshot.summary.missing === 1 ? '' : 's'} still need attention.` : null,
          requirementSnapshot.summary.attention > 0 ? `${requirementSnapshot.summary.attention} requirement${requirementSnapshot.summary.attention === 1 ? '' : 's'} are in a review-needed posture.` : null,
        ].filter((value): value is string => Boolean(value)),
        milestoneCompleteCount: 0,
        milestoneInProgressCount: 0,
        reminderOpenCount: 0,
        reminderHighUrgencyCount: 0,
        proofMissingCount: requirementSnapshot.summary.missing,
        proofAttentionCount: requirementSnapshot.summary.attention,
      },
      {
        key: 'document-intake',
        label: 'Document intake coverage',
        statusLabel: `${documentIntakeSnapshot.summary.requiredReady} required ready · ${documentIntakeSnapshot.summary.requiredMissing} required missing`,
        note: intakeGap
          ? `${intakeGap.label} still needs ${intakeGap.intakeStatus === 'not_started' ? 'intake' : intakeGap.metadataMissing.length > 0 ? `saved details: ${intakeGap.metadataMissing.join(', ')}` : 'review before downstream use'}.`
          : 'Required proof documents are represented with the saved detail needed for downstream work.',
        additionalNotes: [
          documentIntakeSnapshot.summary.metadataGaps > 0 ? `${documentIntakeSnapshot.summary.metadataGaps} document${documentIntakeSnapshot.summary.metadataGaps === 1 ? '' : 's'} still have metadata or conflict cleanup to finish.` : null,
          documentIntakeSnapshot.summary.extractionGaps > 0 ? `${documentIntakeSnapshot.summary.extractionGaps} reviewed document${documentIntakeSnapshot.summary.extractionGaps === 1 ? '' : 's'} still have extraction gaps.` : null,
          documentIntakeSnapshot.summary.autofillReady > 0 ? `${documentIntakeSnapshot.summary.autofillReady} preferred document${documentIntakeSnapshot.summary.autofillReady === 1 ? '' : 's'} are ready for autofill.` : null,
        ].filter((value): value is string => Boolean(value)),
        milestoneCompleteCount: 0,
        milestoneInProgressCount: 0,
        reminderOpenCount: 0,
        reminderHighUrgencyCount: 0,
        proofMissingCount: documentIntakeSnapshot.summary.requiredMissing,
        proofAttentionCount: documentIntakeSnapshot.summary.metadataGaps + documentIntakeSnapshot.summary.extractionGaps,
      },
      {
        key: 'autofill',
        label: 'Autofill preparation',
        statusLabel: `${autofillPrepSnapshot.summary.ready} ready · ${autofillPrepSnapshot.summary.missing} missing`,
        note: autofillGap ? `${autofillGap.label} is still missing from the current saved intake or extracted document coverage.` : 'Saved case details and extracted fields are covering the current autofill targets.',
        additionalNotes: [
          autofillPrepSnapshot.summary.extractedBacked > 0 ? `${autofillPrepSnapshot.summary.extractedBacked} autofill field${autofillPrepSnapshot.summary.extractedBacked === 1 ? '' : 's'} are grounded by extracted document values.` : null,
        ].filter((value): value is string => Boolean(value)),
        milestoneCompleteCount: 0,
        milestoneInProgressCount: 0,
        reminderOpenCount: 0,
        reminderHighUrgencyCount: 0,
        proofMissingCount: autofillPrepSnapshot.summary.missing,
        proofAttentionCount: 0,
      },
    ];
  }, [autofillPrepSnapshot, documentIntakeSnapshot, requirementSnapshot]);
  const statusTrackingRows = useMemo(() => targetStatusVaultRows.map((row) => ({
    key: row.key,
    label: row.title,
    summary: row.proofSummary,
    additionalSummary: [
      row.note,
      row.additionalNotes[0] ?? null,
      `Steps ${row.executionCompleteCount} done • ${row.executionInProgressCount} started • ${row.executionTodoCount} to do`,
      row.executionNote ? `Step note: ${row.executionNote}` : null,
      row.milestoneNote ? `Milestone note: ${row.milestoneNote}` : null,
      row.proofNote ? `Proof note: ${row.proofNote}` : null,
      row.reminderNote ? `Reminder note: ${row.reminderNote}` : null,
      row.reminderLabel ? `Reminders: ${row.reminderLabel}` : null,
      row.nextActionDetail ? `Next: ${row.nextActionDetail}` : null,
    ].filter((value): value is string => Boolean(value)).join(' '),
    blockedProofLabel: row.proofMissingCount > 0
      ? `${row.proofMissingCount} missing proof item${row.proofMissingCount === 1 ? '' : 's'}`
      : row.proofAttentionCount > 0
        ? `${row.proofAttentionCount} proof item${row.proofAttentionCount === 1 ? '' : 's'} worth checking`
        : null,
    currentStatusLabel: row.vaultStatus.replace(/_/g, ' '),
    nextCheckLabel: row.nextActionLabel,
    lastTouchedLabel: row.updatedLabel ?? row.executionUpdatedLabel ?? row.milestoneUpdatedLabel ?? row.reminderUpdatedLabel,
    executionUpdatedLabel: row.executionUpdatedLabel,
    milestoneUpdatedLabel: row.milestoneUpdatedLabel,
    reminderUpdatedLabel: row.reminderUpdatedLabel,
  })), [targetStatusVaultRows]);
  const plannerExports = useMemo(
    () => buildNameChangePlannerExports({
      draft,
      plan,
      reminders: effectiveReminders,
      statePlaybook,
    }),
    [draft, effectiveReminders, plan, statePlaybook],
  );
  const institutionPackets = useMemo(
    () => buildNameChangeInstitutionPackets({
      draft,
      plan,
      statePlaybook,
    }),
    [draft, plan, statePlaybook],
  );
  const reminderAttentionSummary = useMemo(() => summarizeNameChangeReminderAttention(reminderAttention, {
    hasRecentStart: plan.summary.hasRecentStart,
    hasRecentCompletion: plan.summary.hasRecentCompletion,
  }), [reminderAttention, plan.summary.hasRecentCompletion, plan.summary.hasRecentStart]);

  const scrollPlannerElementIntoView = (targetId: string) => {
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToPlannerTarget = (targetId: string) => {
    navigate(
      {
        pathname: location.pathname,
        search: location.search,
        hash: `#${targetId}`,
      },
      { replace: true },
    );
    scrollPlannerElementIntoView(targetId);
  };

  const scrollToPlannerHref = (href: string) => {
    scrollToPlannerTarget(href.split('#')[1] || 'name-change-roadmap');
  };

  useEffect(() => {
    let frame = 0;
    const hash = location.hash.replace(/^#/, '').trim();
    if (!hash) return undefined;

    frame = window.requestAnimationFrame(() => {
      scrollPlannerElementIntoView(hash);
    });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [location.hash]);

  const reminderPostureCards = useMemo<ReminderPostureCardConfig[]>(() => {
    if (reminderAttention.length === 0) return [];

    return [
      {
        key: 'risk-lane',
        title: 'Main area to watch',
        value: reminderAttentionSummary.dominantRiskLane,
        detail: `${reminderAttentionSummary.critical} critical · ${reminderAttentionSummary.elevated} elevated · ${reminderAttentionSummary.normal} normal`,
        tone: reminderAttentionSummary.critical > 0 ? 'danger' : reminderAttentionSummary.elevated > 0 ? 'warning' : 'neutral',
      },
      {
        key: 'actionability',
        title: 'Attention posture',
        value: reminderAttentionSummary.attentionPosture,
        detail: `${reminderAttentionSummary.actionableNow} ready now · ${reminderAttentionSummary.blockedByUntouchedStep} waiting on an earlier step`,
        tone: reminderAttentionSummary.attentionPosture === 'blocked-heavy' ? 'warning' : 'primary',
      },
      {
        key: 'stale',
        title: 'Old follow-up',
        value: `${reminderAttentionSummary.stale} old`,
        detail: `${reminderAttentionSummary.staleTodo} untouched · ${reminderAttentionSummary.staleInProgress} still moving`,
        tone: reminderAttentionSummary.stale > 0 ? 'warning' : 'neutral',
      },
      {
        key: 'aging',
        title: 'Waiting too long',
        value: reminderAttentionSummary.agingWithoutExecution ? 'yes' : 'no',
        detail: `${reminderAttentionSummary.agingWithoutExecutionLane} · ${reminderAttentionSummary.agingWithoutExecutionPosture}`,
        tone: reminderAttentionSummary.agingWithoutExecution ? 'warning' : 'neutral',
      },
    ];
  }, [reminderAttention.length, reminderAttentionSummary]);
  const executionSections = useMemo<ExecutionCardSectionConfig[]>(() => {
    return buildNameChangeExecutionSections({
      employmentStatus: draft.employment_status,
      passportNeedsUpdate: draft.passport_needs_update,
      ...executionSnapshotBundle,
    });
  }, [
    draft.employment_status,
    draft.passport_needs_update,
    executionSnapshotBundle,
  ]);
  const executionSectionSummaries = useMemo<ExecutionSectionSummary[]>(() => (
    executionSections.map((section) => {
      const readyCount = section.cards.filter((card) => card.snapshot.ready).length;
      const blockedCount = section.cards.filter((card) => !card.snapshot.ready).length;
      const attentionCount = section.cards.reduce((sum, card) => sum + card.snapshot.checklist.filter((item) => item.status === 'attention').length, 0);
      const progressPercent = Math.round((readyCount / section.cards.length) * 100);
      const progressLabel = `${readyCount}/${section.cards.length} ready`;
      const highestRiskCardConfig = getHighestPriorityNameChangeExecutionCard(section.cards) as ExecutionCardConfig | null;
      const highestRiskCardKey = highestRiskCardConfig?.key ?? null;
      const highestRiskCard = highestRiskCardConfig?.title ?? 'Nothing urgent in this section';
      const nextActionLabel = highestRiskCardConfig
        ? highestRiskCardConfig.snapshot.nextAction.label
        : 'No immediate action needed';
      const nextActionGuidance = highestRiskCardConfig
        ? getExecutionNextActionGuidance(highestRiskCardConfig.snapshot)
        : null;
      const nextActionDetail = highestRiskCardConfig
        ? getExecutionNextActionDetail(highestRiskCardConfig.snapshot)
        : 'No immediate action needed in this section.';
      const relatedStepIds = EXECUTION_SECTION_STEP_IDS[section.key] ?? [];
      const sectionReminderItems = reminderAttention.filter((item) => relatedStepIds.includes(item.dependsOnStepId));
      const staleReminderKeys = sectionReminderItems.filter((item) => item.isStale).map((item) => item.reminderKey);
      const reminderKeys = sectionReminderItems.map((item) => item.reminderKey);
      const staleReminderOverlap = staleReminderKeys.length;
      const posture = blockedCount === section.cards.length
        ? {
            postureLabel: 'blocked',
            postureDetail: 'Every card in this section still has blockers, so this lane needs setup or dependency clearing before it can really move.',
            postureTone: 'danger' as const,
          }
        : readyCount === section.cards.length && attentionCount === 0
          ? {
              postureLabel: 'mostly done',
              postureDetail: 'Everything in this section is ready and there is not much loose attention left here.',
              postureTone: 'primary' as const,
            }
          : readyCount > 0
            ? {
                postureLabel: 'moving',
                postureDetail: 'Some cards are already ready while others still need cleanup, so this section can move now without pretending it is finished.',
                postureTone: 'warning' as const,
              }
            : {
                postureLabel: 'cleanup only',
                postureDetail: 'This section is lower-stakes tail work with light dependencies, so it is mostly about cleanup once the bigger lanes settle.',
                postureTone: 'neutral' as const,
              };

      return {
        ...section,
        progressPercent,
        progressLabel,
        readyCount,
        blockedCount,
        attentionCount,
        ...posture,
        highestRiskCardKey,
        highestRiskCard,
        nextActionLabel,
        nextActionDetail,
        nextActionOverview: nextActionGuidance?.overview ?? null,
        nextActionDoNow: nextActionGuidance?.doNow ?? null,
        nextActionWhyItHelps: nextActionGuidance?.whyItHelps ?? null,
        nextActionCanWait: nextActionGuidance?.canWait ?? null,
        staleReminderOverlap,
        reminderKeys,
        staleReminderKeys,
      };
    })
  ), [executionSections, reminderAttention]);

  const isSectionCollapsed = (section: ExecutionSectionSummary): boolean => {
    if (collapsedSections[section.key] !== undefined) return collapsedSections[section.key];
    return section.blockedCount === 0 && section.attentionCount === 0;
  };

  const toggleSectionCollapsed = (sectionKey: string) => {
    setCollapsedSections((current) => ({
      ...current,
      [sectionKey]: !(current[sectionKey] ?? false),
    }));
  };

  useEffect(() => {
    writeNameChangeCollapsedSections(collapsedSections, storageScope);
  }, [collapsedSections, storageScope]);

  useEffect(() => {
    writeNameChangeAdminPreference(showAdmin, storageScope);
  }, [showAdmin, storageScope]);

  useEffect(() => {
    setShowAdmin(readNameChangeAdminPreference(storageScope));
    setCollapsedSections(readNameChangeCollapsedSections(storageScope));
  }, [storageScope]);

  useEffect(() => {
    setDocumentSnapshotDrafts((current) => {
      const next = { ...current };
      documents.forEach((document) => {
        const snapshotText = document.extracted_snapshot ? JSON.stringify(document.extracted_snapshot, null, 2) : '';
        if (next[document.document_kind] === undefined) {
          next[document.document_kind] = snapshotText;
        }
      });
      Object.keys(next).forEach((key) => {
        if (!documents.some((document) => document.document_kind === key)) delete next[key];
      });
      return next;
    });
  }, [documents]);

  useEffect(() => () => {
    mountedRef.current = false;
    templateCopyRequestIdRef.current += 1;
    if (copiedTemplateNoticeTimeoutRef.current) window.clearTimeout(copiedTemplateNoticeTimeoutRef.current);
    if (copiedPlannerExportNoticeTimeoutRef.current) window.clearTimeout(copiedPlannerExportNoticeTimeoutRef.current);
    if (copiedInstitutionPacketNoticeTimeoutRef.current) window.clearTimeout(copiedInstitutionPacketNoticeTimeoutRef.current);
  }, []);

  useEffect(() => {
    templateCopyRequestIdRef.current += 1;
    setCopyingTemplateId(null);
    setCopiedTemplateNotice(null);
    if (copiedTemplateNoticeTimeoutRef.current) {
      window.clearTimeout(copiedTemplateNoticeTimeoutRef.current);
      copiedTemplateNoticeTimeoutRef.current = null;
    }
  }, [accountUpdateTemplateContextKey]);

  const copyAccountUpdateTemplate = async (template: NonNullable<NameChangePlan['summary']['accountUpdateTemplates']>[number]) => {
    if (copyingTemplateId) return;

    const requestId = templateCopyRequestIdRef.current + 1;
    templateCopyRequestIdRef.current = requestId;
    const requestContextKey = accountUpdateTemplateContextKeyRef.current;
    const isCurrentTemplateCopy = () => (
      mountedRef.current &&
      requestId === templateCopyRequestIdRef.current &&
      requestContextKey === accountUpdateTemplateContextKeyRef.current
    );

    setPlannerActionError(null);
    setCopyingTemplateId(template.id);
    try {
      const result = await copyTextOrDownload(formatAccountUpdateTemplateCopy(template), `dayof-name-change-${template.id}.txt`);
      if (!isCurrentTemplateCopy()) return;
      setCopiedTemplateNotice({ id: template.id, mode: result });
      if (copiedTemplateNoticeTimeoutRef.current) window.clearTimeout(copiedTemplateNoticeTimeoutRef.current);
      copiedTemplateNoticeTimeoutRef.current = window.setTimeout(() => {
        if (!isCurrentTemplateCopy()) return;
        setCopiedTemplateNotice((current) => (current?.id === template.id ? null : current));
      }, 2000);
    } catch {
      if (!isCurrentTemplateCopy()) return;
      const audienceLabel = template.audience.toLowerCase().replace(/^employer\s+/, '').split('/')[0]?.trim() || template.audience.toLowerCase();
      setPlannerActionError(`Couldn’t copy the ${audienceLabel} update right now.`);
    } finally {
      if (isCurrentTemplateCopy()) {
        setCopyingTemplateId((current) => (current === template.id ? null : current));
      }
    }
  };

  const copyPlannerExport = async (key: string, text: string, fileName: string) => {
    if (copyingPlannerExportKey) return;

    setPlannerActionError(null);
    setCopyingPlannerExportKey(key);
    try {
      const result = await copyTextOrDownload(text, fileName);
      setCopiedPlannerExportNotice({ key, mode: result });
      if (copiedPlannerExportNoticeTimeoutRef.current) window.clearTimeout(copiedPlannerExportNoticeTimeoutRef.current);
      copiedPlannerExportNoticeTimeoutRef.current = window.setTimeout(() => {
        setCopiedPlannerExportNotice((current) => (current?.key === key ? null : current));
      }, 2000);
    } catch {
      setPlannerActionError('Couldn’t copy that planner export right now.');
    } finally {
      setCopyingPlannerExportKey((current) => (current === key ? null : current));
    }
  };

  const copyInstitutionPacket = async (key: string, text: string, fileName: string) => {
    if (copyingInstitutionPacketKey) return;

    setPlannerActionError(null);
    setCopyingInstitutionPacketKey(key);
    try {
      const result = await copyTextOrDownload(text, fileName);
      setCopiedInstitutionPacketNotice({ key, mode: result });
      if (copiedInstitutionPacketNoticeTimeoutRef.current) window.clearTimeout(copiedInstitutionPacketNoticeTimeoutRef.current);
      copiedInstitutionPacketNoticeTimeoutRef.current = window.setTimeout(() => {
        setCopiedInstitutionPacketNotice((current) => (current?.key === key ? null : current));
      }, 2000);
    } catch {
      setPlannerActionError('Couldn’t copy that institution packet right now.');
    } finally {
      setCopyingInstitutionPacketKey((current) => (current === key ? null : current));
    }
  };

  const handlePlannerSave = async () => {
    setPlannerActionError(null);
    try {
      await onSave();
    } catch {
      setPlannerActionError('Couldn’t save the name-change planner right now.');
    }
  };

  return (
    <div id="name-change-roadmap" className="space-y-6 scroll-mt-24">
      {plannerActionError ? (
        <div role="alert" className="rounded-[20px] border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-text-primary">
          {plannerActionError}
        </div>
      ) : null}

      <NameChangeWorkspaceSummaryPanel
        legalPathLabel={plan.summary.legalPathLabel}
        workflowStatusLabel={getWorkflowStatusLabel(draft.workflow_status)}
        nextBestAction={plan.summary.nextBestAction}
        stepCounts={stepCounts}
        executionCounts={plan.summary.executionCounts}
        readinessPercent={plan.summary.readinessPercent}
        launchCoverageSummary={launchCoverageSummary}
        jurisdictionGuidance={jurisdictionGuidance}
        launchState={draft.launch_state}
        targetStatusOverview={targetStatusOverviewForSummary}
        resumeCard={resumeCard}
        lifecycleInsights={lifecycleInsights}
        nextOptionalMilestoneLabel={nextOptionalMilestone?.label ?? null}
        onResumeHref={scrollToPlannerHref}
        onLifecycleHref={scrollToPlannerHref}
        onSave={() => void handlePlannerSave()}
        saving={saving}
        executionTracks={executionTracks}
        recommendedOrder={plan.summary.recommendedOrder}
        edgeCaseGuidance={edgeCaseGuidance}
        milestoneChecklist={milestoneChecklist}
        dualPartnerProofTracks={dualPartnerProofTracks}
        getExecutionSummaryTone={(status) => getExecutionSummaryTone(status as Parameters<typeof getExecutionSummaryTone>[0])}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr,1fr]">
        <NameChangeStatePlaybookPanel statePlaybook={statePlaybook} />
        <NameChangeInstitutionCoveragePanel
          categories={institutionCategoryCoverage}
          getExecutionSummaryTone={(status) => getExecutionSummaryTone(status as Parameters<typeof getExecutionSummaryTone>[0])}
        />
      </div>

      <NameChangeInstitutionPacketsPanel
        institutionPackets={institutionPackets}
        copiedInstitutionPacketNotice={copiedInstitutionPacketNotice}
        copyingInstitutionPacketKey={copyingInstitutionPacketKey}
        copyInstitutionPacket={copyInstitutionPacket}
        getExecutionSummaryTone={(status) => getExecutionSummaryTone(status as Parameters<typeof getExecutionSummaryTone>[0])}
      />

      <NameChangeDualPartnerRolloutPanel
        tracks={dualPartnerProofTracks}
        getExecutionSummaryTone={(status) => getExecutionSummaryTone(status as Parameters<typeof getExecutionSummaryTone>[0])}
      />

      <NameChangePlannerExportsPanel
        plannerExports={plannerExports}
        copiedPlannerExportNotice={copiedPlannerExportNotice}
        copyingPlannerExportKey={copyingPlannerExportKey}
        copyPlannerExport={copyPlannerExport}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr,1fr]">
        <NameChangeDocumentVaultPanel
          documentVaultRows={documentVaultRows.map((row) => ({
            key: row.key,
            label: row.label,
            linkedFieldCount: row.linkedFieldCount,
            expectedFieldCount: row.expectedFieldCount,
            storageModeLabel: getDocumentStorageModeLabel(row.storageMode),
            status: row.status,
          }))}
        />
        <div id="target-status-tracking" className="scroll-mt-24">
          <NameChangeStatusTrackingPanel
            rows={statusTrackingRows}
          />
        </div>

        <NameChangeAccountUpdateTemplatesPanel
          templates={accountUpdateTemplates.map((template) => ({
            id: template.id,
            audience: template.audience,
            readiness: getAccountUpdateTemplateStatusChip(template),
            copyLabel: getAccountUpdateTemplateCopyButtonLabel(template, copiedTemplateNotice?.id ?? null),
            subjectLine: getAccountUpdateTemplateSubjectText(template),
            body: getAccountUpdateTemplateBodyText(template),
            contextLines: getAccountUpdateTemplateContextLines(template, {
              includeSubject: false,
              includeMessage: false,
              prefixReadiness: false,
            }).filter((value): value is string => Boolean(value)),
          }))}
          copiedTemplateNotice={copiedTemplateNotice}
          copyingTemplateId={copyingTemplateId}
          onCopy={(templateId) => {
            const template = accountUpdateTemplates.find((item) => item.id === templateId);
            if (template) void copyAccountUpdateTemplate(template);
          }}
        />
      </div>

      <NameChangeCaseSetupPanel
        values={{
          currentFirstName: draft.current_first_name,
          currentMiddleName: draft.current_middle_name ?? '',
          currentLastName: draft.current_last_name,
          targetFirstName: draft.target_first_name,
          targetMiddleName: draft.target_middle_name ?? '',
          targetLastName: draft.target_last_name,
          spouseLastName: String(draft.structured_intake.spouseLastName ?? ''),
          marriageDate: draft.marriage_date ?? '',
          marriageState: draft.marriage_state ?? '',
          countyResidence: draft.county_residence ?? '',
          legalBasis: draft.legal_basis,
          urgencyLevel: draft.urgency_level,
          employmentStatus: draft.employment_status,
          hasUsPassport: draft.has_us_passport,
          passportNeedsUpdate: draft.passport_needs_update,
          hasRealIdLicense: draft.has_real_id_license,
          bothPartnersChangeName: Boolean(draft.structured_intake.bothPartnersChangeName),
          travelBookedSoon: Boolean(draft.structured_intake.travelBookedSoon),
          wantsDocumentIntakeHelp: draft.structured_intake.wantsDocumentIntakeHelp !== false,
        }}
        onDraftChange={onDraftChange}
        onStructuredIntakeChange={onStructuredIntakeChange}
        onSave={() => void handlePlannerSave()}
        saving={saving}
        missingInputs={plan.summary.missingInputs}
        cautionNotes={plan.summary.cautionNotes}
      />

      <NameChangePreparationOverviewPanel
        rows={preparationOverviewRows}
      />

      <NameChangeExecutionSectionsPanel
        sections={executionSectionSummaries}
        isSectionCollapsed={isSectionCollapsed}
        toggleSectionCollapsed={toggleSectionCollapsed}
        scrollToPlannerTarget={scrollToPlannerTarget}
        effectiveReminders={effectiveReminders}
        onRemindersChange={onRemindersChange}
      />

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <NameChangeNextStepsPanel
          actionFeed={actionFeed}
          scrollToPlannerTarget={scrollToPlannerTarget}
          labels={{
            getStatusChipLabel: getNameChangeStatusChipLabel,
            getUrgencyClass: getActionFeedUrgencyClass,
            getSectionLabel: getActionFeedSectionLabel,
            getUrgencyReasonLabel: getActionFeedUrgencyReasonLabel,
            getCtaLabel: getActionFeedCtaLabel,
          }}
        />

        <NameChangeDocumentWorkspacePanel
          draftLegalBasis={draft.legal_basis}
          documents={documents}
          extractedFields={extractedFields}
          documentIntakeSnapshot={documentIntakeSnapshot}
          documentRepairQueue={documentRepairQueue}
          documentSnapshotDrafts={documentSnapshotDrafts}
          setDocumentSnapshotDrafts={setDocumentSnapshotDrafts}
          onDocumentsChange={onDocumentsChange}
          extractionContractSnapshot={extractionContractSnapshot}
          onExtractedFieldsChange={onExtractedFieldsChange}
        />
      </div>

      <NameChangeGeneratedChecklistPanel
        plan={plan}
        getExecutionStatusLabel={getExecutionStatusLabel}
        onStepExecutionStatusChange={onStepExecutionStatusChange}
        onStepExecutionNoteChange={onStepExecutionNoteChange}
        formatDateTime={formatNameChangeExecutionDateTime}
      />

      <NameChangePlannerRecentActivityPanel
        items={plan.summary.recentExecutionActivity ?? []}
        stepCount={plan.summary.activitySourceCounts?.step ?? 0}
        reminderCount={plan.summary.activitySourceCounts?.reminder ?? 0}
        showAdmin={showAdmin}
        latestMovementPosture={plan.summary.latestMovementPosture}
        dominantMovementLane={plan.summary.dominantMovementLane}
        mixedMovementReason={plan.summary.mixedMovementReason}
        mixedMovementHasUntouchedRisk={plan.summary.mixedMovementHasUntouchedRisk}
        mixedMovementReminderHeavy={plan.summary.mixedMovementReminderHeavy}
        reminderChurnRisk={plan.summary.reminderChurnRisk}
        hasRecentCompletion={plan.summary.hasRecentCompletion}
        hasRecentStart={plan.summary.hasRecentStart}
        hasRecentUntouchedRisk={plan.summary.hasRecentUntouchedRisk}
        hasZeroRecentStepMovement={plan.summary.hasZeroRecentStepMovement}
        formatDateTime={formatNameChangeExecutionDateTime}
        getActivitySourceLabel={getActivitySourceLabel}
        getExecutionStatusLabel={getExecutionStatusLabel}
      />

      <NameChangeReminderAttentionPanel
        reminderAttention={reminderAttention}
        reminderAttentionSummary={reminderAttentionSummary}
        reminderPostureCards={reminderPostureCards}
        effectiveReminders={effectiveReminders}
        onRemindersChange={onRemindersChange}
        scrollToPlannerTarget={scrollToPlannerTarget}
        getReminderCtaLabel={getReminderCtaLabel}
        formatDateTime={formatNameChangeExecutionDateTime}
      />

      <NameChangeSuggestedRemindersPanel
        effectiveReminders={effectiveReminders}
        reminderSummary={reminderSummary}
        onRemindersChange={onRemindersChange}
        scrollToPlannerTarget={scrollToPlannerTarget}
        getReminderCtaLabel={getReminderCtaLabel}
      />

      <NameChangePlannerAdminReviewPanel
        showAdmin={showAdmin}
        onToggle={() => setShowAdmin((value) => !value)}
        forms={NAME_CHANGE_FORM_REGISTRY}
        institutions={NAME_CHANGE_INSTITUTION_LIBRARY}
      />
    </div>
  );
};
