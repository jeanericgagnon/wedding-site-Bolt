export type NameChangeLaunchState = 'california';
export type NameChangeLegalBasis = 'marriage' | 'court_order';
export type NameChangeWorkflowStatus = 'draft' | 'ready' | 'in_progress' | 'complete';
export type NameChangeDocumentKind =
  | 'marriage_certificate'
  | 'court_order'
  | 'current_drivers_license'
  | 'current_passport'
  | 'social_security_card'
  | 'birth_certificate'
  | 'proof_of_address'
  | 'other';

export type NameChangeExtractionFieldKey =
  | 'first_name'
  | 'middle_name'
  | 'last_name'
  | 'spouse_last_name'
  | 'issuance_date'
  | 'certificate_number'
  | 'county'
  | 'court_order_date';

export interface NameChangeCaseRecord {
  id: string;
  wedding_site_id: string;
  workflow_status: NameChangeWorkflowStatus;
  launch_state: NameChangeLaunchState;
  legal_basis: NameChangeLegalBasis;
  current_first_name: string;
  current_middle_name: string | null;
  current_last_name: string;
  target_first_name: string;
  target_middle_name: string | null;
  target_last_name: string;
  email: string | null;
  phone_last4: string | null;
  county_residence: string | null;
  marriage_state: string | null;
  marriage_date: string | null;
  urgency_level: 'standard' | 'expedited';
  has_us_passport: boolean;
  passport_needs_update: boolean;
  has_real_id_license: boolean;
  is_us_citizen: boolean;
  employment_status: 'employed' | 'self_employed' | 'not_employed' | 'prefer_not_to_say';
  change_reasons: string[];
  structured_intake: Record<string, unknown>;
  latest_plan_summary: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface NameChangeCaseInput {
  workflow_status: NameChangeWorkflowStatus;
  launch_state: NameChangeLaunchState;
  legal_basis: NameChangeLegalBasis;
  current_first_name: string;
  current_middle_name?: string | null;
  current_last_name: string;
  target_first_name: string;
  target_middle_name?: string | null;
  target_last_name: string;
  email?: string | null;
  phone_last4?: string | null;
  county_residence?: string | null;
  marriage_state?: string | null;
  marriage_date?: string | null;
  urgency_level: 'standard' | 'expedited';
  has_us_passport: boolean;
  passport_needs_update: boolean;
  has_real_id_license: boolean;
  is_us_citizen: boolean;
  employment_status: 'employed' | 'self_employed' | 'not_employed' | 'prefer_not_to_say';
  change_reasons: string[];
  structured_intake: Record<string, unknown>;
  latest_plan_summary?: Record<string, unknown> | null;
}

export interface NameChangeDocumentRecord {
  id: string;
  name_change_case_id: string;
  document_kind: NameChangeDocumentKind;
  display_name: string;
  storage_mode: 'none' | 'metadata_only';
  intake_status: 'not_started' | 'uploaded' | 'reviewed';
  file_name_masked: string | null;
  issuing_authority: string | null;
  issued_on: string | null;
  expires_on: string | null;
  extraction_confidence: number | null;
  extracted_snapshot: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface NameChangeDocumentInput {
  document_kind: NameChangeDocumentKind;
  display_name: string;
  storage_mode: 'none' | 'metadata_only';
  intake_status: 'not_started' | 'uploaded' | 'reviewed';
  file_name_masked?: string | null;
  issuing_authority?: string | null;
  issued_on?: string | null;
  expires_on?: string | null;
  extraction_confidence?: number | null;
  extracted_snapshot?: Record<string, unknown> | null;
}

export interface NameChangeExtractedFieldRecord {
  id: string;
  name_change_case_id: string;
  document_id: string | null;
  field_key: NameChangeExtractionFieldKey;
  field_label: string;
  field_value_masked: string;
  source_type: 'manual' | 'document_extract';
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface NameChangeExtractedFieldInput {
  document_id?: string | null;
  field_key: NameChangeExtractionFieldKey;
  field_label: string;
  field_value_masked: string;
  source_type: 'manual' | 'document_extract';
  is_verified: boolean;
}

export interface NameChangePlanSnapshotRecord {
  id: string;
  name_change_case_id: string;
  engine_version: string;
  plan_payload: NameChangePlan;
  created_at: string;
}

export interface NameChangePlanFormRef {
  code: string;
  title: string;
  authority: string;
  jurisdiction: 'federal' | 'state';
  url: string;
}

export interface NameChangePlanStep {
  id: string;
  phase: 'eligibility' | 'federal' | 'state' | 'identity' | 'institutional';
  title: string;
  description: string;
  owner: 'user';
  timing: string;
  status: 'ready' | 'blocked' | 'later';
  executionStatus?: 'todo' | 'in_progress' | 'complete';
  executionNote?: string | null;
  executionUpdatedAt?: string | null;
  completedAt?: string | null;
  blockers: string[];
  forms: NameChangePlanFormRef[];
  institutions: string[];
  evidenceNeeded: string[];
}

export interface NameChangePlanSummary {
  legalPathLabel: string;
  recommendedOrder: string[];
  blockers: string[];
  cautionNotes: string[];
  missingInputs: string[];
  readinessPercent: number;
  executionCounts?: {
    todo: number;
    in_progress: number;
    complete: number;
  };
  activitySourceCounts?: {
    step: number;
    reminder: number;
  };
  latestMovementPosture?: 'step-led' | 'reminder-led' | 'mixed';
  dominantMovementLane?: 'step-progress' | 'completion-led' | 'reminder-churn' | 'no-step-movement' | 'mixed';
  reminderChurnRisk?: 'low' | 'medium' | 'high';
  hasRecentCompletion?: boolean;
  hasRecentStart?: boolean;
  hasRecentUntouchedRisk?: boolean;
  hasZeroRecentStepMovement?: boolean;
  recentExecutionActivity?: Array<{
    stepId: string | null;
    source: 'step' | 'reminder';
    title: string;
    executionStatus: 'todo' | 'in_progress' | 'complete';
    note: string | null;
    timestamp: string;
  }>;
  nextBestAction: string;
}

export interface NameChangePlan {
  engineVersion: string;
  jurisdiction: {
    country: 'US';
    launchState: NameChangeLaunchState;
    countyResidence: string | null;
  };
  profile: {
    legalBasis: NameChangeLegalBasis;
    hasPassport: boolean;
    passportNeedsUpdate: boolean;
    hasRealIdLicense: boolean;
    employmentStatus: NameChangeCaseInput['employment_status'];
    urgencyLevel: NameChangeCaseInput['urgency_level'];
  };
  summary: NameChangePlanSummary;
  steps: NameChangePlanStep[];
}

export interface NameChangeReminderSuggestion {
  id: string;
  label: string;
  suggestedOffsetDays: number;
  reason: string;
  dependsOnStepId: string;
  urgency: 'high' | 'medium' | 'low';
}

export interface NameChangeReminderRecord {
  id: string;
  name_change_case_id: string;
  reminder_key: string;
  label: string;
  reason: string;
  depends_on_step_id: string;
  suggested_offset_days: number;
  urgency: 'high' | 'medium' | 'low';
  status: 'pending' | 'scheduled' | 'sent' | 'dismissed';
  created_at: string;
  updated_at: string;
}

export interface NameChangeReminderInput {
  reminder_key: string;
  label: string;
  reason: string;
  depends_on_step_id: string;
  suggested_offset_days: number;
  urgency: 'high' | 'medium' | 'low';
  status: 'pending' | 'scheduled' | 'sent' | 'dismissed';
}

export interface HydratedNameChangeWorkspace {
  draft: NameChangeCaseInput;
  documents: NameChangeDocumentInput[];
  extractedFields: NameChangeExtractedFieldInput[];
  plan: NameChangePlan;
  reminders: NameChangeReminderInput[];
}

export interface NameChangeReminderSummary {
  total: number;
  pending: number;
  scheduled: number;
  sent: number;
  dismissed: number;
  highUrgencyOpen: number;
  staleAttentionOpen: number;
}

export interface NameChangeReminderAttentionItem {
  reminderKey: string;
  label: string;
  dependsOnStepId: string;
  dependentStepTitle: string;
  dependentStepExecutionStatus: 'todo' | 'in_progress' | 'complete';
  reminderStatus: 'pending' | 'scheduled' | 'sent' | 'dismissed';
  urgency: 'high' | 'medium' | 'low';
  priorityTier?: 'critical' | 'elevated' | 'normal';
  actionability?: 'actionable_now' | 'blocked_by_untouched_step';
  suggestedOffsetDays: number;
  lastTouchedAt: string | null;
  isStale: boolean;
}

export interface NameChangeFormRegistryEntry {
  code: string;
  title: string;
  authority: string;
  jurisdiction: 'federal' | 'state';
  url: string;
  appliesWhen: Array<'marriage' | 'court_order' | 'passport' | 'california_resident' | 'citizen'>;
  description: string;
}

export interface NameChangeInstitutionEntry {
  key: string;
  label: string;
  category: 'government' | 'financial' | 'employment' | 'insurance' | 'personal';
  launchPriority: number;
  triggers: Array<'all' | 'employment' | 'passport' | 'california_resident'>;
  notes: string;
  suggestedTiming: string;
  evidenceNeeded: string[];
  reminderDaysAfterPrimaryId: number;
}

export interface NameChangeEligibilityDecision {
  legalBasis: NameChangeLegalBasis;
  decision: 'approved_path' | 'court_order_required';
  reasons: string[];
}

export interface NameChangeEngineInput {
  profile: NameChangeCaseInput;
  documents: NameChangeDocumentInput[];
  extractedFields: NameChangeExtractedFieldInput[];
}
