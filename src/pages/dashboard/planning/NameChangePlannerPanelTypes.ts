import type { NameChangeActionFeedItem } from '../../../lib/nameChange/actionFeed';
import type { NameChangeCaseInput } from '../../../lib/nameChange/types';

export interface StatePlaybookViewModel {
  matchedStateLabel: string;
  supportLabel: string;
  summary: string;
  officeLabel: string;
  officeDetail: string;
  countyDetail: string;
  proofPacketDetail: string;
  downstreamDetail: string;
  partnerDetail: string;
  checklist: string[];
}

export interface InstitutionCoverageCategory {
  id: string;
  label: string;
  summary: string;
  status: string;
  targetCount: number;
  institutionKeys: string[];
}

export interface InstitutionPacketCard {
  key: string;
  label: string;
  summary: string;
  readiness: string;
  institutionLabels: string[];
  proofDocuments: string[];
  completionCheck: string;
  text: string;
  fileName: string;
}

export interface DualPartnerTrackCard {
  id: string;
  label: string;
  dependsOnStepIds: string[];
  status: string;
  requiredProof: string[];
}

export interface PlannerExportCard {
  key: string;
  label: string;
  summary: string;
  text: string;
  fileName: string;
}

export interface DocumentVaultRowCard {
  key: string;
  label: string;
  linkedFieldCount: number;
  expectedFieldCount: number;
  storageModeLabel: string;
  status: string;
}

export interface PreparationOverviewRowCard {
  key: string;
  label: string;
  statusLabel: string;
  note?: string | null;
  additionalNotes: string[];
  executionNote?: string | null;
  milestoneNote?: string | null;
  proofNote?: string | null;
  reminderNote?: string | null;
  nextActionLabel?: string | null;
  nextActionDetail?: string | null;
  reminderLabel?: string | null;
  updatedLabel?: string | null;
  executionUpdatedLabel?: string | null;
  milestoneUpdatedLabel?: string | null;
  reminderUpdatedLabel?: string | null;
  milestoneCompleteCount: number;
  milestoneInProgressCount: number;
  reminderOpenCount: number;
  reminderHighUrgencyCount: number;
  proofMissingCount: number;
  proofAttentionCount: number;
}

export interface StatusTrackingRowCard {
  key: string;
  label: string;
  summary: string;
  additionalSummary?: string | null;
  blockedProofLabel?: string | null;
  currentStatusLabel?: string | null;
  nextCheckLabel?: string | null;
  lastTouchedLabel?: string | null;
  executionUpdatedLabel?: string | null;
  milestoneUpdatedLabel?: string | null;
  reminderUpdatedLabel?: string | null;
}

export interface RecentActivityCard {
  stepId: string | null;
  timestamp: string;
  title: string;
  note?: string | null;
  source: string;
  executionStatus: 'in_progress' | 'todo' | 'complete' | null | undefined;
}

export interface RegistryFormCard {
  code: string;
  title: string;
  authority: string;
  jurisdiction: string;
  appliesWhen: string[];
}

export interface InstitutionLibraryCard {
  key: string;
  label: string;
  category: string;
  notes: string;
}

export interface ExecutionTrackCard {
  id: string;
  sequenceLabel: string;
  title: string;
  featureTag: string;
  summary: string;
  dependsOnStepIds: string[];
  status: string;
}

export interface MilestoneChecklistCard {
  id: string;
  label: string;
  dependsOnStepIds: string[];
  status: string;
}

export interface EdgeCaseGuidanceCard {
  id: string;
  label: string;
  detail: string;
  severity: string;
}

export interface ResumeCardViewModel {
  statusLabel: string;
  headline: string;
  helperCopy: string;
  optionalNextStep: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  tertiaryHref: string;
  tertiaryLabel: string;
  plannerHref: string;
  plannerLabel: string;
}

export interface LifecycleInsightsCard {
  milestoneSummaryHref: string;
  milestoneSummaryLabel: string;
  reminderSummaryHref: string;
  reminderSummaryLabel: string;
  coreChainLabel: string;
  followOnLabel: string;
  downstreamHref: string;
  downstreamLabel: string;
}

export interface CaseSetupFieldValues {
  currentFirstName: string;
  currentMiddleName: string;
  currentLastName: string;
  targetFirstName: string;
  targetMiddleName: string;
  targetLastName: string;
  spouseLastName: string;
  marriageDate: string;
  marriageState: string;
  countyResidence: string;
  legalBasis: NameChangeCaseInput['legal_basis'];
  urgencyLevel: NameChangeCaseInput['urgency_level'];
  employmentStatus: NameChangeCaseInput['employment_status'];
  hasUsPassport: boolean;
  passportNeedsUpdate: boolean;
  hasRealIdLicense: boolean;
  bothPartnersChangeName: boolean;
  travelBookedSoon: boolean;
  wantsDocumentIntakeHelp: boolean;
}

export interface PlannerStepCountSummary {
  ready: number;
  blocked: number;
  later: number;
}

export interface PlannerExecutionCountSummary {
  todo?: number;
  in_progress?: number;
  complete?: number;
}

export interface ReminderAttentionItemCard {
  reminderKey: string;
  label: string;
  dependentStepTitle: string;
  priorityTier?: 'critical' | 'elevated' | 'normal' | null;
  actionability?: 'blocked_by_untouched_step' | 'actionable_now' | null;
  isStale: boolean;
  urgency: 'high' | 'medium' | 'low';
  dependentStepExecutionStatus: string;
  reminderStatus: string;
  suggestedOffsetDays: number;
  lastTouchedAt?: string | null;
  focusTargetId?: string;
  plannerIntent?: 'open_execution_card';
}

export interface ReminderAttentionSummaryCard {
  highUrgency: number;
  actionablePriority: number;
  blockedAndStale: number;
  stale: number;
  actionableNormal: number;
  actionableAndStale: number;
  actionableFreshPosture: string;
  actionableStalePriority: number;
  actionableStaleNormal: number;
  staleActionablePosture: string;
  blockedStalePriority: number;
  blockedStaleNormal: number;
  blockedStalePosture: string;
  stalePriority: string;
}

export interface ReminderSummaryCard {
  pending: number;
  highUrgencyOpen: number;
}

export interface ActionFeedStatusLabelFns {
  getStatusChipLabel: (value: string) => string;
  getUrgencyClass: (value: NameChangeActionFeedItem['urgencyTier']) => string;
  getSectionLabel: (value: NameChangeActionFeedItem['sectionKey']) => string;
  getUrgencyReasonLabel: (value: NameChangeActionFeedItem['urgencyReason']) => string;
  getCtaLabel: (value: NameChangeActionFeedItem['plannerIntent']) => string;
}

export interface AccountUpdateTemplateCard {
  id: string;
  audience: string;
  readiness: string;
  copyLabel: string;
  subjectLine?: string | null;
  introLine?: string | null;
  body?: string | null;
  contextLines: string[];
}
