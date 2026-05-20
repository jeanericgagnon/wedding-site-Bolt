import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileCheck2, FileStack, Lock, MapPinned, Sparkles } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { buildNameChangeBankExecutionSnapshot } from '../../../lib/nameChange/bankFlow';
import { buildNameChangeAutofillPrepSnapshot } from '../../../lib/nameChange/autofill';
import {
  buildNameChangeActionFeed,
  ensureTerminalPeriod,
  getAccountUpdateTemplateAudienceLine,
  getAccountUpdateTemplateContextLines,
  getAccountUpdateTemplateCopyButtonLabel,
  getAccountUpdateTemplateMessageLine,
  getAccountUpdateTemplateReadinessLine,
  getAccountUpdateTemplateStatusLabel,
  getAccountUpdateTemplateStatusLine,
  getExecutionNextActionDetail,
  sanitizeAccountUpdateTemplateText,
} from '../../../lib/nameChange/actionFeed';
import { getFallbackBlockingProofHopLabel } from '../../../lib/nameChange/engine';
import { createDraftNameChangeDocument, normalizeDraftNameChangeDocumentId, upsertDraftNameChangeExtractedField } from '../../../lib/nameChange/intakeDraft';
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
import { NAME_CHANGE_LIFECYCLE_LABELS } from '../nameChangeLifecycleLabels';
import { deriveNameChangeLifecycleStatus } from '../nameChangeLifecycleStatus';
import type {
  NameChangeCaseInput,
  NameChangeDocumentInput,
  NameChangeExtractedFieldInput,
  NameChangePlan,
  NameChangeReminderInput,
  NameChangeTargetExecutionSnapshot,
} from '../../../lib/nameChange/types';

interface ExecutionCardConfig {
  key: string;
  anchorId?: string;
  title: string;
  description: string;
  readyLabel: string;
  notReadyLabel: string;
  sequenceTitle: string;
  payloadTitle: string;
  payloadDescription: string;
  snapshot: NameChangeTargetExecutionSnapshot;
}

interface ReminderPostureCardConfig {
  key: string;
  title: string;
  value: string;
  detail: string;
  tone?: 'warning' | 'primary' | 'danger' | 'neutral';
}

interface ExecutionCardSectionConfig {
  key: string;
  title: string;
  description: string;
  cards: ExecutionCardConfig[];
}

interface ExecutionSectionSummary {
  key: string;
  title: string;
  description: string;
  cards: ExecutionCardConfig[];
  progressPercent: number;
  progressLabel: string;
  readyCount: number;
  blockedCount: number;
  attentionCount: number;
  postureLabel: string;
  postureDetail: string;
  postureTone: 'danger' | 'warning' | 'primary' | 'neutral';
  highestRiskCardKey: string | null;
  highestRiskCard: string;
  nextActionLabel: string;
  nextActionDetail: string;
  nextActionOverview: string | null;
  nextActionDoNow: string | null;
  nextActionWhyItHelps: string | null;
  nextActionCanWait: string | null;
  staleReminderOverlap: number;
  reminderKeys: string[];
  staleReminderKeys: string[];
}

interface TargetStatusVaultRow {
  key: string;
  title: string;
  vaultStatus: 'todo' | 'blocked' | 'ready' | 'in_progress' | 'complete';
  ready: boolean;
  proofSummary: string;
  proofReadyCount: number;
  proofTotalCount: number;
  proofMissingCount: number;
  proofAttentionCount: number;
  executionTodoCount: number;
  executionInProgressCount: number;
  executionCompleteCount: number;
  executionTotalCount: number;
  milestoneInProgressCount: number;
  milestoneCompleteCount: number;
  milestoneTotalCount: number;
  reminderOpenCount: number;
  reminderHighUrgencyCount: number;
  note: string | null;
  additionalNotes: string[];
  executionNote: string | null;
  milestoneNote: string | null;
  proofNote: string | null;
  reminderNote: string | null;
  updatedLabel: string | null;
  executionUpdatedLabel: string | null;
  milestoneUpdatedLabel: string | null;
  reminderUpdatedLabel: string | null;
  nextActionLabel: string | null;
  nextActionDetail: string | null;
  reminderLabel: string | null;
}

const EXECUTION_SECTION_STEP_IDS: Record<string, string[]> = {
  'core-government': ['federal-ssa', 'state-dmv', 'federal-passport'],
  'work-identity': ['institutions-rollout'],
  institutional: ['institutions-rollout'],
  cleanup: ['institutions-rollout'],
};

const NAME_CHANGE_SECTION_PREFS_STORAGE_KEY = 'dayoflove:name-change:collapsed-sections';
const NAME_CHANGE_ADMIN_PREFS_STORAGE_KEY = 'dayoflove:name-change:show-admin';

const TARGET_STATUS_VAULT_STATUS_PRIORITY: Record<TargetStatusVaultRow['vaultStatus'], number> = {
  blocked: 0,
  in_progress: 1,
  ready: 2,
  todo: 3,
  complete: 4,
};

function scrollToPlannerTarget(targetId: string) {
  if (typeof window !== 'undefined') {
    const { pathname, search } = window.location;
    window.history.replaceState(null, '', `${pathname}${search}#${targetId}`);
  }
  document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function scrollToPlannerHref(href: string) {
  const [, hash = ''] = href.split('#');
  scrollToPlannerTarget(hash || 'name-change-roadmap');
}

function getActionFeedCtaLabel(intent: 'open_execution_card' | 'open_document_repair' | 'open_account_update_template') {
  if (intent === 'open_document_repair') return 'Open document repair';
  if (intent === 'open_account_update_template') return 'Open update template';
  return 'Open execution card';
}

function getEffectiveBlockingProofHopLabel(template: NonNullable<NameChangePlan['summary']['accountUpdateTemplates']>[number]) {
  return getFallbackBlockingProofHopLabel(template.readiness, template.blockingProofHopLabel);
}

function getAccountUpdateTemplateStatusChip(template: NonNullable<NameChangePlan['summary']['accountUpdateTemplates']>[number]) {
  return getAccountUpdateTemplateStatusLabel(template);
}

function formatAccountUpdateTemplateCopy(template: NonNullable<NameChangePlan['summary']['accountUpdateTemplates']>[number]) {
  return [
    ...getAccountUpdateTemplateContextLines(template, {
      includeAudience: true,
      includeStatus: true,
      includeMessage: false,
    }),
    '',
    getAccountUpdateTemplateMessageLine(template),
  ].filter(Boolean).join('\n');
}

function getAccountUpdateTemplateSubjectText(template: NonNullable<NameChangePlan['summary']['accountUpdateTemplates']>[number]) {
  return sanitizeAccountUpdateTemplateText(template.subject);
}

function getAccountUpdateTemplateBodyText(template: NonNullable<NameChangePlan['summary']['accountUpdateTemplates']>[number]) {
  return sanitizeAccountUpdateTemplateText(template.body);
}

function getReminderCtaLabel(intent?: 'open_execution_card') {
  return intent === 'open_execution_card' ? 'Open linked execution' : 'Open linked step';
}

function getActionFeedSectionLabel(sectionKey: 'core-government' | 'work-identity' | 'institutional' | 'cleanup' | 'documents') {
  switch (sectionKey) {
    case 'core-government':
      return 'core government';
    case 'work-identity':
      return 'work identity';
    case 'institutional':
      return 'institutional';
    case 'cleanup':
      return 'cleanup';
    case 'documents':
    default:
      return 'documents';
  }
}

function getExecutionSummaryTone(status: 'ready' | 'blocked' | 'upcoming' | 'in_progress' | 'complete') {
  if (status === 'complete') return 'bg-success/15 text-success';
  if (status === 'in_progress') return 'bg-primary/15 text-primary';
  if (status === 'ready') return 'bg-success/10 text-success';
  if (status === 'upcoming') return 'bg-primary/10 text-primary';
  return 'bg-warning/10 text-warning';
}

function getActionFeedUrgencyClass(urgencyTier: 'critical' | 'elevated' | 'normal') {
  switch (urgencyTier) {
    case 'critical':
      return 'bg-danger/10 text-danger';
    case 'elevated':
      return 'bg-warning/10 text-warning';
    case 'normal':
    default:
      return 'bg-surface-subtle text-text-secondary';
  }
}

function getActionFeedUrgencyReasonLabel(reason: 'blocking_dependency' | 'packet_trust' | 'document_gap' | 'review_queue') {
  switch (reason) {
    case 'blocking_dependency':
      return 'blocking dependency';
    case 'packet_trust':
      return 'packet trust';
    case 'document_gap':
      return 'document gap';
    case 'review_queue':
    default:
      return 'review queue';
  }
}

interface Props {
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
  onRemindersChange: (reminders: NameChangeReminderInput[], context?: { action: 'single-update' | 'bulk-update' | 'schedule-stale' }) => void;
  onStepExecutionStatusChange: (stepId: string, executionStatus: 'todo' | 'in_progress' | 'complete') => void;
  onStepExecutionNoteChange: (stepId: string, note: string) => void;
  onSave: () => Promise<void>;
  initialTargetId?: string;
}

const documentOptions: Array<{ key: NameChangeDocumentInput['document_kind']; label: string }> = [
  { key: 'marriage_certificate', label: 'Certified marriage certificate' },
  { key: 'court_order', label: 'Court order' },
  { key: 'current_drivers_license', label: 'Current California license / ID' },
  { key: 'current_passport', label: 'Current passport' },
  { key: 'social_security_card', label: 'Social Security card' },
  { key: 'birth_certificate', label: 'Birth certificate' },
  { key: 'proof_of_address', label: 'Proof of address' },
];

const extractionFieldLabels: Partial<Record<NameChangeExtractedFieldInput['field_key'], string>> = {
  first_name: 'First name',
  middle_name: 'Middle name',
  last_name: 'Last name',
  spouse_last_name: 'Spouse last name',
  issuance_date: 'Issue date',
  certificate_number: 'Certificate number',
  case_number: 'Case number',
  county: 'County',
  court_order_date: 'Court order date',
};

const extractionFieldPlaceholders: Partial<Record<NameChangeExtractedFieldInput['field_key'], string>> = {
  first_name: 'Alex',
  middle_name: 'Marie',
  last_name: 'Rivera',
  spouse_last_name: 'Jordan',
  issuance_date: '2026-04-05',
  certificate_number: 'Masked certificate number',
  case_number: '24-CV-1188',
  county: 'San Diego',
  court_order_date: '2026-04-05',
};

function matchesContractDocumentKind(
  actualKind: NameChangeDocumentInput['document_kind'],
  contractKind: NameChangeDocumentInput['document_kind'],
) {
  return matchesNameChangeDocumentKind(actualKind, contractKind);
}

function findContractDocument(
  documents: NameChangeDocumentInput[],
  contractKind: NameChangeDocumentInput['document_kind'],
) {
  return documents.find((document) => matchesContractDocumentKind(document.document_kind, contractKind));
}

function findContractExtractedField(
  extractedFields: NameChangeExtractedFieldInput[],
  documentId: string | null | undefined,
  fieldKey: NameChangeExtractedFieldInput['field_key'],
) {
  const normalizedDocumentId = normalizeDraftNameChangeDocumentId(documentId);

  if (normalizedDocumentId) {
    const linkedField = extractedFields.find((field) => (
      normalizeDraftNameChangeDocumentId(field.document_id) === normalizedDocumentId
      && field.field_key === fieldKey
    ));
    if (linkedField) return linkedField;
  }

  return extractedFields.find((field) => !field.document_id && field.field_key === fieldKey);
}

function ensureDocument(documents: NameChangeDocumentInput[], kind: NameChangeDocumentInput['document_kind'], label: string): NameChangeDocumentInput[] {
  if (documents.some((document) => matchesNameChangeDocumentKind(document.document_kind, kind))) return documents;
  return [
    ...documents,
    createDraftNameChangeDocument(kind, label),
  ];
}

function updateDocument(
  documents: NameChangeDocumentInput[],
  kind: NameChangeDocumentInput['document_kind'],
  updates: Partial<NameChangeDocumentInput>,
): NameChangeDocumentInput[] {
  return documents.map((document) => matchesNameChangeDocumentKind(document.document_kind, kind)
    ? {
        ...document,
        ...updates,
      }
    : document);
}

const ExecutionSnapshotCard: React.FC<ExecutionCardConfig> = ({
  anchorId,
  title,
  description,
  readyLabel,
  notReadyLabel,
  sequenceTitle,
  payloadTitle,
  payloadDescription,
  snapshot,
}) => {
  const visibleStatusVaultNotes = getExecutionStatusVaultNotes(snapshot);
  const guidedNextAction = snapshot.nextAction ? getExecutionNextActionGuidance(snapshot) : null;

  return (
  <Card>
    <div id={anchorId} className="scroll-mt-24" />
    <div className="flex items-center justify-between gap-3">
      <div>
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        <p className="text-sm text-text-secondary">{description}</p>
        <p className="mt-2 text-xs text-text-secondary">{snapshot.readinessSummary.summaryLabel}</p>
      </div>
      <span className={`rounded-full px-2 py-1 text-xs ${snapshot.ready ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
        {snapshot.ready ? readyLabel : notReadyLabel}
      </span>
    </div>

    <div className="mt-4 grid gap-3 md:grid-cols-5">
      <div className="rounded-xl border border-border-subtle p-3">
        <p className="text-xs uppercase tracking-wide text-text-tertiary">Status</p>
        <p className="mt-2 text-sm font-semibold text-text-primary">{snapshot.readinessSummary.status}</p>
      </div>
      <div className="rounded-xl border border-border-subtle p-3">
        <p className="text-xs uppercase tracking-wide text-text-tertiary">Blocking fields</p>
        <p className="mt-2 text-sm font-semibold text-text-primary">{snapshot.readinessSummary.blockingFieldRisks}</p>
      </div>
      <div className="rounded-xl border border-border-subtle p-3">
        <p className="text-xs uppercase tracking-wide text-text-tertiary">Attention fields</p>
        <p className="mt-2 text-sm font-semibold text-text-primary">{snapshot.readinessSummary.attentionFieldRisks}</p>
      </div>
      <div className="rounded-xl border border-border-subtle p-3">
        <p className="text-xs uppercase tracking-wide text-text-tertiary">Low-confidence</p>
        <p className="mt-2 text-sm font-semibold text-text-primary">{snapshot.readinessSummary.lowConfidenceFields}</p>
      </div>
      <div className="rounded-xl border border-border-subtle p-3">
        <p className="text-xs uppercase tracking-wide text-text-tertiary">Doc repair debt</p>
        <p className="mt-2 text-sm font-semibold text-text-primary">{snapshot.readinessSummary.documentRepairDebt}</p>
      </div>
    </div>

    <div className="mt-4 rounded-xl border border-border-subtle p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Status vault</p>
          <p className="mt-2 text-sm font-semibold text-text-primary">{snapshot.statusVault.status.replace(/_/g, ' ')}</p>
        </div>
        <div className="space-y-1 text-right">
          {snapshot.statusVault.lastTouchedAt ? (
            <p className="text-xs text-text-secondary">
              Latest touch {formatNameChangeExecutionDateTime(snapshot.statusVault.lastTouchedAt)}
              {snapshot.statusVault.lastTouchedSource === 'reminder' ? ' · reminder' : snapshot.statusVault.lastTouchedSource === 'execution' ? ' · execution' : ''}
            </p>
          ) : null}
          {snapshot.statusVault.lastUpdatedAt && snapshot.statusVault.lastUpdatedAt !== snapshot.statusVault.lastTouchedAt ? (
            <p className="text-xs text-text-secondary">Execution updated {formatNameChangeExecutionDateTime(snapshot.statusVault.lastUpdatedAt)}</p>
          ) : null}
          {snapshot.statusVault.reminderSummary.latestReminderAt && snapshot.statusVault.reminderSummary.latestReminderAt !== snapshot.statusVault.lastTouchedAt ? (
            <p className="text-xs text-text-secondary">Reminder updated {formatNameChangeExecutionDateTime(snapshot.statusVault.reminderSummary.latestReminderAt)}</p>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-sm text-text-secondary">{snapshot.statusVault.proofSummary}</p>
      {visibleStatusVaultNotes.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm text-text-secondary">
          {visibleStatusVaultNotes.slice(0, 3).map((note, noteIndex) => (
            <li key={`${snapshot.targetKey}-status-vault-note-${noteIndex}`}>• {note}</li>
          ))}
        </ul>
      ) : null}
    </div>

    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {snapshot.checklist.map((item) => (
        <div key={item.label} className="rounded-xl border border-border-subtle p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-text-primary">{item.label}</p>
            <span className={`rounded-full px-2 py-1 text-xs ${item.status === 'ready' ? 'bg-success/10 text-success' : item.status === 'attention' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}`}>
              {item.status}
            </span>
          </div>
          <p className="mt-3 text-sm text-text-secondary">{item.reason}</p>
        </div>
      ))}
    </div>

    <div className="mt-4 rounded-xl border border-border-subtle p-4">
      <h4 className="text-sm font-semibold text-text-primary">{sequenceTitle}</h4>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {snapshot.sequence.dependencies.map((dependency) => (
          <div key={dependency.key} className="rounded-xl border border-border-subtle p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-text-primary">{dependency.label}</p>
              <span className={`rounded-full px-2 py-1 text-xs ${dependency.status === 'satisfied' ? 'bg-success/10 text-success' : dependency.status === 'attention' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}`}>
                {dependency.status}
              </span>
            </div>
            <p className="mt-3 text-sm text-text-secondary">{dependency.reason}</p>
          </div>
        ))}
      </div>
    </div>

    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {snapshot.autofillFields.map((field) => (
        <div key={field.targetField} className="rounded-xl border border-border-subtle p-4">
          <p className="text-sm font-semibold text-text-primary">{field.label}</p>
          <p className="mt-2 text-sm text-text-secondary">{field.value.value ?? 'Missing'}</p>
          <p className="mt-2 text-xs text-text-secondary">{field.targetField} · {field.value.source} · {field.value.confidence}</p>
        </div>
      ))}
    </div>

    <div className="mt-4 rounded-xl border border-border-subtle p-4">
      {snapshot.nextAction ? (
        <div className="mb-4 rounded-xl border border-border-subtle p-4">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Guided next action</p>
          <p className="mt-2 text-sm font-semibold text-text-primary">{snapshot.nextAction.label}</p>
          <div className="mt-2 space-y-1 text-sm text-text-secondary">
            <p>{guidedNextAction?.overview ?? getExecutionNextActionDetail(snapshot)}</p>
            {guidedNextAction?.doNow ? <p>Do now: {guidedNextAction.doNow}</p> : null}
            {guidedNextAction?.whyItHelps ? <p>Why it helps: {guidedNextAction.whyItHelps}</p> : null}
            {guidedNextAction?.canWait ? <p>Can wait: {guidedNextAction.canWait}</p> : null}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-text-primary">{payloadTitle}</h4>
          <p className="text-xs text-text-secondary">{payloadDescription}</p>
        </div>
        <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
          {snapshot.formPayload.summary.ready} filled · {snapshot.formPayload.summary.trustedReady} trusted · {snapshot.formPayload.summary.lowConfidence} low-confidence · {snapshot.formPayload.summary.missing} missing
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {snapshot.formPayload.fields.map((field) => (
          <div key={field.fieldKey} className="rounded-xl border border-border-subtle p-4">
            <p className="text-sm font-semibold text-text-primary">{field.label}</p>
            <p className="mt-2 text-sm text-text-secondary">{field.value ?? 'Missing'}</p>
            <p className="mt-2 text-xs text-text-secondary">
              {field.fieldKey} · {field.source}
              {field.sourceDocumentKind ? ` · ${field.sourceDocumentKind}` : ''}
              {field.sourceFieldKey ? ` · ${field.sourceFieldKey}` : ''}
              {' · '}{field.confidence}
            </p>
          </div>
        ))}
      </div>

      {snapshot.fieldRisks.length > 0 ? (
        <div className="mt-4 rounded-xl border border-border-subtle p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-text-primary">Field-level execution risks</h4>
              <p className="text-xs text-text-secondary">Exactly which packet fields are still blocking or weakening execution readiness.</p>
            </div>
            <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
              {snapshot.fieldRisks.filter((risk) => risk.severity === 'blocking').length} blocking · {snapshot.fieldRisks.filter((risk) => risk.severity === 'attention').length} attention
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {snapshot.fieldRisks.map((risk) => (
              <div key={`${risk.fieldKey}-${risk.severity}`} className="rounded-xl border border-border-subtle p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-text-primary">{risk.label}</p>
                  <span className={`rounded-full px-2 py-1 text-xs ${risk.severity === 'blocking' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>
                    {risk.severity}
                  </span>
                </div>
                <p className="mt-3 text-sm text-text-secondary">{risk.reason}</p>
                <p className="mt-2 text-xs text-text-secondary">
                  {risk.fieldKey} · {risk.source}
                  {risk.sourceDocumentKind ? ` · ${risk.sourceDocumentKind}` : ''}
                  {risk.sourceFieldKey ? ` · ${risk.sourceFieldKey}` : ''}
                  {' · '}{risk.confidence}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  </Card>
  );
};

const ReminderPostureCard: React.FC<ReminderPostureCardConfig> = ({ title, value, detail, tone = 'neutral' }) => {
  const toneClass = tone === 'danger'
    ? 'border-danger/20 bg-danger/5'
    : tone === 'warning'
      ? 'border-warning/20 bg-warning/5'
      : tone === 'primary'
        ? 'border-primary/20 bg-primary/5'
        : 'border-border-subtle bg-white/60';

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-xs uppercase tracking-wide text-text-tertiary">{title}</p>
      <p className="mt-2 text-sm font-semibold text-text-primary">{value}</p>
      <p className="mt-2 text-xs text-text-secondary">{detail}</p>
    </div>
  );
};

export const NameChangePlannerTab: React.FC<Props> = ({
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
  const [showAdmin, setShowAdmin] = useState(() => {
    if (typeof window === 'undefined') return false;

    try {
      return window.localStorage.getItem(NAME_CHANGE_ADMIN_PREFS_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};

    try {
      const raw = window.localStorage.getItem(NAME_CHANGE_SECTION_PREFS_STORAGE_KEY);
      return raw ? JSON.parse(raw) as Record<string, boolean> : {};
    } catch {
      return {};
    }
  });
  const [documentSnapshotDrafts, setDocumentSnapshotDrafts] = useState<Record<string, string>>({});
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);
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
  const accountUpdateTemplates = useMemo(() => plan.summary.accountUpdateTemplates ?? [], [plan.summary.accountUpdateTemplates]);
  const executionTracks = useMemo(() => plan.summary.executionTracks ?? [], [plan.summary.executionTracks]);
  const edgeCaseGuidance = useMemo(() => plan.summary.edgeCaseGuidance ?? [], [plan.summary.edgeCaseGuidance]);
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
  const bankExecutionSnapshot = useMemo(() => buildNameChangeBankExecutionSnapshot(draft, documents, extractedFields, plan), [draft, documents, extractedFields, plan]);
  const courtesyExecutionSnapshot = useMemo(() => buildNameChangeCourtesyExecutionSnapshot(draft, documents, extractedFields, plan), [draft, documents, extractedFields, plan]);
  const insuranceExecutionSnapshot = useMemo(() => buildNameChangeInsuranceExecutionSnapshot(draft, documents, extractedFields, plan), [draft, documents, extractedFields, plan]);
  const licenseExecutionSnapshot = useMemo(() => buildNameChangeLicenseExecutionSnapshot(draft, documents, extractedFields, plan), [draft, documents, extractedFields, plan]);
  const medicalExecutionSnapshot = useMemo(() => buildNameChangeMedicalExecutionSnapshot(draft, documents, extractedFields, plan), [draft, documents, extractedFields, plan]);
  const voterExecutionSnapshot = useMemo(() => buildNameChangeVoterExecutionSnapshot(draft, documents, extractedFields, plan), [draft, documents, extractedFields, plan]);
  const tsaExecutionSnapshot = useMemo(() => buildNameChangeTsaExecutionSnapshot(draft, documents, extractedFields, plan), [draft, documents, extractedFields, plan]);
  const utilitiesExecutionSnapshot = useMemo(() => buildNameChangeUtilitiesExecutionSnapshot(draft, documents, extractedFields, plan), [draft, documents, extractedFields, plan]);
  const ssaExecutionSnapshot = useMemo(() => buildNameChangeSsaExecutionSnapshot(draft, documents, extractedFields, plan), [draft, documents, extractedFields, plan]);
  const dmvExecutionSnapshot = useMemo(() => buildNameChangeDmvExecutionSnapshot(draft, documents, extractedFields, plan), [draft, documents, extractedFields, plan]);
  const passportExecutionSnapshot = useMemo(() => buildNameChangePassportExecutionSnapshot(draft, documents, extractedFields, plan), [draft, documents, extractedFields, plan]);
  const employerExecutionSnapshot = useMemo(() => buildNameChangeEmployerExecutionSnapshot(draft, documents, extractedFields, plan), [draft, documents, extractedFields, plan]);
  const executionSnapshots = useMemo(() => [
    ssaExecutionSnapshot,
    dmvExecutionSnapshot,
    passportExecutionSnapshot,
    employerExecutionSnapshot,
    bankExecutionSnapshot,
    insuranceExecutionSnapshot,
    medicalExecutionSnapshot,
    utilitiesExecutionSnapshot,
    courtesyExecutionSnapshot,
    voterExecutionSnapshot,
    tsaExecutionSnapshot,
    licenseExecutionSnapshot,
  ], [
    ssaExecutionSnapshot,
    dmvExecutionSnapshot,
    passportExecutionSnapshot,
    employerExecutionSnapshot,
    bankExecutionSnapshot,
    insuranceExecutionSnapshot,
    medicalExecutionSnapshot,
    utilitiesExecutionSnapshot,
    courtesyExecutionSnapshot,
    voterExecutionSnapshot,
    tsaExecutionSnapshot,
    licenseExecutionSnapshot,
  ]);
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
        ? `Latest touch ${formatNameChangeExecutionDateTime(snapshot.statusVault.lastTouchedAt)}${snapshot.statusVault.lastTouchedSource === 'reminder' ? ' · reminder' : snapshot.statusVault.lastTouchedSource === 'milestone' ? ' · milestone' : snapshot.statusVault.lastTouchedSource === 'execution' ? ' · execution' : ''}`
        : null,
      executionUpdatedLabel: snapshot.statusVault.lastUpdatedAt
        && snapshot.statusVault.lastUpdatedAt !== snapshot.statusVault.lastTouchedAt
        ? `Execution updated ${formatNameChangeExecutionDateTime(snapshot.statusVault.lastUpdatedAt)}`
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
  const targetStatusVaultSummary = useMemo(() => ({
    missingProofTargets: targetStatusVaultRows.filter((row) => row.proofMissingCount > 0).length,
    attentionProofTargets: targetStatusVaultRows.filter((row) => row.proofAttentionCount > 0).length,
  }), [targetStatusVaultRows]);
  const reminderAttentionSummary = useMemo(() => summarizeNameChangeReminderAttention(reminderAttention, {
    hasRecentStart: plan.summary.hasRecentStart,
    hasRecentCompletion: plan.summary.hasRecentCompletion,
  }), [reminderAttention, plan.summary.hasRecentCompletion, plan.summary.hasRecentStart]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let frame = 0;
    const syncHashTarget = () => {
      const hash = window.location.hash?.replace(/^#/, '').trim();
      if (!hash) return;

      frame = window.requestAnimationFrame(() => {
        scrollToPlannerTarget(hash);
      });
    };

    syncHashTarget();
    window.addEventListener('hashchange', syncHashTarget);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', syncHashTarget);
    };
  }, []);

  const reminderPostureCards = useMemo<ReminderPostureCardConfig[]>(() => {
    if (reminderAttention.length === 0) return [];

    return [
      {
        key: 'risk-lane',
        title: 'Dominant risk lane',
        value: reminderAttentionSummary.dominantRiskLane,
        detail: `${reminderAttentionSummary.critical} critical · ${reminderAttentionSummary.elevated} elevated · ${reminderAttentionSummary.normal} normal`,
        tone: reminderAttentionSummary.critical > 0 ? 'danger' : reminderAttentionSummary.elevated > 0 ? 'warning' : 'neutral',
      },
      {
        key: 'actionability',
        title: 'Attention posture',
        value: reminderAttentionSummary.attentionPosture,
        detail: `${reminderAttentionSummary.actionableNow} actionable now · ${reminderAttentionSummary.blockedByUntouchedStep} blocked by untouched step`,
        tone: reminderAttentionSummary.attentionPosture === 'blocked-heavy' ? 'warning' : 'primary',
      },
      {
        key: 'stale',
        title: 'Stale follow-up',
        value: `${reminderAttentionSummary.stale} stale`,
        detail: `${reminderAttentionSummary.staleTodo} untouched stale · ${reminderAttentionSummary.staleInProgress} stale but moving`,
        tone: reminderAttentionSummary.stale > 0 ? 'warning' : 'neutral',
      },
      {
        key: 'aging',
        title: 'Aging without execution',
        value: reminderAttentionSummary.agingWithoutExecution ? 'yes' : 'no',
        detail: `${reminderAttentionSummary.agingWithoutExecutionLane} · ${reminderAttentionSummary.agingWithoutExecutionPosture}`,
        tone: reminderAttentionSummary.agingWithoutExecution ? 'warning' : 'neutral',
      },
    ];
  }, [reminderAttention.length, reminderAttentionSummary]);
  const executionSections = useMemo<ExecutionCardSectionConfig[]>(() => {
    const coreGovernmentCards: ExecutionCardConfig[] = [
      {
        key: 'ssa',
        title: 'Guided execution: SSA first',
        description: 'First real guided execution slice. Uses canonical case truth, intake contract, requirements, and autofill prep to judge SS-5 readiness.',
        readyLabel: 'ready for SS-5 prep',
        notReadyLabel: 'not ready',
        sequenceTitle: 'SSA sequencing dependencies',
        payloadTitle: 'SS-5 form payload snapshot',
        payloadDescription: 'Structured downstream form contract for the first real execution target.',
        snapshot: ssaExecutionSnapshot,
      },
      {
        key: 'dmv',
        title: 'Guided execution: California DMV next',
        description: 'Second guided execution slice. Reuses the same canonical/intake/autofill layers to judge DMV readiness after SSA.',
        readyLabel: 'ready for DL-44 prep',
        notReadyLabel: 'not ready',
        sequenceTitle: 'DMV sequencing dependencies',
        payloadTitle: 'DMV form payload snapshot',
        payloadDescription: 'Structured downstream form contract for the California DMV execution target.',
        snapshot: dmvExecutionSnapshot,
      },
    ];

    if (draft.passport_needs_update) {
      coreGovernmentCards.push(
        {
          key: 'passport',
          title: 'Guided execution: passport follow-through',
          description: 'Third guided execution slice. Reuses the shared execution builder for passport packet prep once SSA is underway.',
          readyLabel: `ready for ${passportExecutionSnapshot.recommendedFormCode} prep`,
          notReadyLabel: 'not ready',
          sequenceTitle: 'Passport sequencing dependencies',
          payloadTitle: 'Passport form payload snapshot',
          payloadDescription: 'Structured downstream form contract for the passport execution target.',
          snapshot: passportExecutionSnapshot,
        },
      );
    }

    const workIdentityCards: ExecutionCardConfig[] = [];

    if (draft.employment_status === 'employed' || draft.employment_status === 'self_employed') {
      workIdentityCards.push(
        {
          key: 'employer',
          title: 'Guided execution: employer / payroll follow-through',
          description: 'Institutional execution slice for payroll / HR updates after SSA is complete and primary ID is moving.',
          readyLabel: 'ready for HR packet prep',
          notReadyLabel: 'not ready',
          sequenceTitle: 'Employer sequencing dependencies',
          payloadTitle: 'Employer packet snapshot',
          payloadDescription: 'Structured downstream packet for payroll / HR updates.',
          snapshot: employerExecutionSnapshot,
        },
        {
          key: 'licenses',
          title: 'Guided execution: professional licenses / certifications',
          description: 'Employment-linked execution slice for professional licenses and certifications once primary ID is moving.',
          readyLabel: 'ready for license packet prep',
          notReadyLabel: 'not ready',
          sequenceTitle: 'Professional-license sequencing dependencies',
          payloadTitle: 'Professional-license packet snapshot',
          payloadDescription: 'Structured downstream packet for professional license and certification updates.',
          snapshot: licenseExecutionSnapshot,
        },
      );
    }

    const institutionCards: ExecutionCardConfig[] = [
      {
        key: 'banks',
        title: 'Guided execution: banks / credit cards',
        description: 'Institutional execution slice for bank and card account updates once primary photo ID is moving.',
        readyLabel: 'ready for bank packet prep',
        notReadyLabel: 'not ready',
        sequenceTitle: 'Bank sequencing dependencies',
        payloadTitle: 'Bank packet snapshot',
        payloadDescription: 'Structured downstream packet for bank and credit-card account updates.',
        snapshot: bankExecutionSnapshot,
      },
      {
        key: 'insurance',
        title: 'Guided execution: insurance follow-through',
        description: 'Institutional execution slice for health, auto, renters, and life insurance once primary photo ID is moving.',
        readyLabel: 'ready for insurance packet prep',
        notReadyLabel: 'not ready',
        sequenceTitle: 'Insurance sequencing dependencies',
        payloadTitle: 'Insurance packet snapshot',
        payloadDescription: 'Structured downstream packet for insurance policyholder updates.',
        snapshot: insuranceExecutionSnapshot,
      },
      {
        key: 'medical',
        title: 'Guided execution: medical providers / insurance cards',
        description: 'Healthcare execution slice for provider rosters, patient portals, and member-card records once primary photo ID is moving.',
        readyLabel: 'ready for medical record prep',
        notReadyLabel: 'not ready',
        sequenceTitle: 'Medical/provider sequencing dependencies',
        payloadTitle: 'Medical/provider packet snapshot',
        payloadDescription: 'Structured downstream packet for provider, patient-portal, and insurance-card record updates.',
        snapshot: medicalExecutionSnapshot,
      },
      {
        key: 'utilities',
        title: 'Guided execution: utilities / lease / landlord records',
        description: 'Household-admin execution slice for utilities, lease portals, and landlord records once primary photo ID is moving.',
        readyLabel: 'ready for utilities/lease prep',
        notReadyLabel: 'not ready',
        sequenceTitle: 'Utilities/lease sequencing dependencies',
        payloadTitle: 'Utilities/lease packet snapshot',
        payloadDescription: 'Structured downstream packet for utilities, lease, and landlord record updates.',
        snapshot: utilitiesExecutionSnapshot,
      },
      {
        key: 'courtesy',
        title: 'Guided execution: courtesy / social identity sync',
        description: 'Tail-end cleanup slice for display names, loyalty profiles, and other lower-stakes account identity updates.',
        readyLabel: 'ready for courtesy sync',
        notReadyLabel: 'not ready',
        sequenceTitle: 'Courtesy/social sync dependencies',
        payloadTitle: 'Courtesy/social sync packet snapshot',
        payloadDescription: 'Structured downstream packet for display-name and lightweight social/account identity updates.',
        snapshot: courtesyExecutionSnapshot,
      },
    ];

    const cleanupCards: ExecutionCardConfig[] = [
      {
        key: 'voter',
        title: 'Guided execution: California voter registration',
        description: 'California-specific post-DMV execution slice for voter registration follow-through.',
        readyLabel: 'ready for voter update prep',
        notReadyLabel: 'not ready',
        sequenceTitle: 'Voter sequencing dependencies',
        payloadTitle: 'Voter packet snapshot',
        payloadDescription: 'Structured downstream packet for California voter registration updates.',
        snapshot: voterExecutionSnapshot,
      },
    ];

    if (draft.passport_needs_update) {
      cleanupCards.push({
        key: 'tsa',
        title: 'Guided execution: TSA / travel profiles',
        description: 'Travel-facing execution slice for TSA PreCheck and loyalty/travel profile follow-through once passport work is underway.',
        readyLabel: 'ready for travel profile prep',
        notReadyLabel: 'not ready',
        sequenceTitle: 'TSA / travel sequencing dependencies',
        payloadTitle: 'TSA / travel packet snapshot',
        payloadDescription: 'Structured downstream packet for TSA PreCheck and travel profile updates.',
        snapshot: tsaExecutionSnapshot,
      });
    }

    return [
      {
        key: 'core-government',
        title: 'Core government path',
        description: 'The federal/state backbone. This is the sequence that makes the rest of the name-change system easier instead of messier.',
        cards: coreGovernmentCards,
      },
      {
        key: 'work-identity',
        title: 'Work identity follow-through',
        description: 'Employment-linked updates that usually matter once the government path and primary ID are actually moving.',
        cards: workIdentityCards,
      },
      {
        key: 'institutional',
        title: 'Institutional follow-through',
        description: 'The long-tail admin lanes where mismatched records get annoying fast if they lag behind the identity backbone.',
        cards: institutionCards,
      },
      {
        key: 'cleanup',
        title: 'Cleanup and tail-end identity sync',
        description: 'Lower-volume but still real updates that round out the workflow once the major lanes are already in motion.',
        cards: cleanupCards,
      },
    ].filter((section) => section.cards.length > 0);
  }, [
    bankExecutionSnapshot,
    courtesyExecutionSnapshot,
    dmvExecutionSnapshot,
    draft.employment_status,
    draft.passport_needs_update,
    employerExecutionSnapshot,
    insuranceExecutionSnapshot,
    licenseExecutionSnapshot,
    medicalExecutionSnapshot,
    passportExecutionSnapshot,
    ssaExecutionSnapshot,
    tsaExecutionSnapshot,
    utilitiesExecutionSnapshot,
    voterExecutionSnapshot,
  ]);
  const executionSectionSummaries = useMemo<ExecutionSectionSummary[]>(() => (
    executionSections.map((section) => {
      const readyCount = section.cards.filter((card) => card.snapshot.ready).length;
      const blockedCount = section.cards.filter((card) => !card.snapshot.ready).length;
      const attentionCount = section.cards.reduce((sum, card) => sum + card.snapshot.checklist.filter((item) => item.status === 'attention').length, 0);
      const progressPercent = Math.round((readyCount / section.cards.length) * 100);
      const progressLabel = `${readyCount}/${section.cards.length} cards ready`;
      const highestRiskCardConfig = getHighestPriorityNameChangeExecutionCard(section.cards) as ExecutionCardConfig | null;
      const highestRiskCardKey = highestRiskCardConfig?.key ?? null;
      const highestRiskCard = highestRiskCardConfig?.title ?? 'No major risk in this section';
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
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(NAME_CHANGE_SECTION_PREFS_STORAGE_KEY, JSON.stringify(collapsedSections));
    } catch {
      // Ignore localStorage failures; planner still works without persistence.
    }
  }, [collapsedSections]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(NAME_CHANGE_ADMIN_PREFS_STORAGE_KEY, String(showAdmin));
    } catch {
      // Ignore localStorage failures; planner still works without persistence.
    }
  }, [showAdmin]);

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

  const copyAccountUpdateTemplate = async (template: NonNullable<NameChangePlan['summary']['accountUpdateTemplates']>[number]) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;

    await navigator.clipboard.writeText(formatAccountUpdateTemplateCopy(template));
    setCopiedTemplateId(template.id);
    window.setTimeout(() => {
      setCopiedTemplateId((current) => (current === template.id ? null : current));
    }, 2000);
  };

  return (
    <div id="name-change-roadmap" className="space-y-6 scroll-mt-24">
      <div className="grid gap-4 md:grid-cols-3">
        <Card padding="sm">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Path</p>
          <p className="mt-2 text-sm font-semibold text-text-primary">{plan.summary.legalPathLabel}</p>
          <p className="mt-2 text-xs text-text-secondary">Case status: {draft.workflow_status.replace('_', ' ')}</p>
          <p className="mt-2 text-xs text-text-secondary">Next best action: {plan.summary.nextBestAction}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">Workflow health</p>
          <p className="mt-2 text-sm text-text-primary">{stepCounts.ready} ready · {stepCounts.blocked} blocked · {stepCounts.later} later</p>
          <p className="mt-2 text-xs text-text-secondary">Execution: {plan.summary.executionCounts?.todo ?? 0} todo · {plan.summary.executionCounts?.in_progress ?? 0} in progress · {plan.summary.executionCounts?.complete ?? 0} complete</p>
          <p className="mt-2 text-sm font-semibold text-text-primary">{plan.summary.readinessPercent}% intake-ready</p>
          <p className="mt-2 text-xs text-text-secondary">Federal-first, California-second, institutions after primary ID.</p>
        </Card>
        <Card padding="sm" className="border-primary/20 bg-primary/5">
          <div className="flex items-start gap-2">
            <Lock className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <p className="text-xs uppercase tracking-wide text-primary">Privacy rule</p>
              <p className="mt-2 text-sm text-text-primary">Raw uploads are optional. Structured fields are the truth.</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="border-sky-200 bg-sky-50/70">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-sky-700">Resume any time</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-sky-700">Free assistant · status vault · proof tracking</p>
            <p className="mt-2 text-sm font-medium text-sky-950">{resumeCard.statusLabel}</p>
            <h3 className="mt-2 text-lg font-semibold text-sky-950">{resumeCard.headline}</h3>
            <p className="mt-1 text-sm text-sky-900">
              {resumeCard.helperCopy}
            </p>
            <p className="mt-2 text-sm text-sky-900">Optional next step: {resumeCard.optionalNextStep}</p>
            {nextOptionalMilestone ? (
              <p className="mt-1 text-sm text-sky-900">
                If you want a concrete place to pick back up,{' '}
                <button
                  type="button"
                  className="font-medium text-sky-950 underline underline-offset-2"
                  onClick={() => scrollToPlannerHref(resumeCard.primaryHref)}
                >
                  {nextOptionalMilestone.label}
                </button>
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-sky-900">
              <button
                type="button"
                className="rounded-full border border-sky-300 bg-white px-2 py-1 font-medium"
                onClick={() => scrollToPlannerHref(lifecycleInsights.milestoneSummaryHref)}
              >
                {lifecycleInsights.milestoneSummaryLabel}
              </button>
              <button
                type="button"
                className="rounded-full border border-sky-300 bg-white px-2 py-1 font-medium"
                onClick={() => scrollToPlannerHref(lifecycleInsights.reminderSummaryHref)}
              >
                {lifecycleInsights.reminderSummaryLabel}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => scrollToPlannerHref(resumeCard.primaryHref)}>
              {resumeCard.primaryLabel}
            </Button>
            <Button variant="outline" size="sm" onClick={() => scrollToPlannerHref(resumeCard.secondaryHref)}>
              {resumeCard.secondaryLabel}
            </Button>
            <Button variant="outline" size="sm" onClick={() => scrollToPlannerHref(resumeCard.tertiaryHref)}>
              {resumeCard.tertiaryLabel}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => scrollToPlannerHref(resumeCard.plannerHref)}>
              {resumeCard.plannerLabel}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void onSave()} disabled={saving}>{saving ? 'Saving…' : 'Save and come back later'}</Button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <button
            type="button"
            className="rounded-xl border border-sky-200 bg-white/80 px-4 py-3 text-left"
            onClick={() => scrollToPlannerHref(resumeCard.primaryHref)}
          >
            <p className="text-xs uppercase tracking-wide text-sky-700">{NAME_CHANGE_LIFECYCLE_LABELS.coreChain}</p>
            <p className="mt-1 text-sm text-sky-950">{lifecycleInsights.coreChainLabel}</p>
          </button>
          <button
            type="button"
            className="rounded-xl border border-sky-200 bg-white/80 px-4 py-3 text-left"
            onClick={() => scrollToPlannerHref(resumeCard.plannerHref)}
          >
            <p className="text-xs uppercase tracking-wide text-sky-700">{NAME_CHANGE_LIFECYCLE_LABELS.followOn}</p>
            <p className="mt-1 text-sm text-sky-950">{lifecycleInsights.followOnLabel}</p>
          </button>
          <button
            type="button"
            className="rounded-xl border border-sky-200 bg-white/80 px-4 py-3 text-left"
            onClick={() => scrollToPlannerHref(lifecycleInsights.downstreamHref)}
          >
            <p className="text-xs uppercase tracking-wide text-sky-700">{NAME_CHANGE_LIFECYCLE_LABELS.downstream}</p>
            <p className="mt-1 text-sm text-sky-950">{lifecycleInsights.downstreamLabel}</p>
          </button>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.2fr,1fr]">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Post-wedding name change roadmap</h3>
              <p className="mt-1 text-sm text-text-secondary">Free, no-upsell guidance. Start with the core identity chain, then pick off the rest whenever you want to resume.</p>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">Day of Love free assistant</span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {executionTracks.map((track) => (
              <div key={track.id} className="rounded-xl border border-border-subtle bg-white/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-text-tertiary">{track.sequenceLabel}</p>
                    <p className="mt-2 text-sm font-semibold text-text-primary">{track.title}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs ${track.featureTag === 'travel' ? 'bg-primary/10 text-primary' : track.featureTag === 'rollout' ? 'bg-success/10 text-success' : 'bg-surface-subtle text-text-secondary'}`}>
                    {track.featureTag}
                  </span>
                </div>
                <p className="mt-3 text-sm text-text-secondary">{track.summary}</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-text-secondary">Depends on: {track.dependsOnStepIds.join(' → ')}</p>
                  <span className={`rounded-full px-2 py-1 text-xs ${getExecutionSummaryTone(track.status)}`}>
                    {track.status}
                  </span>
                </div>
              </div>
            ))}
            {plan.summary.recommendedOrder.map((stepLabel, index) => (
              <div key={stepLabel} className="rounded-xl border border-border-subtle p-4">
                <p className="text-xs uppercase tracking-wide text-text-tertiary">Step {index + 1}</p>
                <p className="mt-2 text-sm font-semibold text-text-primary">{stepLabel}</p>
                {index === 0 && <p className="mt-2 text-xs text-text-secondary">Get certified proof grounded before anything else moves.</p>}
                {index === 1 && <p className="mt-2 text-xs text-text-secondary">SSA is the first real filing move because tax, payroll, and federal identity depend on it.</p>}
                {index === 2 && <p className="mt-2 text-xs text-text-secondary">Driver license or state ID is next so the rest of the packet has fresh government photo ID.</p>}
                {index === 3 && <p className="mt-2 text-xs text-text-secondary">Passport follows the new SSA + ID chain, especially if travel is coming up.</p>}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Milestones and progress</h3>
              <p className="mt-1 text-sm text-text-secondary">Track the hard gates that decide whether the rest of the rollout is actually safe to start.</p>
            </div>
            <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">{plan.summary.readinessPercent}% ready</span>
          </div>

          <div className="mt-4 space-y-3">
            {edgeCaseGuidance.map((item) => (
              <div key={item.id} className={`rounded-xl border p-4 ${item.severity === 'warning' ? 'border-warning/30 bg-warning/5' : 'border-border-subtle bg-white/50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                    <p className="mt-1 text-xs text-text-secondary">{item.detail}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs ${item.severity === 'warning' ? 'bg-warning/10 text-warning' : 'bg-surface-subtle text-text-secondary'}`}>
                    {item.severity}
                  </span>
                </div>
              </div>
            ))}
            {milestoneChecklist.map((milestone) => (
              <div key={milestone.id} className="rounded-xl border border-border-subtle p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{milestone.label}</p>
                    <p className="mt-1 text-xs text-text-secondary">Depends on: {milestone.dependsOnStepIds.join(' → ')}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs ${getExecutionSummaryTone(milestone.status)}`}>
                    {milestone.status}
                  </span>
                </div>
              </div>
            ))}
            {dualPartnerProofTracks.map((track) => (
              <div key={track.id} className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{track.label}</p>
                    <p className="mt-1 text-xs text-text-secondary">Depends on: {track.dependsOnStepIds.join(' → ')}</p>
                    <p className="mt-2 text-xs text-text-secondary">Proof: {track.requiredProof.join(' · ')}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs ${getExecutionSummaryTone(track.status)}`}>
                    {track.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr,1fr]">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Lightweight document and status vault</h3>
              <p className="mt-1 text-sm text-text-secondary">Only status, linkage, and extraction counts live here. No sensitive raw document storage required.</p>
            </div>
            <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">{documentVaultRows.length} tracked docs</span>
          </div>

          <div className="mt-4 space-y-3">
            {documentVaultRows.length > 0 ? documentVaultRows.map((row) => (
              <div key={row.key} className="rounded-xl border border-border-subtle p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{row.label}</p>
                    <p className="mt-1 text-xs text-text-secondary">{row.linkedFieldCount}/{row.expectedFieldCount} grounded fields · {row.storageMode.replace('_', ' ')}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs ${row.status === 'reviewed' ? 'bg-success/10 text-success' : row.status === 'uploaded' ? 'bg-warning/10 text-warning' : 'bg-surface-subtle text-text-secondary'}`}>
                    {row.status}
                  </span>
                </div>
              </div>
            )) : (
              <div className="rounded-xl border border-dashed border-border-subtle p-4 text-sm text-text-secondary">Add a certificate, ID, or proof document and the vault will track readiness without holding raw files.</div>
            )}
          </div>

          <div id="target-status-tracking" className="mt-6 scroll-mt-24 border-t border-border-subtle pt-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-text-primary">Target status tracking</h4>
                <p className="mt-1 text-xs text-text-secondary">Per-target status, proof summary, note, and last movement across the filing workflow.</p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-text-secondary">
                <span className="rounded-full bg-surface-subtle px-2 py-1">{targetStatusVaultRows.length} tracked targets</span>
                <span className="rounded-full bg-surface-subtle px-2 py-1">{plan.summary.targetStatusOverview?.missingProofTargets ?? targetStatusVaultSummary.missingProofTargets} with missing proof</span>
                <span className="rounded-full bg-surface-subtle px-2 py-1">{plan.summary.targetStatusOverview?.attentionProofTargets ?? targetStatusVaultSummary.attentionProofTargets} with proof attention</span>
                <span className="rounded-full bg-surface-subtle px-2 py-1">{plan.summary.targetStatusOverview?.ready ?? 0} ready</span>
                <span className="rounded-full bg-surface-subtle px-2 py-1">{plan.summary.targetStatusOverview?.blocked ?? 0} blocked</span>
                <span className="rounded-full bg-surface-subtle px-2 py-1">{plan.summary.targetStatusOverview?.touchedByExecution ?? 0} with execution activity</span>
                <span className="rounded-full bg-surface-subtle px-2 py-1">{plan.summary.targetStatusOverview?.touchedByReminder ?? 0} with reminder follow-up</span>
                <span className="rounded-full bg-surface-subtle px-2 py-1">{plan.summary.targetStatusOverview?.inProgress ?? 0} in progress</span>
                <span className="rounded-full bg-surface-subtle px-2 py-1">{plan.summary.targetStatusOverview?.complete ?? 0} complete</span>
                {plan.summary.targetStatusOverview?.latestTouchedAt ? (
                  <span className="rounded-full bg-surface-subtle px-2 py-1">
                    Latest move {formatNameChangeExecutionDateTime(plan.summary.targetStatusOverview.latestTouchedAt)}
                    {plan.summary.targetStatusOverview.latestTouchedSource === 'reminder' ? ' · reminder' : plan.summary.targetStatusOverview.latestTouchedSource === 'milestone' ? ' · milestone' : plan.summary.targetStatusOverview.latestTouchedSource === 'execution' ? ' · execution' : ''}
                  </span>
                ) : null}
                {plan.summary.targetStatusOverview?.latestUpdatedAt
                && plan.summary.targetStatusOverview.latestUpdatedAt !== plan.summary.targetStatusOverview.latestTouchedAt ? (
                  <span className="rounded-full bg-surface-subtle px-2 py-1">
                    Latest execution {formatNameChangeExecutionDateTime(plan.summary.targetStatusOverview.latestUpdatedAt)}
                  </span>
                  ) : null}
                {plan.summary.targetStatusOverview?.latestMilestoneAt
                && plan.summary.targetStatusOverview.latestMilestoneAt !== plan.summary.targetStatusOverview.latestTouchedAt ? (
                  <span className="rounded-full bg-surface-subtle px-2 py-1">
                    Latest milestone {formatNameChangeExecutionDateTime(plan.summary.targetStatusOverview.latestMilestoneAt)}
                  </span>
                  ) : null}
                {plan.summary.targetStatusOverview?.latestReminderAt
                && plan.summary.targetStatusOverview.latestReminderAt !== plan.summary.targetStatusOverview.latestTouchedAt ? (
                  <span className="rounded-full bg-surface-subtle px-2 py-1">
                    Latest reminder {formatNameChangeExecutionDateTime(plan.summary.targetStatusOverview.latestReminderAt)}
                  </span>
                  ) : null}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {targetStatusVaultRows.map((row) => (
                <div key={row.key} className="rounded-xl border border-border-subtle p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{row.title}</p>
                      <p className="mt-1 text-xs text-text-secondary">{row.proofSummary}</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">Vault: {row.vaultStatus.replace(/_/g, ' ')}</span>
                      <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">Ready: {row.ready ? 'yes' : 'no'}</span>
                      <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
                        Proof {row.proofReadyCount}/{row.proofTotalCount}
                      </span>
                      {row.executionTotalCount > 0 ? (
                        <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
                          Steps {row.executionCompleteCount} done • {row.executionInProgressCount} active • {row.executionTodoCount} todo
                        </span>
                      ) : null}
                      {row.milestoneTotalCount > 0 ? (
                        <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
                          Milestones {row.milestoneCompleteCount} confirmed • {row.milestoneInProgressCount} tracking
                        </span>
                      ) : null}
                      {row.reminderOpenCount > 0 ? (
                        <span className={`rounded-full px-2 py-1 text-xs ${row.reminderHighUrgencyCount > 0 ? 'bg-amber-50 text-amber-700' : 'bg-surface-subtle text-text-secondary'}`}>
                          Reminders {row.reminderOpenCount} open{row.reminderHighUrgencyCount > 0 ? ` • ${row.reminderHighUrgencyCount} high urgency` : ''}
                        </span>
                      ) : null}
                      {row.proofMissingCount > 0 ? (
                        <span className="rounded-full bg-rose-50 px-2 py-1 text-xs text-rose-700">
                          {row.proofMissingCount} missing
                        </span>
                      ) : null}
                      {row.proofAttentionCount > 0 ? (
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">
                          {row.proofAttentionCount} attention
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {row.note && <p className="mt-3 text-sm text-text-secondary">{row.note}</p>}
                  {row.additionalNotes.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-xs text-text-secondary">
                      {row.additionalNotes.map((note) => <li key={note}>• {note}</li>)}
                    </ul>
                  ) : null}
                  {row.executionNote && row.executionNote !== row.note ? <p className="mt-2 text-xs text-text-secondary">Execution note: {row.executionNote}</p> : null}
                  {row.milestoneNote && row.milestoneNote !== row.note && row.milestoneNote !== row.executionNote ? <p className="mt-2 text-xs text-text-secondary">Milestone note: {row.milestoneNote}</p> : null}
                  {row.proofNote && row.proofNote !== row.note && row.proofNote !== row.executionNote && row.proofNote !== row.milestoneNote ? <p className="mt-2 text-xs text-text-secondary">Proof note: {row.proofNote}</p> : null}
                  {row.reminderNote && row.reminderNote !== row.note ? <p className="mt-2 text-xs text-text-secondary">Reminder note: {row.reminderNote}</p> : null}
                  {row.nextActionLabel ? (
                    <div className="mt-2 space-y-1 text-xs text-text-secondary">
                      <p>Next: {row.nextActionLabel}</p>
                      {row.nextActionDetail && row.nextActionDetail !== row.executionNote ? <p>{row.nextActionDetail}</p> : null}
                    </div>
                  ) : null}
                  {row.reminderLabel && <p className="mt-2 text-xs text-text-secondary">Reminders: {row.reminderLabel}</p>}
                  {row.updatedLabel && <p className="mt-3 text-xs text-text-secondary">{row.updatedLabel}</p>}
                  {row.executionUpdatedLabel && <p className="mt-1 text-xs text-text-secondary">{row.executionUpdatedLabel}</p>}
                  {row.milestoneUpdatedLabel && <p className="mt-1 text-xs text-text-secondary">{row.milestoneUpdatedLabel}</p>}
                  {row.reminderUpdatedLabel && <p className="mt-1 text-xs text-text-secondary">{row.reminderUpdatedLabel}</p>}
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Prewritten update templates</h3>
              <p className="mt-1 text-sm text-text-secondary">Copy, stage, or send when the proof chain is ready. Payroll, bank, insurance, and other downstream updates should not require fresh writing every time.</p>
            </div>
            <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">{accountUpdateTemplates.length} templates</span>
          </div>

          <div className="mt-4 space-y-3">
            {accountUpdateTemplates.map((template) => {
              const subjectText = getAccountUpdateTemplateSubjectText(template);
              const bodyText = getAccountUpdateTemplateBodyText(template);

              return (
                <div id={`account-update-template-${template.id}`} key={template.id} className="scroll-mt-24 rounded-xl border border-border-subtle p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-text-tertiary">{template.audience}</p>
                      {subjectText ? <p className="mt-2 text-sm font-semibold text-text-primary">{subjectText}</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-xs ${getExecutionSummaryTone(template.readiness)}`}>
                        {getAccountUpdateTemplateStatusChip(template)}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => void copyAccountUpdateTemplate(template)}>
                        {getAccountUpdateTemplateCopyButtonLabel(template, copiedTemplateId)}
                      </Button>
                    </div>
                  </div>
                  {getAccountUpdateTemplateContextLines(template, {
                    includeSubject: false,
                    includeMessage: false,
                    prefixReadiness: false,
                  }).map((line) => (
                    <p key={line} className="mt-2 text-xs text-text-secondary">{line}</p>
                  ))}
                  {bodyText ? <p className="mt-2 whitespace-pre-line text-sm text-text-secondary">{bodyText}</p> : null}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card>
        <div id="case-setup" className="scroll-mt-24" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Case setup</h3>
            <p className="mt-1 text-sm text-text-secondary">This is the engine input. Keep it lean and structured.</p>
          </div>
          <Button size="sm" onClick={() => void onSave()} disabled={saving}>{saving ? 'Saving…' : 'Save planner case'}</Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Current first name</span>
            <input className="w-full rounded-lg border border-border px-3 py-2" value={draft.current_first_name} onChange={(e) => onDraftChange({ current_first_name: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Current middle name</span>
            <input className="w-full rounded-lg border border-border px-3 py-2" value={draft.current_middle_name ?? ''} onChange={(e) => onDraftChange({ current_middle_name: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Current last name</span>
            <input className="w-full rounded-lg border border-border px-3 py-2" value={draft.current_last_name} onChange={(e) => onDraftChange({ current_last_name: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Target first name</span>
            <input className="w-full rounded-lg border border-border px-3 py-2" value={draft.target_first_name} onChange={(e) => onDraftChange({ target_first_name: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Target middle name</span>
            <input className="w-full rounded-lg border border-border px-3 py-2" value={draft.target_middle_name ?? ''} onChange={(e) => onDraftChange({ target_middle_name: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Target last name</span>
            <input className="w-full rounded-lg border border-border px-3 py-2" value={draft.target_last_name} onChange={(e) => onDraftChange({ target_last_name: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Spouse last name</span>
            <input className="w-full rounded-lg border border-border px-3 py-2" value={String(draft.structured_intake.spouseLastName ?? '')} onChange={(e) => onStructuredIntakeChange('spouseLastName', e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Marriage date</span>
            <input type="date" className="w-full rounded-lg border border-border px-3 py-2" value={draft.marriage_date ?? ''} onChange={(e) => onDraftChange({ marriage_date: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">California county</span>
            <input className="w-full rounded-lg border border-border px-3 py-2" value={draft.county_residence ?? ''} onChange={(e) => onDraftChange({ county_residence: e.target.value })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Legal basis</span>
            <select className="w-full rounded-lg border border-border px-3 py-2" value={draft.legal_basis} onChange={(e) => onDraftChange({ legal_basis: e.target.value as NameChangeCaseInput['legal_basis'] })}>
              <option value="marriage">Marriage</option>
              <option value="court_order">Court order</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Urgency</span>
            <select className="w-full rounded-lg border border-border px-3 py-2" value={draft.urgency_level} onChange={(e) => onDraftChange({ urgency_level: e.target.value as NameChangeCaseInput['urgency_level'] })}>
              <option value="standard">Standard</option>
              <option value="expedited">Expedited</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-text-secondary">Employment status</span>
            <select className="w-full rounded-lg border border-border px-3 py-2" value={draft.employment_status} onChange={(e) => onDraftChange({ employment_status: e.target.value as NameChangeCaseInput['employment_status'] })}>
              <option value="employed">Employed</option>
              <option value="self_employed">Self-employed</option>
              <option value="not_employed">Not employed</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            { label: 'Has passport', checked: draft.has_us_passport, key: 'has_us_passport' },
            { label: 'Passport needs update', checked: draft.passport_needs_update, key: 'passport_needs_update' },
            { label: 'Has CA Real ID / license', checked: draft.has_real_id_license, key: 'has_real_id_license' },
            { label: 'Travel booked soon', checked: Boolean(draft.structured_intake.travelBookedSoon), key: 'travelBookedSoon', source: 'structured' },
            { label: 'Wants doc intake help', checked: draft.structured_intake.wantsDocumentIntakeHelp !== false, key: 'wantsDocumentIntakeHelp', source: 'structured' },
          ].map((item) => (
            <label key={item.key} className="flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => item.source === 'structured'
                  ? onStructuredIntakeChange(item.key, e.target.checked)
                  : onDraftChange({ [item.key]: e.target.checked } as Partial<NameChangeCaseInput>)}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </Card>

      {(plan.summary.missingInputs.length > 0 || plan.summary.cautionNotes.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {plan.summary.missingInputs.length > 0 && (
            <Card className="border-warning/30 bg-warning/5">
              <h3 className="text-lg font-semibold text-text-primary">Intake gaps to close</h3>
              <p className="mt-1 text-sm text-text-secondary">These are the missing pieces keeping the planner from being cleanly actionable.</p>
              <ul className="mt-3 space-y-2 text-sm text-text-primary">
                {plan.summary.missingInputs.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </Card>
          )}

          {plan.summary.cautionNotes.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold text-text-primary">Planner notes</h3>
              <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                {plan.summary.cautionNotes.map((note) => <li key={note}>• {note}</li>)}
              </ul>
            </Card>
          )}
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Canonical case requirements</h3>
            <p className="text-sm text-text-secondary">Early skeleton for the real name-change system contract: canonical case truth plus requirement evaluation.</p>
          </div>
          <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
            {requirementSnapshot.summary.satisfied} satisfied · {requirementSnapshot.summary.attention} attention · {requirementSnapshot.summary.missing} missing
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {requirementSnapshot.results.map((result) => (
            <div key={result.key} className="rounded-xl border border-border-subtle p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{result.label}</p>
                  <p className="mt-1 text-xs text-text-secondary">{result.stage}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs ${result.status === 'satisfied' ? 'bg-success/10 text-success' : result.status === 'attention' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}`}>
                  {result.status}
                </span>
              </div>
              <p className="mt-3 text-sm text-text-secondary">{result.reason}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Document intake contract</h3>
            <p className="text-sm text-text-secondary">Real system slice for required documents, extraction expectations, and autofill-readiness prep.</p>
          </div>
          <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
            {documentIntakeSnapshot.summary.requiredReady} required ready · {documentIntakeSnapshot.summary.requiredMissing} required missing · {documentIntakeSnapshot.summary.extractionGaps} extraction gaps
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {documentIntakeSnapshot.documents.map((document) => (
            <div key={document.kind} className="rounded-xl border border-border-subtle p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{document.label}</p>
                  <p className="mt-1 text-xs text-text-secondary">{document.required ? 'required' : 'optional'} · {document.preferredForAutofill ? 'autofill-preferred' : 'supporting'}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs ${document.intakeStatus === 'reviewed' ? 'bg-success/10 text-success' : document.intakeStatus === 'uploaded' ? 'bg-warning/10 text-warning' : 'bg-surface-subtle text-text-secondary'}`}>
                  {document.intakeStatus}
                </span>
              </div>
              <p className="mt-3 text-sm text-text-secondary">Captured fields: {document.capturedExtractionFields.length > 0 ? document.capturedExtractionFields.join(', ') : 'none yet'}</p>
              <p className="mt-2 text-xs text-text-secondary">Missing extraction fields: {document.missingExtractionFields.length > 0 ? document.missingExtractionFields.join(', ') : 'none'}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Autofill prep snapshot</h3>
            <p className="text-sm text-text-secondary">First real form/autofill-prep slice: canonical values plus extracted-field-backed candidates for downstream execution.</p>
          </div>
          <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
            {autofillPrepSnapshot.summary.ready} ready · {autofillPrepSnapshot.summary.missing} missing · {autofillPrepSnapshot.summary.extractedBacked} extracted-backed
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {autofillPrepSnapshot.fields.map((field) => (
            <div key={field.targetField} className="rounded-xl border border-border-subtle p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{field.label}</p>
                  <p className="mt-1 text-xs text-text-secondary">{field.targetField}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs ${field.value.confidence === 'high' ? 'bg-success/10 text-success' : field.value.confidence === 'medium' ? 'bg-warning/10 text-warning' : 'bg-surface-subtle text-text-secondary'}`}>
                  {field.value.confidence}
                </span>
              </div>
              <p className="mt-3 text-sm text-text-primary">{field.value.value ?? 'Missing'}</p>
              <p className="mt-2 text-xs text-text-secondary">Source: {field.value.source}{field.value.sourceDocumentKind ? ` · ${field.value.sourceDocumentKind}` : ''}{field.value.sourceFieldKey ? ` · ${field.value.sourceFieldKey}` : ''}</p>
            </div>
          ))}
        </div>
      </Card>

      {executionSectionSummaries.length > 0 && (
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Execution section index</h3>
              <p className="text-sm text-text-secondary">Jump straight to the right lane instead of scrolling through the whole planner stack.</p>
            </div>
            <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
              {executionSectionSummaries.length} section{executionSectionSummaries.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {executionSectionSummaries.map((section) => (
              <button
                key={section.key}
                type="button"
                onClick={() => scrollToPlannerTarget(`execution-section-${section.key}`)}
                className="rounded-xl border border-border-subtle bg-white/60 p-4 text-left transition hover:border-primary/30 hover:bg-primary/5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-text-primary">{section.title}</p>
                  <span className={`rounded-full px-2 py-1 text-xs ${section.postureTone === 'danger' ? 'bg-danger/10 text-danger' : section.postureTone === 'warning' ? 'bg-warning/10 text-warning' : section.postureTone === 'primary' ? 'bg-primary/10 text-primary' : 'bg-surface-subtle text-text-secondary'}`}>
                    {section.postureLabel}
                  </span>
                </div>
                <p className="mt-2 text-xs text-text-secondary">{section.progressPercent}% · {section.progressLabel}</p>
                <p className="mt-2 text-xs text-text-secondary">{section.highestRiskCard}</p>
              </button>
            ))}
          </div>
        </Card>
      )}

      {executionSectionSummaries.map((section) => (
        <div key={section.key} className="space-y-4">
          <div id={`execution-section-${section.key}`} className="scroll-mt-24 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">{section.title}</h3>
              <p className="text-sm text-text-secondary">{section.description}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-1 text-xs ${section.postureTone === 'danger' ? 'bg-danger/10 text-danger' : section.postureTone === 'warning' ? 'bg-warning/10 text-warning' : section.postureTone === 'primary' ? 'bg-primary/10 text-primary' : 'bg-surface-subtle text-text-secondary'}`}>
                  {section.postureLabel}
                </span>
                <span className="text-xs text-text-secondary">{section.postureDetail}</span>
              </div>
              <div className="mt-3 max-w-xl">
                <div className="flex items-center justify-between gap-3 text-xs text-text-secondary">
                  <span>Section progress</span>
                  <span>{section.progressPercent}% · {section.progressLabel}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-subtle">
                  <div
                    className={`h-full rounded-full ${section.postureTone === 'danger' ? 'bg-danger' : section.postureTone === 'warning' ? 'bg-warning' : section.postureTone === 'primary' ? 'bg-primary' : 'bg-text-secondary'}`}
                    style={{ width: `${section.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <Button size="sm" variant="outline" onClick={() => toggleSectionCollapsed(section.key)}>
              {isSectionCollapsed(section) ? 'Expand section' : 'Collapse section'}
            </Button>
          </div>

          {(section.reminderKeys.length > 0 || section.staleReminderKeys.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {section.highestRiskCardKey && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => section.highestRiskCardKey && scrollToPlannerTarget(`execution-card-${section.highestRiskCardKey}`)}
                >
                  Focus highest-risk card
                </Button>
              )}
              {section.staleReminderKeys.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRemindersChange(
                    bulkUpdateNameChangeReminderStatus(effectiveReminders, section.staleReminderKeys, 'scheduled'),
                    { action: 'schedule-stale' },
                  )}
                >
                  Schedule {section.staleReminderKeys.length} stale reminder{section.staleReminderKeys.length === 1 ? '' : 's'}
                </Button>
              )}
              {section.reminderKeys.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRemindersChange(
                    bulkUpdateNameChangeReminderStatus(effectiveReminders, section.reminderKeys, 'dismissed'),
                    { action: 'bulk-update' },
                  )}
                >
                  Dismiss {section.reminderKeys.length} section reminder{section.reminderKeys.length === 1 ? '' : 's'}
                </Button>
              )}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border-subtle bg-white/60 p-4">
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Section readiness</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{section.readyCount} ready · {section.blockedCount} blocked</p>
              <p className="mt-2 text-xs text-text-secondary">Cards in this section that can move now vs still need work.</p>
            </div>
            <div className="rounded-xl border border-border-subtle bg-white/60 p-4">
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Attention load</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{section.attentionCount} attention markers</p>
              <p className="mt-2 text-xs text-text-secondary">Checklist items that are not outright blocked but still need eyes.</p>
            </div>
            <div className="rounded-xl border border-border-subtle bg-white/60 p-4">
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Highest-risk card</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{section.highestRiskCard}</p>
              <p className="mt-2 text-xs text-text-secondary">The card in this section carrying the most blockers / unresolved attention.</p>
            </div>
            <div className="rounded-xl border border-border-subtle bg-white/60 p-4">
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Stale reminder overlap</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{section.staleReminderOverlap} stale overlaps</p>
              <p className="mt-2 text-xs text-text-secondary">How much stale reminder follow-up still seems to be pooling around this section.</p>
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-primary">Section next action</p>
                <p className="mt-2 text-sm font-semibold text-text-primary">{section.nextActionLabel}</p>
                <div className="mt-2 space-y-1 text-xs text-text-secondary">
                  <p>{section.nextActionOverview ?? section.nextActionDetail}</p>
                  {section.nextActionDoNow ? <p>Do now: {section.nextActionDoNow}</p> : null}
                  {section.nextActionWhyItHelps ? <p>Why it helps: {section.nextActionWhyItHelps}</p> : null}
                  {section.nextActionCanWait ? <p>Can wait: {section.nextActionCanWait}</p> : null}
                </div>
              </div>
              {section.highestRiskCardKey && (
                <Button
                  size="sm"
                  onClick={() => section.highestRiskCardKey && scrollToPlannerTarget(`execution-card-${section.highestRiskCardKey}`)}
                >
                  Open next action
                </Button>
              )}
            </div>
          </div>

          {!isSectionCollapsed(section) && (
            <div className="space-y-6">
              {section.cards.map(({ key, ...card }) => (
                <ExecutionSnapshotCard key={key} anchorId={`execution-card-${key}`} {...card} />
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <Card>
        <div id="account-update-templates" className="scroll-mt-24" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Guided action feed</h3>
            <p className="text-sm text-text-secondary">One ordered worklist that merges execution next steps with document-repair actions.</p>
          </div>
          <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
            {actionFeed.length} action{actionFeed.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {actionFeed.slice(0, 6).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => scrollToPlannerTarget(item.focusTargetId)}
              className="rounded-xl border border-border-subtle p-4 text-left transition hover:border-primary/30 hover:bg-primary/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{item.action.label}</p>
                  <p className="mt-1 text-xs text-text-secondary">{item.title} · {item.laneLabel}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`rounded-full px-2 py-1 text-xs ${item.severity === 'blocking' ? 'bg-danger/10 text-danger' : item.severity === 'attention' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                    {item.severity}
                  </span>
                  <span className={`rounded-full px-2 py-1 text-xs ${getActionFeedUrgencyClass(item.urgencyTier)}`}>
                    {item.urgencyTier}
                  </span>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm text-text-secondary">{item.action.detail}</p>
              <p className="mt-2 text-xs text-text-secondary">{getActionFeedSectionLabel(item.sectionKey)} · {item.origin === 'execution' ? 'execution lane' : 'document repair'} · {item.action.category} · {getActionFeedUrgencyReasonLabel(item.urgencyReason)} · score {item.score}</p>
              <p className="mt-3 text-xs font-medium text-primary">{getActionFeedCtaLabel(item.plannerIntent)} →</p>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2">
          <FileStack className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Document intake accelerator</h3>
              <p className="text-sm text-text-secondary">Optional metadata only. No raw-document dependency in the engine.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {documentOptions.map((option) => {
              const present = documents.some((document) => document.document_kind === option.key);
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => present
                    ? onDocumentsChange(documents.filter((document) => document.document_kind !== option.key))
                    : onDocumentsChange(ensureDocument(documents, option.key, option.label))}
                  className={`rounded-full border px-3 py-1.5 text-sm ${present ? 'border-primary bg-primary/10 text-primary' : 'border-border-subtle text-text-secondary'}`}
                >
                  {present ? 'Added · ' : 'Add · '}{option.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border-subtle p-3">
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Required ready</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{documentIntakeSnapshot.summary.requiredReady}</p>
            </div>
            <div className="rounded-xl border border-border-subtle p-3">
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Required missing</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{documentIntakeSnapshot.summary.requiredMissing}</p>
            </div>
            <div className="rounded-xl border border-border-subtle p-3">
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Metadata ready</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{documentIntakeSnapshot.summary.metadataReady}</p>
            </div>
            <div className="rounded-xl border border-border-subtle p-3">
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Metadata gaps</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{documentIntakeSnapshot.summary.metadataGaps}</p>
            </div>
          </div>

          {documentRepairQueue.length > 0 ? (
            <div className="mt-4 rounded-xl border border-border-subtle p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-text-primary">Document repair queue</h4>
                  <p className="text-xs text-text-secondary">Highest-leverage artifact fixes based on current metadata gaps, extraction gaps, and field-level execution risk.</p>
                </div>
                <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
                  {documentRepairQueue.filter((item) => item.severity === 'blocking').length} blocking · {documentRepairQueue.filter((item) => item.severity === 'attention').length} attention
                </span>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {documentRepairQueue.slice(0, 6).map((item) => (
                  <div id={`document-${item.kind}`} key={item.kind} className="rounded-xl border border-border-subtle p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                        <p className="mt-1 text-xs text-text-secondary">score {item.score} · {item.required ? 'required' : 'supporting'} · {item.intakeStatus}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs ${item.severity === 'blocking' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>
                        {item.severity}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-text-secondary">{item.impactSummary}</p>
                    <p className="mt-2 text-xs text-text-secondary">Payoff: {item.payoffSummary}</p>

                    {item.metadataMissing.length > 0 ? (
                      <p className="mt-2 text-xs text-text-secondary">Metadata missing: {item.metadataMissing.join(', ')}</p>
                    ) : null}
                    {item.missingExtractionFields.length > 0 ? (
                      <p className="mt-2 text-xs text-text-secondary">Extraction missing: {item.missingExtractionFields.join(', ')}</p>
                    ) : null}
                    {item.impactedTargets.length > 0 ? (
                      <p className="mt-2 text-xs text-text-secondary">Unblocks: {item.impactedTargets.join(', ')}</p>
                    ) : null}
                    {item.impactedFields.length > 0 ? (
                      <p className="mt-2 text-xs text-text-secondary">
                        Repairs fields: {item.impactedFields.slice(0, 4).map((field) => `${field.label} (${field.targetLabel})`).join(', ')}
                      </p>
                    ) : null}
                    {item.nextActions.length > 0 ? (
                      <div className="mt-3 rounded-lg bg-surface-subtle/60 p-3">
                        <p className="text-xs uppercase tracking-wide text-text-tertiary">Next repair actions</p>
                        <ul className="mt-2 space-y-2 text-xs text-text-secondary">
                          {item.nextActions.map((action) => (
                            <li key={`${action.category}:${action.label}`} className="rounded-lg border border-border-subtle bg-white/70 px-3 py-2">
                              <p className="font-medium text-text-primary">{action.label}</p>
                              <p className="mt-1 whitespace-pre-line text-xs text-text-secondary">{action.detail}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            {documents.length === 0 ? (
              <p className="text-sm text-text-tertiary">No document metadata yet. That is fine — the planner can still work off manual structured fields.</p>
            ) : documents.map((document) => (
              <div key={document.document_kind} className="rounded-xl border border-border-subtle p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{document.display_name}</p>
                    <p className="text-xs text-text-secondary">{document.storage_mode === 'metadata_only' ? 'Metadata only' : 'No file stored'} · {document.document_kind}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-xs ${document.intake_status === 'reviewed' ? 'bg-success/10 text-success' : document.intake_status === 'uploaded' ? 'bg-warning/10 text-warning' : 'bg-surface-subtle text-text-secondary'}`}>{document.intake_status}</span>
                    <Button variant="ghost" size="sm" onClick={() => onDocumentsChange(documents.filter((item) => item.document_kind !== document.document_kind))}>Remove</Button>
                  </div>
                </div>

                {(() => {
                  const contractStatus = documentIntakeSnapshot.documents.find((item) => item.kind === document.document_kind);
                  if (!contractStatus) return null;

                  return (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg bg-surface-subtle/60 p-3">
                        <p className="text-xs uppercase tracking-wide text-text-tertiary">Metadata completeness</p>
                        <p className="mt-2 text-xs text-text-secondary">
                          {contractStatus.metadataMissing.length === 0
                            ? 'Ready for downstream use.'
                            : `Missing: ${contractStatus.metadataMissing.join(', ')}`}
                        </p>
                      </div>
                      <div className="rounded-lg bg-surface-subtle/60 p-3">
                        <p className="text-xs uppercase tracking-wide text-text-tertiary">Extraction coverage</p>
                        <p className="mt-2 text-xs text-text-secondary">
                          {contractStatus.missingExtractionFields.length === 0
                            ? 'All expected extraction fields captured.'
                            : `Missing: ${contractStatus.missingExtractionFields.join(', ')}`}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="text-sm">
                    <span className="mb-1 block text-xs font-medium text-text-secondary">Document label</span>
                    <input
                      className="w-full rounded-lg border border-border px-3 py-2"
                      value={document.display_name}
                      onChange={(e) => onDocumentsChange(updateDocument(documents, document.document_kind, { display_name: e.target.value }))}
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs font-medium text-text-secondary">Intake status</span>
                    <select
                      className="w-full rounded-lg border border-border px-3 py-2"
                      value={document.intake_status}
                      onChange={(e) => onDocumentsChange(updateDocument(documents, document.document_kind, { intake_status: e.target.value as NameChangeDocumentInput['intake_status'] }))}
                    >
                      <option value="not_started">Not started</option>
                      <option value="uploaded">Uploaded / captured</option>
                      <option value="reviewed">Reviewed</option>
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs font-medium text-text-secondary">Masked filename</span>
                    <input
                      className="w-full rounded-lg border border-border px-3 py-2"
                      value={document.file_name_masked ?? ''}
                      onChange={(e) => onDocumentsChange(updateDocument(documents, document.document_kind, { file_name_masked: e.target.value || null }))}
                      placeholder="license-•••.pdf"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs font-medium text-text-secondary">Issuing authority</span>
                    <input
                      className="w-full rounded-lg border border-border px-3 py-2"
                      value={document.issuing_authority ?? ''}
                      onChange={(e) => onDocumentsChange(updateDocument(documents, document.document_kind, { issuing_authority: e.target.value || null }))}
                      placeholder="California DMV / County Clerk"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs font-medium text-text-secondary">Issued on</span>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-border px-3 py-2"
                      value={document.issued_on ?? ''}
                      onChange={(e) => onDocumentsChange(updateDocument(documents, document.document_kind, { issued_on: e.target.value || null }))}
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs font-medium text-text-secondary">Expires on</span>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-border px-3 py-2"
                      value={document.expires_on ?? ''}
                      onChange={(e) => onDocumentsChange(updateDocument(documents, document.document_kind, { expires_on: e.target.value || null }))}
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="text-sm">
                    <span className="mb-1 block text-xs font-medium text-text-secondary">Extraction confidence</span>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      className="w-full rounded-lg border border-border px-3 py-2"
                      value={document.extraction_confidence ?? ''}
                      onChange={(e) => onDocumentsChange(updateDocument(documents, document.document_kind, {
                        extraction_confidence: e.target.value === '' ? null : Math.max(0, Math.min(1, Number(e.target.value))),
                      }))}
                      placeholder="0.92"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs font-medium text-text-secondary">Storage mode</span>
                    <select
                      className="w-full rounded-lg border border-border px-3 py-2"
                      value={document.storage_mode}
                      onChange={(e) => onDocumentsChange(updateDocument(documents, document.document_kind, { storage_mode: e.target.value as NameChangeDocumentInput['storage_mode'] }))}
                    >
                      <option value="metadata_only">Metadata only</option>
                      <option value="none">No file stored</option>
                    </select>
                  </label>
                </div>

                <label className="mt-4 block text-sm">
                  <span className="mb-1 block text-xs font-medium text-text-secondary">Structured extraction notes / snapshot JSON</span>
                  <textarea
                    className="min-h-[92px] w-full rounded-lg border border-border px-3 py-2 text-sm"
                    value={documentSnapshotDrafts[document.document_kind] ?? ''}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      setDocumentSnapshotDrafts((current) => ({
                        ...current,
                        [document.document_kind]: rawValue,
                      }));

                      const nextValue = rawValue.trim();
                      if (!nextValue) {
                        onDocumentsChange(updateDocument(documents, document.document_kind, { extracted_snapshot: null }));
                        return;
                      }

                      try {
                        onDocumentsChange(updateDocument(documents, document.document_kind, { extracted_snapshot: JSON.parse(nextValue) as Record<string, unknown> }));
                      } catch {
                        // Leave the local draft alone until the JSON is valid.
                      }
                    }}
                    placeholder='{"issuer":"County Clerk","reviewNotes":"Name legible"}'
                  />
                </label>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Extraction contract workspace</h3>
              <p className="text-sm text-text-secondary">Document-specific structured fields the broader name-change system actually reads.</p>
            </div>
          </div>

          {extractionContractSnapshot.summary.conflictCount > 0 && (
            <div className="mt-4 rounded-xl border border-warning/30 bg-warning/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-text-primary">Canonical conflicts to resolve</h4>
                  <p className="text-xs text-text-secondary">Structured case truth and extracted document values are disagreeing. Fix this before treating autofill as trustworthy.</p>
                </div>
                <span className="rounded-full bg-warning/10 px-2 py-1 text-xs text-warning">
                  {extractionContractSnapshot.summary.conflictCount} conflict{extractionContractSnapshot.summary.conflictCount === 1 ? '' : 's'}
                </span>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {extractionContractSnapshot.conflicts.map((conflict) => (
                  <div key={conflict.key} className="rounded-lg border border-warning/20 bg-white/70 p-3">
                    <p className="text-sm font-medium text-text-primary">{conflict.label}</p>
                    <p className="mt-2 text-xs text-text-secondary">Structured: {conflict.canonicalValue ?? 'missing'} · Extracted: {conflict.extractedValue}</p>
                    <p className="mt-2 text-xs text-text-secondary">{conflict.documentKind} · {conflict.fieldKey}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 grid gap-4">
            {NAME_CHANGE_DOCUMENT_CONTRACTS
              .filter((contract) => contract.extractionFields.length > 0)
              .filter((contract) => contract.requiredFor.includes('all') || contract.requiredFor.includes(draft.legal_basis) || documents.some((document) => matchesContractDocumentKind(document.document_kind, contract.kind)))
              .map((contract) => {
                const status = documentIntakeSnapshot.documents.find((document) => document.kind === contract.kind);
                const contractDocument = findContractDocument(documents, contract.kind);
                const typedSnapshot = contract.kind === 'marriage_certificate'
                  ? extractionContractSnapshot.marriageCertificate
                  : contract.kind === 'court_order'
                    ? extractionContractSnapshot.courtOrder
                    : contract.kind === 'current_passport'
                      ? extractionContractSnapshot.currentPassport
                      : contract.kind === 'current_drivers_license'
                        ? extractionContractSnapshot.currentDriversLicense
                        : null;

                return (
                  <div key={contract.kind} className="rounded-xl border border-border-subtle p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{contract.label}</p>
                        <p className="mt-1 text-xs text-text-secondary">
                          {status?.required ? 'required' : 'supporting'} · {status?.preferredForAutofill ? 'autofill-driving' : 'reference-only'}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs ${status?.intakeStatus === 'reviewed' ? 'bg-success/10 text-success' : status?.intakeStatus === 'uploaded' ? 'bg-warning/10 text-warning' : 'bg-surface-subtle text-text-secondary'}`}>
                        {status?.intakeStatus ?? 'not started'}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {contract.extractionFields.map((fieldKey) => {
                        const current = findContractExtractedField(extractedFields, contractDocument?.id, fieldKey);
                        const isCaptured = status?.capturedExtractionFields.includes(fieldKey) ?? false;
                        return (
                          <label key={`${contract.kind}-${fieldKey}`} className="block text-sm">
                            <span className="mb-1 flex items-center justify-between gap-2 text-xs font-medium text-text-secondary">
                              <span>{extractionFieldLabels[fieldKey]}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] ${isCaptured ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                                {isCaptured ? 'captured' : 'missing'}
                              </span>
                            </span>
                            <input
                              className="w-full rounded-lg border border-border px-3 py-2"
                              value={current?.field_value_masked ?? ''}
                              onChange={(e) => onExtractedFieldsChange(upsertDraftNameChangeExtractedField(
                                extractedFields,
                                contractDocument?.id,
                                fieldKey,
                                extractionFieldLabels[fieldKey] ?? fieldKey,
                                e.target.value,
                              ))}
                              placeholder={extractionFieldPlaceholders[fieldKey] ?? 'Masked structured value'}
                            />
                          </label>
                        );
                      })}
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg bg-surface-subtle/60 p-3">
                        <p className="text-xs uppercase tracking-wide text-text-tertiary">Accepted signals</p>
                        <p className="mt-2 text-xs text-text-secondary">{contract.acceptedSignals.join(' · ')}</p>
                      </div>
                      <div className="rounded-lg bg-surface-subtle/60 p-3">
                        <p className="text-xs uppercase tracking-wide text-text-tertiary">Typed extraction snapshot</p>
                        <p className="mt-2 text-xs text-text-secondary break-words">
                          {typedSnapshot ? JSON.stringify(typedSnapshot) : 'No typed extraction view for this document kind yet.'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2">
          <MapPinned className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Engine-generated workflow</h3>
            <p className="text-sm text-text-secondary">Registry-driven steps, not a static checklist.</p>
          </div>
        </div>

        {plan.summary.blockers.length > 0 && (
          <div className="mt-4 rounded-xl border border-warning/30 bg-warning/5 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Current blockers</p>
                <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                  {plan.summary.blockers.map((blocker) => <li key={blocker}>• {blocker}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-4">
          {plan.steps.map((step) => (
            <div key={step.id} className="rounded-xl border border-border-subtle p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-tertiary">{step.phase}</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">{step.title}</p>
                  <p className="mt-1 text-sm text-text-secondary">{step.description}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs ${step.status === 'ready' ? 'bg-success/10 text-success' : step.status === 'blocked' ? 'bg-warning/10 text-warning' : 'bg-surface-subtle text-text-secondary'}`}>{step.status}</span>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm">
                <div>
                  <p className="font-medium text-text-primary">Timing</p>
                  <p className="mt-1 text-text-secondary">{step.timing}</p>
                </div>
                <div>
                  <p className="font-medium text-text-primary">Evidence</p>
                  <ul className="mt-1 space-y-1 text-text-secondary">{step.evidenceNeeded.map((item) => <li key={item}>• {item}</li>)}</ul>
                </div>
                <div>
                  <p className="font-medium text-text-primary">Forms / institutions</p>
                  <ul className="mt-1 space-y-1 text-text-secondary">
                    {step.forms.map((form) => <li key={form.code}>• {form.code} — {form.title}</li>)}
                    {step.institutions.map((institution) => <li key={institution}>• {institution}</li>)}
                  </ul>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">Execution: {step.executionStatus ?? 'todo'}</span>
                {step.executionStatus !== 'in_progress' && step.status !== 'blocked' && (
                  <Button variant="ghost" size="sm" onClick={() => onStepExecutionStatusChange(step.id, 'in_progress')}>Mark in progress</Button>
                )}
                {step.executionStatus !== 'complete' && step.status !== 'blocked' && (
                  <Button variant="ghost" size="sm" onClick={() => onStepExecutionStatusChange(step.id, 'complete')}>Mark complete</Button>
                )}
                {step.executionStatus !== 'todo' && (
                  <Button variant="ghost" size="sm" onClick={() => onStepExecutionStatusChange(step.id, 'todo')}>Reset</Button>
                )}
              </div>
              <div className="mt-3 grid gap-2">
                <label className="text-xs font-medium text-text-secondary">Execution note</label>
                <textarea
                  className="min-h-[84px] w-full rounded-lg border border-border px-3 py-2 text-sm"
                  value={step.executionNote ?? ''}
                  onChange={(e) => onStepExecutionNoteChange(step.id, e.target.value)}
                  placeholder="Add what was submitted, confirmed, or still blocked here"
                />
                {(step.executionUpdatedAt || step.completedAt) && (
                  <p className="text-xs text-text-secondary">
                    {step.executionUpdatedAt ? `Updated ${formatNameChangeExecutionDateTime(step.executionUpdatedAt)}` : ''}
                    {step.executionUpdatedAt && step.completedAt ? ' · ' : ''}
                    {step.completedAt ? `Completed ${formatNameChangeExecutionDateTime(step.completedAt)}` : ''}
                  </p>
                )}
              </div>
              {step.blockers.length > 0 && <p className="mt-3 text-xs text-warning">Blocked by: {step.blockers.join(' · ')}</p>}
            </div>
          ))}
        </div>
      </Card>

      {(plan.summary.recentExecutionActivity?.length ?? 0) > 0 && (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Recent execution activity</h3>
              <p className="text-sm text-text-secondary">Latest name-change workflow updates captured from step execution notes and status changes.</p>
              <p className="mt-2 text-xs text-text-secondary">{plan.summary.activitySourceCounts?.step ?? 0} step updates · {plan.summary.activitySourceCounts?.reminder ?? 0} reminder actions</p>
              <p className="mt-1 text-xs text-text-secondary">Latest movement posture: {plan.summary.latestMovementPosture ?? 'mixed'}</p>
              <p className="mt-1 text-xs text-text-secondary">Dominant movement lane: {plan.summary.dominantMovementLane ?? 'mixed'}</p>
              {plan.summary.mixedMovementReason && <p className="mt-1 text-xs text-text-secondary">Mixed movement reason: {plan.summary.mixedMovementReason}</p>}
              {plan.summary.mixedMovementReason && <p className="mt-1 text-xs text-text-secondary">Mixed window still shows untouched risk: {plan.summary.mixedMovementHasUntouchedRisk ? 'yes' : 'no'}</p>}
              {plan.summary.mixedMovementReason && <p className="mt-1 text-xs text-text-secondary">Mixed window reminder-heavy: {plan.summary.mixedMovementReminderHeavy ? 'yes' : 'no'}</p>}
              <p className="mt-1 text-xs text-text-secondary">Reminder churn risk: {plan.summary.reminderChurnRisk ?? 'low'}</p>
              <p className="mt-1 text-xs text-text-secondary">Recent completion: {plan.summary.hasRecentCompletion ? 'yes' : 'no'}</p>
              <p className="mt-1 text-xs text-text-secondary">Recent start: {plan.summary.hasRecentStart ? 'yes' : 'no'}</p>
              <p className="mt-1 text-xs text-text-secondary">Untouched risk still visible: {plan.summary.hasRecentUntouchedRisk ? 'yes' : 'no'}</p>
              <p className="mt-1 text-xs text-text-secondary">Zero recent step movement: {plan.summary.hasZeroRecentStepMovement ? 'yes' : 'no'}</p>
            </div>
            <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">
              {plan.summary.recentExecutionActivity?.length ?? 0} recent updates
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {plan.summary.recentExecutionActivity?.map((item) => (
              <div key={`${item.stepId}-${item.timestamp}`} className="rounded-xl border border-border-subtle p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{item.title}</p>
                    <p className="mt-1 text-xs text-text-secondary">{formatNameChangeExecutionDateTime(item.timestamp)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">{item.source}</span>
                    <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">{item.executionStatus}</span>
                  </div>
                </div>
                {item.note && <p className="mt-3 text-sm text-text-secondary">{item.note}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {reminderAttention.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Reminder attention needed</h3>
              <p className="text-sm text-text-secondary">Open reminders still tied to incomplete workflow steps.</p>
              <p className="mt-2 text-xs text-text-secondary">{reminderAttentionSummary.highUrgency} high urgency · {reminderAttentionSummary.actionablePriority} actionable priority · {reminderAttentionSummary.blockedAndStale} blocked + stale</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/70 px-2 py-1 text-xs text-text-secondary">{reminderAttention.length} attention item{reminderAttention.length === 1 ? '' : 's'}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemindersChange(bulkUpdateNameChangeReminderStatus(effectiveReminders, reminderAttention.map((item) => item.reminderKey), 'scheduled'), { action: 'bulk-update' })}
              >
                Schedule all
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemindersChange(bulkUpdateNameChangeReminderStatus(effectiveReminders, reminderAttention.map((item) => item.reminderKey), 'dismissed'), { action: 'bulk-update' })}
              >
                Dismiss all
              </Button>
              {reminderAttentionSummary.stale > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemindersChange(bulkUpdateNameChangeReminderStatus(effectiveReminders, reminderAttention.filter((item) => item.isStale).map((item) => item.reminderKey), 'scheduled'), { action: 'schedule-stale' })}
                >
                  Schedule stale
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {reminderPostureCards.map(({ key, ...card }) => (
              <ReminderPostureCard key={key} {...card} />
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-warning/20 bg-white/60 p-4">
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Actionable split</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{reminderAttentionSummary.actionablePriority} priority · {reminderAttentionSummary.actionableNormal} normal</p>
              <p className="mt-2 text-xs text-text-secondary">{reminderAttentionSummary.actionableAndStale} actionable + stale · posture {reminderAttentionSummary.actionableFreshPosture}</p>
            </div>
            <div className="rounded-xl border border-warning/20 bg-white/60 p-4">
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Stale actionable split</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{reminderAttentionSummary.actionableStalePriority} priority · {reminderAttentionSummary.actionableStaleNormal} normal</p>
              <p className="mt-2 text-xs text-text-secondary">Posture {reminderAttentionSummary.staleActionablePosture}</p>
            </div>
            <div className="rounded-xl border border-warning/20 bg-white/60 p-4">
              <p className="text-xs uppercase tracking-wide text-text-tertiary">Blocked stale split</p>
              <p className="mt-2 text-sm font-semibold text-text-primary">{reminderAttentionSummary.blockedStalePriority} priority · {reminderAttentionSummary.blockedStaleNormal} normal</p>
              <p className="mt-2 text-xs text-text-secondary">Posture {reminderAttentionSummary.blockedStalePosture} · stale priority {reminderAttentionSummary.stalePriority}</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {reminderAttention.map((item) => (
              <div key={item.reminderKey} className="rounded-xl border border-warning/20 bg-white/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                    <p className="mt-1 text-xs text-text-secondary">Depends on {item.dependentStepTitle}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.priorityTier && <span className={`rounded-full px-2 py-1 text-xs ${item.priorityTier === 'critical' ? 'bg-danger/10 text-danger' : item.priorityTier === 'elevated' ? 'bg-warning/10 text-warning' : 'bg-surface-subtle text-text-secondary'}`}>{item.priorityTier}</span>}
                    {item.actionability && <span className={`rounded-full px-2 py-1 text-xs ${item.actionability === 'blocked_by_untouched_step' ? 'bg-surface-subtle text-text-secondary' : 'bg-primary/10 text-primary'}`}>{item.actionability === 'blocked_by_untouched_step' ? 'blocked' : 'actionable'}</span>}
                    {item.isStale && <span className="rounded-full bg-warning/10 px-2 py-1 text-xs text-warning">stale</span>}
                    <span className={`rounded-full px-2 py-1 text-xs ${item.urgency === 'high' ? 'bg-warning/10 text-warning' : item.urgency === 'medium' ? 'bg-primary/10 text-primary' : 'bg-surface-subtle text-text-secondary'}`}>{item.urgency}</span>
                  </div>
                </div>
                <p className="mt-3 text-sm text-text-secondary">Step is still {item.dependentStepExecutionStatus.replace('_', ' ')} · reminder is {item.reminderStatus}</p>
                <p className="mt-2 text-xs font-medium text-text-primary">Follow-up target: {item.suggestedOffsetDays} day{item.suggestedOffsetDays === 1 ? '' : 's'} after the triggering step</p>
                <p className="mt-2 text-xs text-text-secondary">Last workflow touch: {item.lastTouchedAt ? formatNameChangeExecutionDateTime(item.lastTouchedAt) : 'No execution updates yet'}</p>
                <div className="mt-3 flex gap-2">
                  {item.focusTargetId && (
                    <Button variant="ghost" size="sm" onClick={() => scrollToPlannerTarget(item.focusTargetId!)}>
                      {getReminderCtaLabel(item.plannerIntent)}
                    </Button>
                  )}
                  {item.reminderStatus !== 'scheduled' && (
                    <Button variant="ghost" size="sm" onClick={() => onRemindersChange(updateNameChangeReminderStatus(effectiveReminders, item.reminderKey, 'scheduled'), { action: 'single-update' })}>Schedule</Button>
                  )}
                  {item.reminderStatus !== 'dismissed' && (
                    <Button variant="ghost" size="sm" onClick={() => onRemindersChange(updateNameChangeReminderStatus(effectiveReminders, item.reminderKey, 'dismissed'), { action: 'single-update' })}>Dismiss</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {effectiveReminders.length > 0 && (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Suggested follow-up reminders</h3>
              <p className="text-sm text-text-secondary">Scaffolding for planner/admin follow-up timing based on the generated workflow.</p>
              <p className="mt-2 text-xs text-text-secondary">{reminderSummary.pending} pending · {reminderSummary.highUrgencyOpen} high-urgency open</p>
            </div>
            <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">{effectiveReminders.length} reminders</span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {effectiveReminders.map((reminder) => (
              <div key={reminder.reminder_key} className="rounded-xl border border-border-subtle p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{reminder.label}</p>
                    <p className="mt-1 text-xs text-text-secondary">Depends on: {reminder.depends_on_step_id}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs ${reminder.urgency === 'high' ? 'bg-warning/10 text-warning' : reminder.urgency === 'medium' ? 'bg-primary/10 text-primary' : 'bg-surface-subtle text-text-secondary'}`}>
                    {reminder.urgency}
                  </span>
                </div>
                <p className="mt-3 text-sm text-text-secondary">{reminder.reason}</p>
                <p className="mt-3 text-xs font-medium text-text-primary">Target follow-up: {reminder.suggested_offset_days} day{reminder.suggested_offset_days === 1 ? '' : 's'} after the triggering step</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs text-text-secondary">{reminder.status}</span>
                  <div className="flex gap-2">
                    {reminder.focus_target_id && (
                      <Button variant="ghost" size="sm" onClick={() => scrollToPlannerTarget(reminder.focus_target_id!)}>
                        {getReminderCtaLabel(reminder.planner_intent)}
                      </Button>
                    )}
                    {reminder.status !== 'scheduled' && (
                      <Button variant="ghost" size="sm" onClick={() => onRemindersChange(updateNameChangeReminderStatus(effectiveReminders, reminder.reminder_key, 'scheduled'), { action: 'single-update' })}>Schedule</Button>
                    )}
                    {reminder.status !== 'dismissed' && (
                      <Button variant="ghost" size="sm" onClick={() => onRemindersChange(updateNameChangeReminderStatus(effectiveReminders, reminder.reminder_key, 'dismissed'), { action: 'single-update' })}>Dismiss</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Rules + registry review</h3>
            <p className="text-sm text-text-secondary">Basic admin tooling for this phase: review what drives the engine.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowAdmin((value) => !value)}>{showAdmin ? 'Hide review' : 'Show review'}</Button>
        </div>

        {showAdmin && (
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-border-subtle p-4">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-text-primary">Seeded forms ({NAME_CHANGE_FORM_REGISTRY.length})</p>
              </div>
              <div className="mt-3 space-y-3">
                {NAME_CHANGE_FORM_REGISTRY.map((form) => (
                  <div key={form.code} className="rounded-lg bg-surface-subtle/50 p-3">
                    <p className="text-sm font-medium text-text-primary">{form.code} — {form.title}</p>
                    <p className="mt-1 text-xs text-text-secondary">{form.authority} · {form.jurisdiction}</p>
                    <p className="mt-1 text-xs text-text-secondary">Triggers: {form.appliesWhen.join(', ')}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border-subtle p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-text-primary">Institution library ({NAME_CHANGE_INSTITUTION_LIBRARY.length})</p>
              </div>
              <div className="mt-3 space-y-3">
                {NAME_CHANGE_INSTITUTION_LIBRARY.map((institution) => (
                  <div key={institution.key} className="rounded-lg bg-surface-subtle/50 p-3">
                    <p className="text-sm font-medium text-text-primary">{institution.label}</p>
                    <p className="mt-1 text-xs text-text-secondary">Category: {institution.category}</p>
                    <p className="mt-1 text-xs text-text-secondary">{institution.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
