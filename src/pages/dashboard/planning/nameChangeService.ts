import { supabase } from '../../../lib/supabase';
import { buildNameChangePlan } from '../../../lib/nameChange/engine';
import { canonicalizeNameChangeDocumentKind } from '../../../lib/nameChange/documentKinds';
import { normalizeDraftFieldKey, normalizeDraftFieldValue } from '../../../lib/nameChange/intakeDraft';
import { NAME_CHANGE_ENGINE_VERSION } from '../../../lib/nameChange/registry';
import { buildNameChangeReminderSuggestions, getReminderPlannerRoute, mapReminderSuggestionsToInputs } from '../../../lib/nameChange/reminders';
import type {
  HydratedNameChangeWorkspace,
  NameChangeCaseInput,
  NameChangeCaseRecord,
  NameChangeDocumentInput,
  NameChangeDocumentRecord,
  NameChangeExtractedFieldInput,
  NameChangeExtractedFieldRecord,
  NameChangePlan,
  NameChangePlanSnapshotRecord,
  NameChangeReminderInput,
  NameChangeReminderRecord,
  NameChangeStructuredIntake,
} from '../../../lib/nameChange/types';
import { sortNameChangeExecutionActivity } from './nameChangeExecutionTime';

export const defaultNameChangeStructuredIntake: NameChangeStructuredIntake = {
  spouseLastName: '',
  travelBookedSoon: false,
  wantsDocumentIntakeHelp: true,
};

export const defaultNameChangeCaseInput: NameChangeCaseInput = {
  workflow_status: 'draft',
  launch_state: 'california',
  legal_basis: 'marriage',
  current_first_name: '',
  current_middle_name: '',
  current_last_name: '',
  target_first_name: '',
  target_middle_name: '',
  target_last_name: '',
  email: '',
  phone_last4: '',
  county_residence: '',
  marriage_state: 'California',
  marriage_date: '',
  urgency_level: 'standard',
  has_us_passport: true,
  passport_needs_update: true,
  has_real_id_license: true,
  is_us_citizen: true,
  employment_status: 'employed',
  change_reasons: ['marriage'],
  structured_intake: defaultNameChangeStructuredIntake,
};

const NAME_CHANGE_CASE_SELECT = [
  'id',
  'wedding_site_id',
  'workflow_status',
  'launch_state',
  'legal_basis',
  'current_first_name',
  'current_middle_name',
  'current_last_name',
  'target_first_name',
  'target_middle_name',
  'target_last_name',
  'email',
  'phone_last4',
  'county_residence',
  'marriage_state',
  'marriage_date',
  'urgency_level',
  'has_us_passport',
  'passport_needs_update',
  'has_real_id_license',
  'is_us_citizen',
  'employment_status',
  'change_reasons',
  'structured_intake',
  'latest_plan_summary',
  'created_at',
  'updated_at',
].join(', ');

const NAME_CHANGE_DOCUMENT_SELECT = [
  'id',
  'name_change_case_id',
  'document_kind',
  'display_name',
  'storage_mode',
  'intake_status',
  'file_name_masked',
  'issuing_authority',
  'issued_on',
  'expires_on',
  'extraction_confidence',
  'extracted_snapshot',
  'created_at',
  'updated_at',
].join(', ');

const NAME_CHANGE_EXTRACTED_FIELD_SELECT = [
  'id',
  'name_change_case_id',
  'document_id',
  'field_key',
  'field_label',
  'field_value_masked',
  'source_type',
  'is_verified',
  'created_at',
  'updated_at',
].join(', ');

const NAME_CHANGE_PLAN_SNAPSHOT_SELECT = [
  'id',
  'name_change_case_id',
  'engine_version',
  'plan_payload',
  'created_at',
].join(', ');

const NAME_CHANGE_REMINDER_SELECT = [
  'id',
  'name_change_case_id',
  'reminder_key',
  'label',
  'reason',
  'depends_on_step_id',
  'suggested_offset_days',
  'urgency',
  'status',
  'created_at',
  'updated_at',
].join(', ');

export const MAX_NAME_CHANGE_DOCUMENT_ROWS = 100;
export const MAX_NAME_CHANGE_EXTRACTED_FIELD_ROWS = 500;
export const MAX_NAME_CHANGE_REMINDER_ROWS = 100;
export const MAX_NAME_CHANGE_SNAPSHOT_ROWS = 1;

function normalizeText(value: string | null | undefined) {
  return (value ?? '').trim();
}

function normalizeNullableText(value: string | null | undefined) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizePhoneLast4(value: string | null | undefined) {
  const digits = (value ?? '').replace(/\D/g, '');
  return digits ? digits.slice(-4) : null;
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => normalizeText(value)).filter(Boolean))];
}

function toPersistedNameChangeReminderRow(reminder: NameChangeReminderInput, caseId: string) {
  return {
    name_change_case_id: caseId,
    reminder_key: reminder.reminder_key,
    label: reminder.label,
    reason: reminder.reason,
    depends_on_step_id: reminder.depends_on_step_id ?? '',
    suggested_offset_days: reminder.suggested_offset_days ?? 0,
    urgency: reminder.urgency === 'normal' ? 'medium' : reminder.urgency,
    status: reminder.status,
  };
}

export function normalizeNameChangeStructuredIntake(
  intake: Partial<NameChangeStructuredIntake> | Record<string, unknown> | null | undefined,
): NameChangeStructuredIntake {
  return {
    spouseLastName: normalizeText(String(intake?.spouseLastName ?? '')),
    travelBookedSoon: Boolean(intake?.travelBookedSoon),
    wantsDocumentIntakeHelp: intake?.wantsDocumentIntakeHelp !== false,
  };
}

export function normalizeNameChangeCaseInput(input: NameChangeCaseInput): NameChangeCaseInput {
  const structuredIntake = normalizeNameChangeStructuredIntake(input.structured_intake);

  return {
    ...input,
    current_first_name: normalizeText(input.current_first_name),
    current_middle_name: normalizeNullableText(input.current_middle_name),
    current_last_name: normalizeText(input.current_last_name),
    target_first_name: normalizeText(input.target_first_name),
    target_middle_name: normalizeNullableText(input.target_middle_name),
    target_last_name: normalizeText(input.target_last_name),
    email: normalizeNullableText(input.email)?.toLowerCase() ?? null,
    phone_last4: normalizePhoneLast4(input.phone_last4),
    county_residence: normalizeNullableText(input.county_residence),
    marriage_state: normalizeNullableText(input.marriage_state),
    marriage_date: normalizeNullableText(input.marriage_date),
    change_reasons: uniqueStrings(input.change_reasons),
    structured_intake: structuredIntake,
  };
}

export function normalizeNameChangeDocuments(documents: NameChangeDocumentInput[]): NameChangeDocumentInput[] {
  const deduped = new Map<NameChangeDocumentInput['document_kind'], NameChangeDocumentInput>();

  documents.forEach((document) => {
    const canonicalKind = canonicalizeNameChangeDocumentKind(document.document_kind);
    deduped.set(canonicalKind, {
      ...document,
      id: document.id,
      document_kind: canonicalKind,
      display_name: normalizeText(document.display_name) || canonicalKind.replace(/_/g, ' '),
      file_name_masked: normalizeNullableText(document.file_name_masked),
      issuing_authority: normalizeNullableText(document.issuing_authority),
      issued_on: normalizeNullableText(document.issued_on),
      expires_on: normalizeNullableText(document.expires_on),
      extracted_snapshot: document.extracted_snapshot ?? null,
    });
  });

  return [...deduped.values()];
}

export function normalizeNameChangeExtractedFields(fields: NameChangeExtractedFieldInput[]): NameChangeExtractedFieldInput[] {
  const deduped = new Map<string, NameChangeExtractedFieldInput>();

  fields.forEach((field) => {
    const normalizedFieldKey = normalizeDraftFieldKey(field.field_key) as NameChangeExtractedFieldInput['field_key'];
    const normalizedFieldLabel = normalizeText(field.field_label) || normalizedFieldKey.replace(/_/g, ' ');
    const normalizedValue = normalizeDraftFieldValue(normalizedFieldKey, normalizeText(field.field_value_masked));
    if (!normalizedValue) return;

    const key = `${field.document_id ?? 'manual'}:${normalizedFieldKey}`;
    deduped.set(key, {
      ...field,
      document_id: field.document_id ?? null,
      field_key: normalizedFieldKey,
      field_label: normalizedFieldLabel,
      field_value_masked: normalizedValue,
      is_verified: Boolean(field.is_verified),
    });
  });

  return [...deduped.values()];
}

export async function loadNameChangeWorkspace(weddingSiteId: string): Promise<{
  caseRecord: NameChangeCaseRecord | null;
  documents: NameChangeDocumentRecord[];
  extractedFields: NameChangeExtractedFieldRecord[];
  latestSnapshot: NameChangePlanSnapshotRecord | null;
  reminders: NameChangeReminderRecord[];
}> {
  const { data: caseRecord } = await supabase.from('name_change_cases').select(NAME_CHANGE_CASE_SELECT).eq('wedding_site_id', weddingSiteId).maybeSingle();
  const caseId = (caseRecord as NameChangeCaseRecord | null)?.id;

  if (!caseId) {
    return {
      caseRecord: null,
      documents: [],
      extractedFields: [],
      latestSnapshot: null,
      reminders: [],
    };
  }

  const [{ data: documents }, { data: extractedFields }, { data: snapshots }, remindersResult] = await Promise.all([
    supabase.from('name_change_documents').select(NAME_CHANGE_DOCUMENT_SELECT).eq('name_change_case_id', caseId).order('created_at', { ascending: true }).limit(MAX_NAME_CHANGE_DOCUMENT_ROWS),
    supabase.from('name_change_extracted_fields').select(NAME_CHANGE_EXTRACTED_FIELD_SELECT).eq('name_change_case_id', caseId).order('created_at', { ascending: true }).limit(MAX_NAME_CHANGE_EXTRACTED_FIELD_ROWS),
    supabase.from('name_change_plan_snapshots').select(NAME_CHANGE_PLAN_SNAPSHOT_SELECT).eq('name_change_case_id', caseId).order('created_at', { ascending: false }).limit(MAX_NAME_CHANGE_SNAPSHOT_ROWS),
    supabase.from('name_change_reminders').select(NAME_CHANGE_REMINDER_SELECT).eq('name_change_case_id', caseId).order('suggested_offset_days', { ascending: true }).limit(MAX_NAME_CHANGE_REMINDER_ROWS),
  ]);

  const reminders = remindersResult.error ? [] : ((remindersResult.data as unknown as NameChangeReminderRecord[] | null) ?? []);

  return {
    caseRecord: (caseRecord as unknown as NameChangeCaseRecord | null) ?? null,
    documents: (documents as unknown as NameChangeDocumentRecord[] | null) ?? [],
    extractedFields: (extractedFields as unknown as NameChangeExtractedFieldRecord[] | null) ?? [],
    latestSnapshot: ((snapshots as unknown as NameChangePlanSnapshotRecord[] | null) ?? [])[0] ?? null,
    reminders,
  };
}

export function mapReminderRecordToInput(reminder: NameChangeReminderRecord): NameChangeReminderInput {
  return {
    reminder_key: reminder.reminder_key,
    label: reminder.label,
    reason: reminder.reason,
    depends_on_step_id: reminder.depends_on_step_id,
    suggested_offset_days: reminder.suggested_offset_days,
    urgency: reminder.urgency,
    status: reminder.status,
    section_key: reminder.section_key,
    planner_intent: reminder.planner_intent,
    focus_target_id: reminder.focus_target_id,
  };
}

export function normalizeNameChangeReminders(reminders: NameChangeReminderInput[]): NameChangeReminderInput[] {
  const deduped = new Map<string, NameChangeReminderInput>();

  reminders.forEach((reminder) => {
    const reminderKey = normalizeText(reminder.reminder_key);
    if (!reminderKey) return;

    deduped.set(reminderKey, {
      reminder_key: reminderKey,
      label: normalizeText(reminder.label) || reminderKey,
      reason: normalizeText(reminder.reason),
      depends_on_step_id: normalizeText(reminder.depends_on_step_id) || '',
      suggested_offset_days: Math.max(0, Math.round(reminder.suggested_offset_days ?? 0)),
      urgency: reminder.urgency === 'normal' ? 'medium' : reminder.urgency,
      status: reminder.status,
      section_key: reminder.section_key,
      planner_intent: reminder.planner_intent,
      focus_target_id: normalizeText(reminder.focus_target_id) || undefined,
    });
  });

  return [...deduped.values()].sort((a, b) => (a.suggested_offset_days ?? 0) - (b.suggested_offset_days ?? 0) || a.label.localeCompare(b.label));
}

export function mergeNameChangeReminders(
  generatedReminders: NameChangeReminderInput[],
  existingReminders: NameChangeReminderInput[] | null,
): NameChangeReminderInput[] {
  const normalizedGenerated = normalizeNameChangeReminders(generatedReminders);
  if (!existingReminders || existingReminders.length === 0) return normalizedGenerated;

  const existingByKey = new Map(
    normalizeNameChangeReminders(existingReminders).map((reminder) => [reminder.reminder_key, reminder]),
  );

  return normalizedGenerated.map((generatedReminder) => {
    const existingReminder = existingByKey.get(generatedReminder.reminder_key);
    if (!existingReminder) return generatedReminder;

    return {
      ...generatedReminder,
      status: existingReminder.status,
    };
  });
}

export function mergeNameChangePlanExecutionState(
  generatedPlan: NameChangePlan,
  existingPlan: NameChangePlan | null | undefined,
): NameChangePlan {
  if (!existingPlan) return generatedPlan;

  const existingSteps = new Map(existingPlan.steps.map((step) => [step.id, step]));
  const steps = generatedPlan.steps.map((step) => ({
    ...step,
    executionStatus: (step.executionStatus && step.executionStatus !== 'todo')
      ? step.executionStatus
      : existingSteps.get(step.id)?.executionStatus ?? step.executionStatus ?? 'todo',
    executionNote: step.executionNote ?? existingSteps.get(step.id)?.executionNote ?? null,
    executionUpdatedAt: step.executionUpdatedAt ?? existingSteps.get(step.id)?.executionUpdatedAt ?? null,
    completedAt: step.completedAt ?? existingSteps.get(step.id)?.completedAt ?? null,
  }));
  const executionCounts = steps.reduce((counts, step) => {
    const key = step.executionStatus ?? 'todo';
    counts[key] += 1;
    return counts;
  }, { todo: 0, in_progress: 0, complete: 0 });
  const recentExecutionActivity = sortNameChangeExecutionActivity(
    steps
      .filter((step) => step.executionUpdatedAt)
      .map((step) => ({
        stepId: step.id,
        source: 'step' as const,
        title: step.title,
        executionStatus: step.executionStatus ?? 'todo',
        note: step.executionNote ?? null,
        timestamp: step.executionUpdatedAt as string,
      })),
  ).slice(0, 5);
  const carriedActivity = (existingPlan.summary.recentExecutionActivity ?? []).filter((item) => item.stepId === null);
  const mergedRecentExecutionActivity = sortNameChangeExecutionActivity([...recentExecutionActivity, ...carriedActivity]).slice(0, 5);
  const activitySourceCounts = mergedRecentExecutionActivity.reduce((counts, item) => {
    counts[item.source] += 1;
    return counts;
  }, { step: 0, reminder: 0 });
  const latestMovementPosture = activitySourceCounts.step === activitySourceCounts.reminder
    ? 'mixed'
    : activitySourceCounts.step > activitySourceCounts.reminder
      ? 'step-led'
      : 'reminder-led';
  const dominantMovementLane = mergedRecentExecutionActivity.filter((item) => item.executionStatus === 'complete').length >= 2
    ? 'completion-led'
    : mergedRecentExecutionActivity.filter((item) => item.source === 'step' && item.executionStatus === 'in_progress').length >= 2
      ? 'start-led'
    : !mergedRecentExecutionActivity.some((item) => item.source === 'step')
    ? 'no-step-movement'
    : activitySourceCounts.step > activitySourceCounts.reminder
      ? 'step-progress'
      : activitySourceCounts.reminder > activitySourceCounts.step
        ? 'reminder-churn'
        : 'mixed';
  const mixedMovementReason = dominantMovementLane === 'mixed'
    ? (mergedRecentExecutionActivity.some((item) => item.executionStatus === 'complete')
        && mergedRecentExecutionActivity.some((item) => item.source === 'step' && item.executionStatus === 'in_progress')
        ? 'starts-and-completions'
        : 'step-reminder-balance')
    : null;
  const mixedMovementHasUntouchedRisk = dominantMovementLane === 'mixed'
    ? mergedRecentExecutionActivity.some((item) => item.source === 'step' && item.executionStatus === 'todo')
    : false;
  const mixedMovementReminderHeavy = dominantMovementLane === 'mixed'
    ? activitySourceCounts.reminder > activitySourceCounts.step
    : false;
  const reminderChurnRisk = activitySourceCounts.reminder >= 4
    ? 'high'
    : activitySourceCounts.reminder > activitySourceCounts.step
      ? 'medium'
      : 'low';
  const hasRecentCompletion = mergedRecentExecutionActivity.some((item) => item.executionStatus === 'complete');
  const hasRecentStart = mergedRecentExecutionActivity.some((item) => item.source === 'step' && item.executionStatus === 'in_progress');
  const hasRecentUntouchedRisk = mergedRecentExecutionActivity.some((item) => item.source === 'step' && item.executionStatus === 'todo');
  const hasZeroRecentStepMovement = !mergedRecentExecutionActivity.some((item) => item.source === 'step');
  const stepById = new Map(steps.map((step) => [step.id, step]));
  const resolveSequenceStatus = (dependsOnStepIds: string[]): 'ready' | 'blocked' | 'upcoming' | 'in_progress' | 'complete' => {
    const dependencySteps = dependsOnStepIds
      .map((stepId) => stepById.get(stepId))
      .filter((step): step is NonNullable<typeof step> => Boolean(step));

    if (dependencySteps.length === 0) return 'upcoming';
    if (dependencySteps.every((step) => step.executionStatus === 'complete')) return 'complete';

    const firstIncompleteIndex = dependencySteps.findIndex((step) => step.executionStatus !== 'complete');
    const firstIncomplete = dependencySteps[firstIncompleteIndex];
    const priorSteps = dependencySteps.slice(0, firstIncompleteIndex);
    const activeDependencyIsCurrentTarget = firstIncompleteIndex === dependencySteps.length - 1;

    if (priorSteps.some((step) => step.executionStatus === 'in_progress')) return 'in_progress';
    if (priorSteps.some((step) => step.status === 'blocked')) return 'blocked';
    if (firstIncomplete?.status === 'blocked') return 'blocked';
    if (firstIncomplete?.executionStatus === 'in_progress') return 'in_progress';
    if (!activeDependencyIsCurrentTarget) return 'upcoming';
    if (priorSteps.every((step) => step.executionStatus === 'complete') && firstIncomplete?.status === 'ready') return 'ready';
    return 'upcoming';
  };
  const executionTracks = generatedPlan.summary.executionTracks?.map((track) => ({
    ...track,
    status: resolveSequenceStatus(track.dependsOnStepIds),
  }));
  const milestoneChecklist = generatedPlan.summary.milestoneChecklist?.map((milestone) => ({
    ...milestone,
    status: resolveSequenceStatus(milestone.dependsOnStepIds),
  }));
  const institutionCategoryCoverage = generatedPlan.summary.institutionCategoryCoverage?.map((category) => ({
    ...category,
    status: resolveSequenceStatus(category.dependsOnStepIds),
  }));

  return {
    ...generatedPlan,
    steps,
    summary: {
      ...generatedPlan.summary,
      executionTracks,
      milestoneChecklist,
      institutionCategoryCoverage,
      executionCounts,
      activitySourceCounts,
      latestMovementPosture,
      dominantMovementLane,
      mixedMovementReason,
      mixedMovementHasUntouchedRisk,
      mixedMovementReminderHeavy,
      reminderChurnRisk,
      hasRecentCompletion,
      hasRecentStart,
      hasRecentUntouchedRisk,
      hasZeroRecentStepMovement,
      recentExecutionActivity: mergedRecentExecutionActivity,
    },
  };
}

export function appendNameChangeExecutionActivity(
  plan: NameChangePlan,
  activity: {
    source?: 'step' | 'reminder';
    title: string;
    executionStatus: 'todo' | 'in_progress' | 'complete';
    note: string | null;
    timestamp?: string;
  },
): NameChangePlan {
  const timestamp = activity.timestamp ?? new Date().toISOString();
  const existing = plan.summary.recentExecutionActivity ?? [];
  const nextRecentExecutionActivity = sortNameChangeExecutionActivity([
    {
      stepId: null,
      source: activity.source ?? 'reminder',
      title: activity.title,
      executionStatus: activity.executionStatus,
      note: activity.note,
      timestamp,
    },
    ...existing,
  ]).slice(0, 5);

  return {
    ...plan,
    summary: {
      ...plan.summary,
      recentExecutionActivity: nextRecentExecutionActivity,
      activitySourceCounts: nextRecentExecutionActivity.reduce((counts, item) => {
        counts[item.source] += 1;
        return counts;
      }, { step: 0, reminder: 0 }),
      latestMovementPosture: (() => {
        const counts = nextRecentExecutionActivity.reduce((result, item) => {
          result[item.source] += 1;
          return result;
        }, { step: 0, reminder: 0 });

        if (counts.step === counts.reminder) return 'mixed';
        return counts.step > counts.reminder ? 'step-led' : 'reminder-led';
      })(),
      dominantMovementLane: (() => {
        const items = nextRecentExecutionActivity;
        const counts = items.reduce((result, item) => {
          result[item.source] += 1;
          return result;
        }, { step: 0, reminder: 0 });

        if (items.filter((item) => item.executionStatus === 'complete').length >= 2) return 'completion-led';
        if (items.filter((item) => item.source === 'step' && item.executionStatus === 'in_progress').length >= 2) return 'start-led';
        if (!items.some((item) => item.source === 'step')) return 'no-step-movement';
        if (counts.step === counts.reminder) return 'mixed';
        return counts.step > counts.reminder ? 'step-progress' : 'reminder-churn';
      })(),
      mixedMovementReason: (() => {
        const items = nextRecentExecutionActivity;
        const counts = items.reduce((result, item) => {
          result[item.source] += 1;
          return result;
        }, { step: 0, reminder: 0 });
        const lane = items.filter((item) => item.executionStatus === 'complete').length >= 2
          ? 'completion-led'
          : items.filter((item) => item.source === 'step' && item.executionStatus === 'in_progress').length >= 2
            ? 'start-led'
            : !items.some((item) => item.source === 'step')
              ? 'no-step-movement'
              : counts.step > counts.reminder
                ? 'step-progress'
                : counts.reminder > counts.step
                  ? 'reminder-churn'
                  : 'mixed';

        if (lane !== 'mixed') return null;
        return items.some((item) => item.executionStatus === 'complete')
          && items.some((item) => item.source === 'step' && item.executionStatus === 'in_progress')
          ? 'starts-and-completions'
          : 'step-reminder-balance';
      })(),
      mixedMovementHasUntouchedRisk: (() => {
        const items = nextRecentExecutionActivity;
        const counts = items.reduce((result, item) => {
          result[item.source] += 1;
          return result;
        }, { step: 0, reminder: 0 });
        const lane = items.filter((item) => item.executionStatus === 'complete').length >= 2
          ? 'completion-led'
          : items.filter((item) => item.source === 'step' && item.executionStatus === 'in_progress').length >= 2
            ? 'start-led'
            : !items.some((item) => item.source === 'step')
              ? 'no-step-movement'
              : counts.step > counts.reminder
                ? 'step-progress'
                : counts.reminder > counts.step
                  ? 'reminder-churn'
                  : 'mixed';

        return lane === 'mixed'
          ? items.some((item) => item.source === 'step' && item.executionStatus === 'todo')
          : false;
      })(),
      mixedMovementReminderHeavy: (() => {
        const items = nextRecentExecutionActivity;
        const counts = items.reduce((result, item) => {
          result[item.source] += 1;
          return result;
        }, { step: 0, reminder: 0 });
        const lane = items.filter((item) => item.executionStatus === 'complete').length >= 2
          ? 'completion-led'
          : items.filter((item) => item.source === 'step' && item.executionStatus === 'in_progress').length >= 2
            ? 'start-led'
            : !items.some((item) => item.source === 'step')
              ? 'no-step-movement'
              : counts.step > counts.reminder
                ? 'step-progress'
                : counts.reminder > counts.step
                  ? 'reminder-churn'
                  : 'mixed';

        return lane === 'mixed' ? counts.reminder > counts.step : false;
      })(),
      reminderChurnRisk: (() => {
        const counts = nextRecentExecutionActivity.reduce((result, item) => {
          result[item.source] += 1;
          return result;
        }, { step: 0, reminder: 0 });

        if (counts.reminder >= 4) return 'high';
        if (counts.reminder > counts.step) return 'medium';
        return 'low';
      })(),
      hasRecentCompletion: nextRecentExecutionActivity.some((item) => item.executionStatus === 'complete'),
      hasRecentStart: nextRecentExecutionActivity.some((item) => item.source === 'step' && item.executionStatus === 'in_progress'),
      hasRecentUntouchedRisk: nextRecentExecutionActivity.some((item) => item.source === 'step' && item.executionStatus === 'todo'),
      hasZeroRecentStepMovement: !nextRecentExecutionActivity.some((item) => item.source === 'step'),
    },
  };
}

export function annotateNameChangePlanStepsFromReminderChanges(
  plan: NameChangePlan,
  changedReminders: Array<{
    label: string;
    depends_on_step_id?: string;
    status: NameChangeReminderInput['status'];
  }>,
  timestamp?: string,
): NameChangePlan {
  const now = timestamp ?? new Date().toISOString();
  const reminderChangesByStep = new Map<string, Array<{ label: string; status: NameChangeReminderInput['status'] }>>();

  changedReminders.forEach((reminder) => {
    if (!reminder.depends_on_step_id) return;
    const list = reminderChangesByStep.get(reminder.depends_on_step_id) ?? [];
    list.push({ label: reminder.label, status: reminder.status });
    reminderChangesByStep.set(reminder.depends_on_step_id, list);
  });

  function mergeReminderAnnotation(existingNote: string | null | undefined, reminderNote: string) {
    const existingParts = (existingNote ?? '')
      .split(' · ')
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((part) => !part.includes(' reminder → '));

    return [...existingParts, reminderNote].join(' · ');
  }

  return mergeNameChangePlanExecutionState({
    ...plan,
    steps: plan.steps.map((step) => {
      const changes = reminderChangesByStep.get(step.id);
      if (!changes || changes.length === 0) return step;
      const hasNonDismissedChange = changes.some((change) => change.status !== 'dismissed');

      const note = changes
        .map((change) => `${change.label} reminder → ${change.status}`)
        .slice(0, 2)
        .join(' · ');

      return {
        ...step,
        executionStatus: changes.some((change) => change.status === 'sent')
          ? 'complete'
          : step.executionStatus === 'todo' && changes.some((change) => change.status === 'scheduled')
            ? 'in_progress'
            : step.executionStatus,
        executionNote: mergeReminderAnnotation(step.executionNote, note),
        executionUpdatedAt: hasNonDismissedChange ? now : step.executionUpdatedAt,
        completedAt: changes.some((change) => change.status === 'sent')
          ? now
          : step.completedAt,
      };
    }),
  }, plan);
}

export function deriveNameChangeWorkflowStatus(plan: NameChangePlan): NameChangeCaseInput['workflow_status'] {
  if (plan.summary.blockers.length > 0) return 'draft';

  const executionCounts = plan.summary.executionCounts ?? { todo: plan.steps.length, in_progress: 0, complete: 0 };
  const actionableSteps = plan.steps.filter((step) => step.status !== 'blocked');
  const actionableCount = actionableSteps.length;
  const completedActionableCount = actionableSteps.filter((step) => step.executionStatus === 'complete').length;

  if (actionableCount > 0 && completedActionableCount === actionableCount) return 'complete';
  if (executionCounts.in_progress > 0 || executionCounts.complete > 0) return 'in_progress';
  return 'ready';
}

export function mapCaseRecordToNameChangeInput(caseRecord: NameChangeCaseRecord): NameChangeCaseInput {
  return normalizeNameChangeCaseInput({
    workflow_status: caseRecord.workflow_status,
    launch_state: caseRecord.launch_state,
    legal_basis: caseRecord.legal_basis,
    current_first_name: caseRecord.current_first_name,
    current_middle_name: caseRecord.current_middle_name ?? '',
    current_last_name: caseRecord.current_last_name,
    target_first_name: caseRecord.target_first_name,
    target_middle_name: caseRecord.target_middle_name ?? '',
    target_last_name: caseRecord.target_last_name,
    email: caseRecord.email ?? '',
    phone_last4: caseRecord.phone_last4 ?? '',
    county_residence: caseRecord.county_residence ?? '',
    marriage_state: caseRecord.marriage_state ?? 'California',
    marriage_date: caseRecord.marriage_date ?? '',
    urgency_level: caseRecord.urgency_level,
    has_us_passport: caseRecord.has_us_passport,
    passport_needs_update: caseRecord.passport_needs_update,
    has_real_id_license: caseRecord.has_real_id_license,
    is_us_citizen: caseRecord.is_us_citizen,
    employment_status: caseRecord.employment_status,
    change_reasons: caseRecord.change_reasons,
    structured_intake: normalizeNameChangeStructuredIntake(caseRecord.structured_intake),
    latest_plan_summary: caseRecord.latest_plan_summary,
  });
}

export function mapDocumentRecordToInput(document: NameChangeDocumentRecord): NameChangeDocumentInput {
  return {
    id: document.id,
    document_kind: document.document_kind,
    display_name: document.display_name,
    storage_mode: document.storage_mode,
    intake_status: document.intake_status,
    file_name_masked: document.file_name_masked,
    issuing_authority: document.issuing_authority,
    issued_on: document.issued_on,
    expires_on: document.expires_on,
    extraction_confidence: document.extraction_confidence,
    extracted_snapshot: document.extracted_snapshot,
  };
}

export function mapExtractedFieldRecordToInput(field: NameChangeExtractedFieldRecord): NameChangeExtractedFieldInput {
  return {
    document_id: field.document_id,
    field_key: field.field_key,
    field_label: field.field_label,
    field_value_masked: field.field_value_masked,
    source_type: field.source_type,
    is_verified: field.is_verified,
  };
}

export function hydrateNameChangeWorkspace(workspace: {
  caseRecord: NameChangeCaseRecord | null;
  documents: NameChangeDocumentRecord[];
  extractedFields: NameChangeExtractedFieldRecord[];
  latestSnapshot: NameChangePlanSnapshotRecord | null;
  reminders: NameChangeReminderRecord[];
}): HydratedNameChangeWorkspace {
  if (!workspace.caseRecord) {
    const plan = mergeNameChangePlanExecutionState(
      buildNameChangePlan({ profile: defaultNameChangeCaseInput, documents: [], extractedFields: [] }),
      null,
    );
    return {
      draft: defaultNameChangeCaseInput,
      documents: [] as NameChangeDocumentInput[],
      extractedFields: [] as NameChangeExtractedFieldInput[],
      plan,
      reminders: mapReminderSuggestionsToInputs(buildNameChangeReminderSuggestions(plan)),
    };
  }

  const draft = mapCaseRecordToNameChangeInput(workspace.caseRecord);
  const documents = normalizeNameChangeDocuments(workspace.documents.map(mapDocumentRecordToInput));
  const extractedFields = normalizeNameChangeExtractedFields(workspace.extractedFields.map(mapExtractedFieldRecordToInput));
  const fallbackPlan = mergeNameChangePlanExecutionState(
    buildNameChangePlan({ profile: draft, documents, extractedFields }),
    workspace.latestSnapshot?.plan_payload ?? null,
  );
  const reminders = normalizeNameChangeReminders(
    workspace.reminders.length > 0
      ? workspace.reminders.map(mapReminderRecordToInput)
      : mapReminderSuggestionsToInputs(buildNameChangeReminderSuggestions(fallbackPlan)),
  );

  return {
    draft,
    documents,
    extractedFields,
    plan: fallbackPlan,
    reminders,
  };
}

export async function upsertNameChangeCase(weddingSiteId: string, input: NameChangeCaseInput): Promise<NameChangeCaseRecord> {
  const normalizedInput = normalizeNameChangeCaseInput(input);
  const payload = {
    ...normalizedInput,
    current_middle_name: normalizedInput.current_middle_name || null,
    target_middle_name: normalizedInput.target_middle_name || null,
    email: normalizedInput.email || null,
    phone_last4: normalizedInput.phone_last4 || null,
    county_residence: normalizedInput.county_residence || null,
    marriage_state: normalizedInput.marriage_state || null,
    marriage_date: normalizedInput.marriage_date || null,
    latest_plan_summary: normalizedInput.latest_plan_summary ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.rpc('name_change_case_write', {
    p_wedding_site_id: weddingSiteId,
    p_payload: payload,
  });

  if (error) throw error;
  return data as unknown as NameChangeCaseRecord;
}

export async function replaceNameChangeDocuments(caseId: string, documents: NameChangeDocumentInput[]): Promise<NameChangeDocumentRecord[]> {
  const normalizedDocuments = normalizeNameChangeDocuments(documents);
  const { data, error } = await supabase.rpc('name_change_documents_replace', {
    p_case_id: caseId,
    p_documents: normalizedDocuments.map(({ id: _id, ...document }) => ({ ...document })),
  });

  if (error) throw error;
  return (data as unknown as NameChangeDocumentRecord[] | null) ?? [];
}

export function remapNameChangeExtractedFieldsToPersistedDocuments(
  sourceDocuments: NameChangeDocumentInput[],
  persistedDocuments: NameChangeDocumentRecord[],
  extractedFields: NameChangeExtractedFieldInput[],
): NameChangeExtractedFieldInput[] {
  const sourceDocumentKindById = new Map(
    sourceDocuments
      .filter((document): document is NameChangeDocumentInput & { id: string } => Boolean(document.id))
      .map((document) => [document.id, canonicalizeNameChangeDocumentKind(document.document_kind)]),
  );
  const persistedDocumentIdByKind = new Map(
    persistedDocuments.map((document) => [canonicalizeNameChangeDocumentKind(document.document_kind), document.id]),
  );

  return extractedFields.map((field) => {
    if (!field.document_id) return { ...field, document_id: null };

    const sourceKind = sourceDocumentKindById.get(field.document_id)
      ?? sourceDocuments.find((document) => document.id === field.document_id)?.document_kind
      ?? null;
    if (!sourceKind) return { ...field, document_id: null };

    return {
      ...field,
      document_id: persistedDocumentIdByKind.get(sourceKind) ?? null,
    };
  });
}

export async function replaceNameChangeExtractedFields(caseId: string, fields: NameChangeExtractedFieldInput[]): Promise<NameChangeExtractedFieldRecord[]> {
  const normalizedFields = normalizeNameChangeExtractedFields(fields);
  const { data, error } = await supabase.rpc('name_change_extracted_fields_replace', {
    p_case_id: caseId,
    p_fields: normalizedFields.map((field) => ({ ...field, document_id: field.document_id ?? null })),
  });

  if (error) throw error;
  return (data as unknown as NameChangeExtractedFieldRecord[] | null) ?? [];
}

export async function createNameChangePlanSnapshot(caseId: string, plan: NameChangePlan): Promise<NameChangePlanSnapshotRecord> {
  const { data, error } = await supabase.rpc('name_change_plan_snapshot_write', {
    p_case_id: caseId,
    p_engine_version: NAME_CHANGE_ENGINE_VERSION,
    p_plan_payload: plan,
  });

  if (error) throw error;
  return data as unknown as NameChangePlanSnapshotRecord;
}

export async function replaceNameChangeReminders(caseId: string, reminders: NameChangeReminderInput[]): Promise<NameChangeReminderRecord[]> {
  const normalizedReminders = normalizeNameChangeReminders(reminders);
  const { data, error } = await supabase.rpc('name_change_reminders_replace', {
    p_case_id: caseId,
    p_reminders: normalizedReminders.map((reminder) => toPersistedNameChangeReminderRow(reminder, caseId)),
  });

  if (error) throw error;
  return (data as unknown as NameChangeReminderRecord[] | null) ?? [];
}

export function buildNameChangeWorkspaceBundle(
  caseInput: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
  reminders: NameChangeReminderInput[] | null = null,
): HydratedNameChangeWorkspace {
  const draft = normalizeNameChangeCaseInput(caseInput);
  const normalizedDocuments = normalizeNameChangeDocuments(documents);
  const normalizedExtractedFields = normalizeNameChangeExtractedFields(extractedFields);
  const plan = mergeNameChangePlanExecutionState(
    buildNameChangePlan({ profile: draft, documents: normalizedDocuments, extractedFields: normalizedExtractedFields }),
    null,
  );

  const generatedReminders = mapReminderSuggestionsToInputs(buildNameChangeReminderSuggestions(plan));
  const mergedReminders = mergeNameChangeReminders(generatedReminders, reminders);
  const mergedReminderKeys = new Set(mergedReminders.map((reminder) => reminder.reminder_key));
  const carriedExplicitReminders = normalizeNameChangeReminders(reminders ?? [])
    .filter((reminder) => reminder.status !== 'pending' && !mergedReminderKeys.has(reminder.reminder_key));
  const enrichedExplicitReminders = carriedExplicitReminders.map((reminder) => {
    const route = getReminderPlannerRoute({
      id: reminder.reminder_key,
      dependsOnStepId: reminder.depends_on_step_id ?? '',
    });
    return {
      ...reminder,
      section_key: reminder.section_key ?? route.sectionKey,
      planner_intent: reminder.planner_intent ?? route.plannerIntent,
      focus_target_id: reminder.focus_target_id ?? route.focusTargetId,
    };
  });

  return {
    draft,
    documents: normalizedDocuments,
    extractedFields: normalizedExtractedFields,
    plan,
    reminders: [...mergedReminders, ...enrichedExplicitReminders],
  };
}

export async function saveNameChangeWorkspace(
  weddingSiteId: string,
  caseInput: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
  reminders: NameChangeReminderInput[] | null = null,
  existingPlan: NameChangePlan | null = null,
): Promise<{ caseRecord: NameChangeCaseRecord; plan: NameChangePlan; reminders: NameChangeReminderInput[] }> {
  const workspace = buildNameChangeWorkspaceBundle(caseInput, documents, extractedFields, reminders);
  const normalizedCaseInput = workspace.draft;
  const normalizedDocuments = workspace.documents;
  const normalizedExtractedFields = workspace.extractedFields;
  const plan = mergeNameChangePlanExecutionState(workspace.plan, existingPlan);
  const caseRecord = await upsertNameChangeCase(weddingSiteId, {
    ...normalizedCaseInput,
    workflow_status: deriveNameChangeWorkflowStatus(plan),
    latest_plan_summary: plan.summary as unknown as Record<string, unknown>,
  });

  const persistedDocuments = await replaceNameChangeDocuments(caseRecord.id, normalizedDocuments);
  const remappedExtractedFields = remapNameChangeExtractedFieldsToPersistedDocuments(
    normalizedDocuments,
    persistedDocuments,
    normalizedExtractedFields,
  );
  await replaceNameChangeExtractedFields(caseRecord.id, remappedExtractedFields);
  await replaceNameChangeReminders(caseRecord.id, workspace.reminders);
  await createNameChangePlanSnapshot(caseRecord.id, plan);

  return { caseRecord, plan, reminders: workspace.reminders };
}
