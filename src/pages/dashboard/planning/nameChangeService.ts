import { supabase } from '../../../lib/supabase';
import { buildNameChangePlan } from '../../../lib/nameChange/engine';
import { NAME_CHANGE_ENGINE_VERSION } from '../../../lib/nameChange/registry';
import { buildNameChangeReminderSuggestions, mapReminderSuggestionsToInputs } from '../../../lib/nameChange/reminders';
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
} from '../../../lib/nameChange/types';

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
  structured_intake: {
    spouseLastName: '',
    travelBookedSoon: false,
    wantsDocumentIntakeHelp: true,
  },
};

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

export function normalizeNameChangeCaseInput(input: NameChangeCaseInput): NameChangeCaseInput {
  const spouseLastName = normalizeText(String(input.structured_intake.spouseLastName ?? ''));

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
    structured_intake: {
      ...input.structured_intake,
      spouseLastName,
      travelBookedSoon: Boolean(input.structured_intake.travelBookedSoon),
      wantsDocumentIntakeHelp: input.structured_intake.wantsDocumentIntakeHelp !== false,
    },
  };
}

export function normalizeNameChangeDocuments(documents: NameChangeDocumentInput[]): NameChangeDocumentInput[] {
  const deduped = new Map<NameChangeDocumentInput['document_kind'], NameChangeDocumentInput>();

  documents.forEach((document) => {
    deduped.set(document.document_kind, {
      ...document,
      display_name: normalizeText(document.display_name) || document.document_kind.replace(/_/g, ' '),
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
    const normalizedValue = normalizeText(field.field_value_masked);
    if (!normalizedValue) return;

    const key = `${field.document_id ?? 'manual'}:${field.field_key}`;
    deduped.set(key, {
      ...field,
      document_id: field.document_id ?? null,
      field_label: normalizeText(field.field_label) || field.field_key.replace(/_/g, ' '),
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
  const { data: caseRecord } = await supabase.from('name_change_cases').select('*').eq('wedding_site_id', weddingSiteId).maybeSingle();
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
    supabase.from('name_change_documents').select('*').eq('name_change_case_id', caseId).order('created_at', { ascending: true }),
    supabase.from('name_change_extracted_fields').select('*').eq('name_change_case_id', caseId).order('created_at', { ascending: true }),
    supabase.from('name_change_plan_snapshots').select('*').eq('name_change_case_id', caseId).order('created_at', { ascending: false }).limit(1),
    supabase.from('name_change_reminders').select('*').eq('name_change_case_id', caseId).order('suggested_offset_days', { ascending: true }),
  ]);

  const reminders = remindersResult.error ? [] : ((remindersResult.data as NameChangeReminderRecord[] | null) ?? []);

  return {
    caseRecord: (caseRecord as NameChangeCaseRecord | null) ?? null,
    documents: (documents as NameChangeDocumentRecord[] | null) ?? [],
    extractedFields: (extractedFields as NameChangeExtractedFieldRecord[] | null) ?? [],
    latestSnapshot: ((snapshots as NameChangePlanSnapshotRecord[] | null) ?? [])[0] ?? null,
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
      depends_on_step_id: normalizeText(reminder.depends_on_step_id),
      suggested_offset_days: Math.max(0, Math.round(reminder.suggested_offset_days)),
      urgency: reminder.urgency,
      status: reminder.status,
    });
  });

  return [...deduped.values()].sort((a, b) => a.suggested_offset_days - b.suggested_offset_days || a.label.localeCompare(b.label));
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
    structured_intake: caseRecord.structured_intake ?? {},
    latest_plan_summary: caseRecord.latest_plan_summary,
  });
}

export function mapDocumentRecordToInput(document: NameChangeDocumentRecord): NameChangeDocumentInput {
  return {
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
    const plan = buildNameChangePlan({ profile: defaultNameChangeCaseInput, documents: [], extractedFields: [] });
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
  const fallbackPlan = buildNameChangePlan({ profile: draft, documents, extractedFields });
  const reminders = normalizeNameChangeReminders(
    workspace.reminders.length > 0
      ? workspace.reminders.map(mapReminderRecordToInput)
      : mapReminderSuggestionsToInputs(buildNameChangeReminderSuggestions(fallbackPlan)),
  );

  return {
    draft,
    documents,
    extractedFields,
    plan: workspace.latestSnapshot?.plan_payload ?? fallbackPlan,
    reminders,
  };
}

export async function upsertNameChangeCase(weddingSiteId: string, input: NameChangeCaseInput): Promise<NameChangeCaseRecord> {
  const normalizedInput = normalizeNameChangeCaseInput(input);
  const payload = {
    wedding_site_id: weddingSiteId,
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

  const { data, error } = await supabase
    .from('name_change_cases')
    .upsert(payload, { onConflict: 'wedding_site_id' })
    .select()
    .single();

  if (error) throw error;
  return data as NameChangeCaseRecord;
}

export async function replaceNameChangeDocuments(caseId: string, documents: NameChangeDocumentInput[]): Promise<NameChangeDocumentRecord[]> {
  const normalizedDocuments = normalizeNameChangeDocuments(documents);
  const { error: deleteError } = await supabase.from('name_change_documents').delete().eq('name_change_case_id', caseId);
  if (deleteError) throw deleteError;
  if (normalizedDocuments.length === 0) return [];

  const { data, error } = await supabase
    .from('name_change_documents')
    .insert(normalizedDocuments.map((document) => ({ ...document, name_change_case_id: caseId })))
    .select();

  if (error) throw error;
  return (data as NameChangeDocumentRecord[] | null) ?? [];
}

export async function replaceNameChangeExtractedFields(caseId: string, fields: NameChangeExtractedFieldInput[]): Promise<NameChangeExtractedFieldRecord[]> {
  const normalizedFields = normalizeNameChangeExtractedFields(fields);
  const { error: deleteError } = await supabase.from('name_change_extracted_fields').delete().eq('name_change_case_id', caseId);
  if (deleteError) throw deleteError;
  if (normalizedFields.length === 0) return [];

  const { data, error } = await supabase
    .from('name_change_extracted_fields')
    .insert(normalizedFields.map((field) => ({ ...field, name_change_case_id: caseId, document_id: field.document_id ?? null })))
    .select();

  if (error) throw error;
  return (data as NameChangeExtractedFieldRecord[] | null) ?? [];
}

export async function createNameChangePlanSnapshot(caseId: string, plan: NameChangePlan): Promise<NameChangePlanSnapshotRecord> {
  const { data, error } = await supabase
    .from('name_change_plan_snapshots')
    .insert({
      name_change_case_id: caseId,
      engine_version: NAME_CHANGE_ENGINE_VERSION,
      plan_payload: plan,
    })
    .select()
    .single();

  if (error) throw error;
  return data as NameChangePlanSnapshotRecord;
}

export async function replaceNameChangeReminders(caseId: string, reminders: NameChangeReminderInput[]): Promise<NameChangeReminderRecord[]> {
  const normalizedReminders = normalizeNameChangeReminders(reminders);
  const { error: deleteError } = await supabase.from('name_change_reminders').delete().eq('name_change_case_id', caseId);
  if (deleteError) throw deleteError;
  if (normalizedReminders.length === 0) return [];

  const { data, error } = await supabase
    .from('name_change_reminders')
    .insert(normalizedReminders.map((reminder) => ({ ...reminder, name_change_case_id: caseId })))
    .select();

  if (error) throw error;
  return (data as NameChangeReminderRecord[] | null) ?? [];
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
  const plan = buildNameChangePlan({ profile: draft, documents: normalizedDocuments, extractedFields: normalizedExtractedFields });

  return {
    draft,
    documents: normalizedDocuments,
    extractedFields: normalizedExtractedFields,
    plan,
    reminders: normalizeNameChangeReminders(
      reminders ?? mapReminderSuggestionsToInputs(buildNameChangeReminderSuggestions(plan)),
    ),
  };
}

export async function saveNameChangeWorkspace(
  weddingSiteId: string,
  caseInput: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
  reminders: NameChangeReminderInput[] | null = null,
): Promise<{ caseRecord: NameChangeCaseRecord; plan: NameChangePlan; reminders: NameChangeReminderInput[] }> {
  const workspace = buildNameChangeWorkspaceBundle(caseInput, documents, extractedFields, reminders);
  const normalizedCaseInput = workspace.draft;
  const normalizedDocuments = workspace.documents;
  const normalizedExtractedFields = workspace.extractedFields;
  const plan = workspace.plan;
  const caseRecord = await upsertNameChangeCase(weddingSiteId, {
    ...normalizedCaseInput,
    workflow_status: plan.summary.blockers.length > 0 ? 'draft' : 'ready',
    latest_plan_summary: plan.summary as unknown as Record<string, unknown>,
  });

  await replaceNameChangeDocuments(caseRecord.id, normalizedDocuments);
  await replaceNameChangeExtractedFields(caseRecord.id, normalizedExtractedFields);
  await replaceNameChangeReminders(caseRecord.id, workspace.reminders);
  await createNameChangePlanSnapshot(caseRecord.id, plan);

  return { caseRecord, plan, reminders: workspace.reminders };
}
