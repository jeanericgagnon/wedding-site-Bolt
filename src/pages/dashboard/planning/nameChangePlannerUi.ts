import {
  getAccountUpdateTemplateContextLines,
  getAccountUpdateTemplateMessageLine,
  getAccountUpdateTemplateStatusLabel,
  sanitizeAccountUpdateTemplateText,
} from '../../../lib/nameChange/actionFeed';
import { getFallbackBlockingProofHopLabel } from '../../../lib/nameChange/engine';
import { matchesNameChangeDocumentKind } from '../../../lib/nameChange/documentKinds';
import { createDraftNameChangeDocument, normalizeDraftNameChangeDocumentId } from '../../../lib/nameChange/intakeDraft';
import type { NameChangeDocumentInput, NameChangeExtractedFieldInput, NameChangePlan, NameChangeTargetExecutionSnapshot } from '../../../lib/nameChange/types';

export interface ExecutionCardConfig {
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

export interface ReminderPostureCardConfig {
  key: string;
  title: string;
  value: string;
  detail: string;
  tone?: 'warning' | 'primary' | 'danger' | 'neutral';
}

export interface ExecutionCardSectionConfig {
  key: string;
  title: string;
  description: string;
  cards: ExecutionCardConfig[];
}

export interface ExecutionSectionSummary {
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

export interface TargetStatusVaultRow {
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

export const EXECUTION_SECTION_STEP_IDS: Record<string, string[]> = {
  'core-government': ['federal-ssa', 'state-dmv', 'federal-passport'],
  'work-identity': ['institutions-rollout'],
  institutional: ['institutions-rollout'],
  cleanup: ['institutions-rollout'],
};

export const NAME_CHANGE_DOCUMENT_OPTIONS: Array<{ key: NameChangeDocumentInput['document_kind']; label: string }> = [
  { key: 'marriage_certificate', label: 'Certified marriage certificate' },
  { key: 'court_order', label: 'Court order' },
  { key: 'current_drivers_license', label: 'Current driver license / state ID' },
  { key: 'current_passport', label: 'Current passport' },
  { key: 'social_security_card', label: 'Social Security card' },
  { key: 'birth_certificate', label: 'Birth certificate' },
  { key: 'proof_of_address', label: 'Proof of address' },
];

export const NAME_CHANGE_EXTRACTION_FIELD_LABELS: Record<NameChangeExtractedFieldInput['field_key'], string> = {
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

export const NAME_CHANGE_EXTRACTION_FIELD_PLACEHOLDERS: Partial<Record<NameChangeExtractedFieldInput['field_key'], string>> = {
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

export const NAME_CHANGE_SECTION_PREFS_STORAGE_KEY = 'dayoflove:name-change:collapsed-sections';
export const NAME_CHANGE_ADMIN_PREFS_STORAGE_KEY = 'dayoflove:name-change:show-admin';

export function buildNameChangePreferenceStorageKey(storageKey: string, storageScope?: string | null): string {
  const scope = typeof storageScope === 'string' ? storageScope.trim() : '';
  return scope ? `${storageKey}::${scope}` : storageKey;
}

export function readNameChangeAdminPreference(storageScope?: string | null): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const storageKey = buildNameChangePreferenceStorageKey(NAME_CHANGE_ADMIN_PREFS_STORAGE_KEY, storageScope);
    const raw = window.localStorage.getItem(storageKey) ?? (
      storageKey !== NAME_CHANGE_ADMIN_PREFS_STORAGE_KEY
        ? window.localStorage.getItem(NAME_CHANGE_ADMIN_PREFS_STORAGE_KEY)
        : null
    );
    if (raw === 'true' && storageKey !== NAME_CHANGE_ADMIN_PREFS_STORAGE_KEY && !window.localStorage.getItem(storageKey)) {
      window.localStorage.setItem(storageKey, 'true');
    }
    return raw === 'true';
  } catch {
    return false;
  }
}

export function writeNameChangeAdminPreference(showAdmin: boolean, storageScope?: string | null): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(buildNameChangePreferenceStorageKey(NAME_CHANGE_ADMIN_PREFS_STORAGE_KEY, storageScope), String(showAdmin));
  } catch {}
}

export function readNameChangeCollapsedSections(storageScope?: string | null): Record<string, boolean> {
  if (typeof window === 'undefined') return {};

  try {
    const storageKey = buildNameChangePreferenceStorageKey(NAME_CHANGE_SECTION_PREFS_STORAGE_KEY, storageScope);
    const raw = window.localStorage.getItem(storageKey) ?? (
      storageKey !== NAME_CHANGE_SECTION_PREFS_STORAGE_KEY
        ? window.localStorage.getItem(NAME_CHANGE_SECTION_PREFS_STORAGE_KEY)
        : null
    );
    const parsed = raw ? JSON.parse(raw) as unknown : {};
    const normalized = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? Object.fromEntries(Object.entries(parsed).filter(([, value]) => typeof value === 'boolean'))
      : {};
    if (
      storageKey !== NAME_CHANGE_SECTION_PREFS_STORAGE_KEY
      && Object.keys(normalized).length > 0
      && !window.localStorage.getItem(storageKey)
    ) {
      window.localStorage.setItem(storageKey, JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    return {};
  }
}

export function writeNameChangeCollapsedSections(collapsedSections: Record<string, boolean>, storageScope?: string | null): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(buildNameChangePreferenceStorageKey(NAME_CHANGE_SECTION_PREFS_STORAGE_KEY, storageScope), JSON.stringify(collapsedSections));
  } catch {}
}

export function matchesContractDocumentKind(
  actualKind: NameChangeDocumentInput['document_kind'],
  contractKind: NameChangeDocumentInput['document_kind'],
) {
  return matchesNameChangeDocumentKind(actualKind, contractKind);
}

export function findContractDocument(
  documents: NameChangeDocumentInput[],
  contractKind: NameChangeDocumentInput['document_kind'],
) {
  return documents.find((document) => matchesContractDocumentKind(document.document_kind, contractKind));
}

export function findContractExtractedField(
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

export function ensureDocument(
  documents: NameChangeDocumentInput[],
  kind: NameChangeDocumentInput['document_kind'],
  label: string,
): NameChangeDocumentInput[] {
  if (documents.some((document) => matchesNameChangeDocumentKind(document.document_kind, kind))) return documents;
  return [
    ...documents,
    createDraftNameChangeDocument(kind, label),
  ];
}

export function updateDocument(
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

export const TARGET_STATUS_VAULT_STATUS_PRIORITY: Record<TargetStatusVaultRow['vaultStatus'], number> = {
  blocked: 0,
  in_progress: 1,
  ready: 2,
  todo: 3,
  complete: 4,
};

export function getActionFeedCtaLabel(intent: 'open_execution_card' | 'open_document_repair' | 'open_account_update_template') {
  if (intent === 'open_document_repair') return 'Check document details';
  if (intent === 'open_account_update_template') return 'Open update template';
  return 'Open next step';
}

export function getEffectiveBlockingProofHopLabel(template: NonNullable<NameChangePlan['summary']['accountUpdateTemplates']>[number]) {
  return getFallbackBlockingProofHopLabel(template.readiness, template.blockingProofHopLabel);
}

export function getAccountUpdateTemplateStatusChip(template: NonNullable<NameChangePlan['summary']['accountUpdateTemplates']>[number]) {
  return getAccountUpdateTemplateStatusLabel(template);
}

export function formatAccountUpdateTemplateCopy(template: NonNullable<NameChangePlan['summary']['accountUpdateTemplates']>[number]) {
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

export function getAccountUpdateTemplateSubjectText(template: NonNullable<NameChangePlan['summary']['accountUpdateTemplates']>[number]) {
  return sanitizeAccountUpdateTemplateText(template.subject);
}

export function getAccountUpdateTemplateBodyText(template: NonNullable<NameChangePlan['summary']['accountUpdateTemplates']>[number]) {
  return sanitizeAccountUpdateTemplateText(template.body);
}

export function getReminderCtaLabel(intent?: 'open_execution_card') {
  return intent === 'open_execution_card' ? 'Open linked step' : 'Open linked step';
}

export function getExecutionStatusLabel(status: 'todo' | 'in_progress' | 'complete' | null | undefined) {
  if (status === 'complete') return 'Complete';
  if (status === 'in_progress') return 'In progress';
  return 'To do';
}

export function getWorkflowStatusLabel(status: string | null | undefined) {
  if (status === 'complete') return 'Complete';
  if (status === 'in_progress') return 'In progress';
  if (status === 'ready') return 'Ready';
  if (status === 'blocked') return 'Needs attention';
  return 'Draft';
}

export function getIntakeStatusLabel(status: string | null | undefined) {
  if (status === 'reviewed') return 'Reviewed';
  if (status === 'uploaded') return 'Added';
  if (status === 'blocked') return 'Needs attention';
  return 'Not started';
}

export function getRepairSeverityLabel(severity: string | null | undefined) {
  if (severity === 'blocking') return 'Needed';
  if (severity === 'attention') return 'Worth checking';
  return 'Optional';
}

export function getNameChangeStatusChipLabel(status: string | null | undefined) {
  if (status === 'ready' || status === 'satisfied') return 'Ready';
  if (status === 'attention') return 'Worth checking';
  if (status === 'missing') return 'Missing';
  if (status === 'blocked' || status === 'blocking') return 'Needed';
  if (status === 'critical') return 'Time-sensitive';
  if (status === 'elevated') return 'Worth checking';
  if (status === 'normal') return 'On track';
  return status ? status.replace(/_/g, ' ') : 'On track';
}

export function getDocumentDetailLabel(kind: string | null | undefined) {
  if (!kind) return 'Saved details';
  return kind
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getDocumentStorageModeLabel(mode: string | null | undefined) {
  if (mode === 'metadata_only') return 'Details only';
  return 'No file stored';
}

export function parseDocumentSnapshotDraft(value: string): { ok: true; snapshot: Record<string, unknown> | null } | { ok: false } {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, snapshot: null };

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? { ok: true, snapshot: parsed as Record<string, unknown> }
      : { ok: false };
  } catch {
    return { ok: false };
  }
}

export function getActivitySourceLabel(source: string | null | undefined) {
  if (source === 'reminder') return 'Reminder';
  if (source === 'milestone') return 'Milestone';
  if (source === 'execution') return 'Step';
  return 'Update';
}

export function getActionFeedSectionLabel(sectionKey: 'core-government' | 'work-identity' | 'institutional' | 'cleanup' | 'documents') {
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

export function getExecutionSummaryTone(status: 'ready' | 'blocked' | 'upcoming' | 'in_progress' | 'complete') {
  if (status === 'complete') return 'bg-success/15 text-success';
  if (status === 'in_progress') return 'bg-primary/15 text-primary';
  if (status === 'ready') return 'bg-success/10 text-success';
  if (status === 'upcoming') return 'bg-primary/10 text-primary';
  return 'bg-warning/10 text-warning';
}

export function getActionFeedUrgencyClass(urgencyTier: 'critical' | 'elevated' | 'normal') {
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

export function getActionFeedUrgencyReasonLabel(reason: 'blocking_dependency' | 'packet_trust' | 'document_gap' | 'review_queue') {
  switch (reason) {
    case 'blocking_dependency':
      return 'needs another step first';
    case 'packet_trust':
      return 'makes the packet easier to trust';
    case 'document_gap':
      return 'missing document detail';
    case 'review_queue':
    default:
      return 'worth a quick look';
  }
}
