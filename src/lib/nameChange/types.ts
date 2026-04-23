export type NameChangeLaunchState = 'california';
export type NameChangeLegalBasis = 'marriage' | 'court_order';
export type NameChangeWorkflowStatus = 'draft' | 'ready' | 'in_progress' | 'complete';
export type NameChangeDocumentKind =
  | 'marriage_certificate'
  | 'court_order'
  | 'court_order_name_change'
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
  | 'case_number'
  | 'county'
  | 'court_order_date';

export interface NameChangeStructuredIntake {
  spouseLastName: string | null;
  travelBookedSoon: boolean;
  wantsDocumentIntakeHelp: boolean;
}

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
  structured_intake: NameChangeStructuredIntake;
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
  structured_intake: NameChangeStructuredIntake;
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
  id?: string;
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
  dominantMovementLane?: 'step-progress' | 'start-led' | 'completion-led' | 'reminder-churn' | 'no-step-movement' | 'mixed';
  mixedMovementReason?: 'starts-and-completions' | 'step-reminder-balance' | null;
  mixedMovementHasUntouchedRisk?: boolean;
  mixedMovementReminderHeavy?: boolean;
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

export interface NameChangeCanonicalPersonName {
  first: string;
  middle: string | null;
  last: string;
  full: string;
}

export interface NameChangeCanonicalCase {
  legalBasis: NameChangeLegalBasis;
  workflowStatus: NameChangeWorkflowStatus;
  launchState: NameChangeLaunchState;
  countyResidence: string | null;
  currentName: NameChangeCanonicalPersonName;
  targetName: NameChangeCanonicalPersonName;
  identity: {
    isUsCitizen: boolean;
    hasUsPassport: boolean;
    passportNeedsUpdate: boolean;
    hasRealIdLicense: boolean;
  };
  lifeContext: {
    urgencyLevel: NameChangeCaseInput['urgency_level'];
    employmentStatus: NameChangeCaseInput['employment_status'];
    travelBookedSoon: boolean;
  };
  legalContext: {
    marriageDate: string | null;
    marriageState: string | null;
    spouseLastName: string | null;
  };
  documents: Record<NameChangeDocumentKind, {
    intakeStatus: NameChangeDocumentInput['intake_status'];
    storageMode: NameChangeDocumentInput['storage_mode'];
    extractionFieldCount: number;
    extractedFieldKeys: NameChangeExtractionFieldKey[];
  }>;
}

export interface NameChangeRequirementDefinition {
  key: string;
  label: string;
  stage: 'identity' | 'proof' | 'government' | 'institutional';
  description: string;
}

export interface NameChangeRequirementResult {
  key: string;
  label: string;
  stage: 'identity' | 'proof' | 'government' | 'institutional';
  status: 'satisfied' | 'missing' | 'attention';
  reason: string;
}

export interface NameChangeRequirementSnapshot {
  canonicalCase: NameChangeCanonicalCase;
  results: NameChangeRequirementResult[];
  summary: {
    satisfied: number;
    missing: number;
    attention: number;
  };
}

export interface NameChangeCanonicalFieldConflict {
  key: string;
  label: string;
  documentKind: NameChangeDocumentKind;
  fieldKey: NameChangeExtractionFieldKey;
  canonicalValue: string | null;
  extractedValue: string;
  reason: string;
}

export interface NameChangeDocumentContractDefinition {
  kind: NameChangeDocumentKind;
  label: string;
  requiredFor: Array<NameChangeLegalBasis | 'all'>;
  preferredForAutofill: boolean;
  extractionFields: NameChangeExtractionFieldKey[];
  acceptedSignals: string[];
}

export interface NameChangeDocumentContractStatus {
  kind: NameChangeDocumentKind;
  label: string;
  required: boolean;
  preferredForAutofill: boolean;
  intakeStatus: NameChangeDocumentInput['intake_status'];
  storageMode: NameChangeDocumentInput['storage_mode'];
  extractionFieldCount: number;
  metadataReady: number;
  metadataMissing: string[];
  expectedExtractionFields: NameChangeExtractionFieldKey[];
  capturedExtractionFields: NameChangeExtractionFieldKey[];
  missingExtractionFields: NameChangeExtractionFieldKey[];
  latentMissingExtractionFields: NameChangeExtractionFieldKey[];
  canonicalConflicts: NameChangeCanonicalFieldConflict[];
}

export interface NameChangeDocumentIntakeSnapshot {
  canonicalCase: NameChangeCanonicalCase;
  documents: NameChangeDocumentContractStatus[];
  summary: {
    requiredReady: number;
    requiredMissing: number;
    metadataReady: number;
    metadataGaps: number;
    autofillReady: number;
    extractionGaps: number;
  };
}

export interface NameChangeAutofillFieldValue {
  source: 'canonical_case' | 'extracted_field';
  value: string | null;
  confidence: 'high' | 'medium' | 'low';
  sourceDocumentKind?: NameChangeDocumentKind;
  sourceFieldKey?: NameChangeExtractionFieldKey;
}

export interface NameChangeAutofillFieldMapping {
  targetField: string;
  label: string;
  value: NameChangeAutofillFieldValue;
}

export interface NameChangeAutofillPrepSnapshot {
  canonicalCase: NameChangeCanonicalCase;
  fields: NameChangeAutofillFieldMapping[];
  summary: {
    ready: number;
    missing: number;
    extractedBacked: number;
  };
}

export interface NameChangeFormFieldPayload {
  fieldKey: string;
  label: string;
  required: boolean;
  value: string | null;
  source: 'canonical_case' | 'extracted_field' | 'derived';
  confidence: 'high' | 'medium' | 'low';
  sourceDocumentKind?: NameChangeDocumentKind;
  sourceFieldKey?: NameChangeExtractionFieldKey;
}

export interface NameChangeFormPayloadSnapshot {
  formCode: string;
  fields: NameChangeFormFieldPayload[];
  summary: {
    ready: number;
    missing: number;
    trustedReady: number;
    lowConfidence: number;
    extractedBacked: number;
  };
}

export interface NameChangeExecutionDependency {
  key: string;
  label: string;
  required: boolean;
  status: 'satisfied' | 'missing' | 'attention';
  reason: string;
  nextActionCategory?: 'document' | 'dependency' | 'review';
  blocksReady?: boolean;
}

export interface NameChangeExecutionSequenceSnapshot {
  target: string;
  lane: 'federal' | 'state';
  ready: boolean;
  blockers: string[];
  dependencies: NameChangeExecutionDependency[];
}

export interface NameChangeExecutionPrerequisiteRule {
  key: string;
  label: string;
  required: boolean;
  requiredStepId: string;
  requiredStatuses: Array<'todo' | 'in_progress' | 'complete'>;
  missingReason: string;
  attentionReason?: string;
  satisfiedReason: string;
}

export type NameChangeExecutionTargetKey = 'courtOrder' | 'ssa' | 'dmv' | 'passport' | 'employer' | 'banks' | 'insurance' | 'medical' | 'utilities' | 'courtesy' | 'voter' | 'tsa' | 'licenses';
export type NameChangeFormBuilderKey = 'courtOrder' | 'ss5' | 'dmv' | 'passport' | 'employer' | 'banks' | 'insurance' | 'medical' | 'utilities' | 'courtesy' | 'voter' | 'tsa' | 'licenses';
export type NameChangeExecutionSequenceProfileKey = 'courtOrder' | 'ssa' | 'dmv' | 'passport' | 'employer' | 'banks' | 'insurance' | 'medical' | 'utilities' | 'courtesy' | 'voter' | 'tsa' | 'licenses';

export interface NameChangeExecutionTargetDefinition {
  key: NameChangeExecutionTargetKey;
  label: string;
  lane: 'federal' | 'state';
  recommendedFormCode: string;
  formBuilderKey: NameChangeFormBuilderKey;
  sequenceProfile: NameChangeExecutionSequenceProfileKey;
  prerequisiteRules: NameChangeExecutionPrerequisiteRule[];
  autofillTargetFields: string[];
  checklistSpecs: Array<{
    key: string;
    label: string;
    kind: 'requirement' | 'field_presence' | 'document_support';
    nextActionCategory?: 'packet' | 'checklist' | 'document' | 'review';
    requirementKey?: string;
    targetField?: string;
    targetFields?: string[];
    documentKinds?: NameChangeDocumentKind[];
    missingReason: string;
    attentionReason?: string;
    satisfiedReason: string;
  }>;
}

export interface NameChangeExecutionGateSnapshot {
  ready: boolean;
  blockers: string[];
  attentionItems: string[];
}

export interface NameChangeTargetExecutionSnapshot {
  targetKey: NameChangeExecutionTargetKey;
  targetLabel: string;
  ready: boolean;
  blockers: string[];
  nextAction: NameChangeGuidedAction;
  readinessSummary: {
    status: 'ready' | 'blocked' | 'attention';
    blockingFieldRisks: number;
    attentionFieldRisks: number;
    lowConfidenceFields: number;
    missingFields: number;
    documentRepairDebt: number;
    summaryLabel: string;
  };
  recommendedFormCode: string;
  autofillFields: NameChangeAutofillFieldMapping[];
  formPayload: NameChangeFormPayloadSnapshot;
  fieldRisks: Array<{
    fieldKey: string;
    label: string;
    severity: 'blocking' | 'attention';
    reason: string;
    source: NameChangeFormFieldPayload['source'];
    confidence: NameChangeFormFieldPayload['confidence'];
    sourceDocumentKind?: NameChangeDocumentKind;
    sourceFieldKey?: NameChangeExtractionFieldKey;
  }>;
  sequence: NameChangeExecutionSequenceSnapshot;
  checklist: Array<{
    key: string;
    label: string;
    kind: 'requirement' | 'field_presence' | 'document_support';
    nextActionCategory?: 'packet' | 'checklist' | 'document' | 'review';
    status: 'ready' | 'missing' | 'attention';
    reason: string;
  }>;
}

export interface NameChangeGuidedAction {
  category: 'packet' | 'dependency' | 'checklist' | 'document' | 'review';
  label: string;
  detail: string;
}

export interface NameChangeMarriageCertificateExtraction {
  firstName: string | null;
  lastName: string | null;
  spouseLastName: string | null;
  county: string | null;
  issuanceDate: string | null;
  certificateNumber: string | null;
}

export interface NameChangeCourtOrderExtraction {
  firstName: string | null;
  lastName: string | null;
  caseNumber: string | null;
  courtOrderDate: string | null;
}

export interface NameChangePassportExtraction {
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  issuanceDate: string | null;
}

export interface NameChangeDriversLicenseExtraction {
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  issuanceDate: string | null;
}

export interface NameChangeExtractionContractSnapshot {
  marriageCertificate: NameChangeMarriageCertificateExtraction;
  courtOrder: NameChangeCourtOrderExtraction;
  currentPassport: NameChangePassportExtraction;
  currentDriversLicense: NameChangeDriversLicenseExtraction;
  conflicts: NameChangeCanonicalFieldConflict[];
  summary: {
    conflictCount: number;
  };
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

export interface NameChangeReminderAttentionSummary {
  total: number;
  stale: number;
  staleTodo: number;
  staleInProgress: number;
  highUrgency: number;
  critical: number;
  elevated: number;
  normal: number;
  actionableNow: number;
  blockedByUntouchedStep: number;
  blockedAndStale: number;
  actionablePriority: number;
  actionableNormal: number;
  actionableAndStale: number;
  actionableStalePriority: number;
  actionableStaleNormal: number;
  blockedStalePriority: number;
  blockedStaleNormal: number;
  dominantRiskLane: 'blocked-stale' | 'stale-actionable' | 'routine-actionable' | 'mixed';
  staleActionablePosture: 'priority-heavy' | 'normal-heavy' | 'mixed';
  blockedStalePosture: 'priority-heavy' | 'normal-heavy' | 'mixed';
  attentionPosture: 'blocked-heavy' | 'actionable-heavy' | 'mixed';
  stalePriority: 'untouched' | 'moving' | 'mixed';
  agingWithoutExecution: boolean;
  agingWithoutExecutionLane: 'blocked-stale' | 'stale-actionable' | 'mixed' | 'none';
  agingWithoutExecutionPosture: 'blocked-heavy' | 'actionable-heavy' | 'mixed' | 'none';
  actionableFreshPosture: 'stale-heavy' | 'fresh-heavy' | 'mixed' | 'none';
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
