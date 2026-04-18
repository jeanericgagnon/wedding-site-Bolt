import { supabase } from '../../../lib/supabase';
import { buildNameChangePlan } from '../../../lib/nameChange/engine';
import { NAME_CHANGE_ENGINE_VERSION } from '../../../lib/nameChange/registry';
import type {
  NameChangeCaseInput,
  NameChangeCaseRecord,
  NameChangeDocumentInput,
  NameChangeDocumentRecord,
  NameChangeExtractedFieldInput,
  NameChangeExtractedFieldRecord,
  NameChangePlan,
  NameChangePlanSnapshotRecord,
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

export async function loadNameChangeWorkspace(weddingSiteId: string): Promise<{
  caseRecord: NameChangeCaseRecord | null;
  documents: NameChangeDocumentRecord[];
  extractedFields: NameChangeExtractedFieldRecord[];
  latestSnapshot: NameChangePlanSnapshotRecord | null;
}> {
  const { data: caseRecord } = await supabase.from('name_change_cases').select('*').eq('wedding_site_id', weddingSiteId).maybeSingle();
  const caseId = (caseRecord as NameChangeCaseRecord | null)?.id;

  if (!caseId) {
    return {
      caseRecord: null,
      documents: [],
      extractedFields: [],
      latestSnapshot: null,
    };
  }

  const [{ data: documents }, { data: extractedFields }, { data: snapshots }] = await Promise.all([
    supabase.from('name_change_documents').select('*').eq('name_change_case_id', caseId).order('created_at', { ascending: true }),
    supabase.from('name_change_extracted_fields').select('*').eq('name_change_case_id', caseId).order('created_at', { ascending: true }),
    supabase.from('name_change_plan_snapshots').select('*').eq('name_change_case_id', caseId).order('created_at', { ascending: false }).limit(1),
  ]);

  return {
    caseRecord: (caseRecord as NameChangeCaseRecord | null) ?? null,
    documents: (documents as NameChangeDocumentRecord[] | null) ?? [],
    extractedFields: (extractedFields as NameChangeExtractedFieldRecord[] | null) ?? [],
    latestSnapshot: ((snapshots as NameChangePlanSnapshotRecord[] | null) ?? [])[0] ?? null,
  };
}

export async function upsertNameChangeCase(weddingSiteId: string, input: NameChangeCaseInput): Promise<NameChangeCaseRecord> {
  const payload = {
    wedding_site_id: weddingSiteId,
    ...input,
    current_middle_name: input.current_middle_name || null,
    target_middle_name: input.target_middle_name || null,
    email: input.email || null,
    phone_last4: input.phone_last4 || null,
    county_residence: input.county_residence || null,
    marriage_state: input.marriage_state || null,
    marriage_date: input.marriage_date || null,
    latest_plan_summary: input.latest_plan_summary ?? null,
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
  const { error: deleteError } = await supabase.from('name_change_documents').delete().eq('name_change_case_id', caseId);
  if (deleteError) throw deleteError;
  if (documents.length === 0) return [];

  const { data, error } = await supabase
    .from('name_change_documents')
    .insert(documents.map((document) => ({ ...document, name_change_case_id: caseId })))
    .select();

  if (error) throw error;
  return (data as NameChangeDocumentRecord[] | null) ?? [];
}

export async function replaceNameChangeExtractedFields(caseId: string, fields: NameChangeExtractedFieldInput[]): Promise<NameChangeExtractedFieldRecord[]> {
  const { error: deleteError } = await supabase.from('name_change_extracted_fields').delete().eq('name_change_case_id', caseId);
  if (deleteError) throw deleteError;
  if (fields.length === 0) return [];

  const { data, error } = await supabase
    .from('name_change_extracted_fields')
    .insert(fields.map((field) => ({ ...field, name_change_case_id: caseId, document_id: field.document_id ?? null })))
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

export async function saveNameChangeWorkspace(
  weddingSiteId: string,
  caseInput: NameChangeCaseInput,
  documents: NameChangeDocumentInput[],
  extractedFields: NameChangeExtractedFieldInput[],
): Promise<{ caseRecord: NameChangeCaseRecord; plan: NameChangePlan }> {
  const plan = buildNameChangePlan({ profile: caseInput, documents, extractedFields });
  const caseRecord = await upsertNameChangeCase(weddingSiteId, {
    ...caseInput,
    workflow_status: plan.summary.blockers.length > 0 ? 'draft' : 'ready',
    latest_plan_summary: plan.summary as unknown as Record<string, unknown>,
  });

  await replaceNameChangeDocuments(caseRecord.id, documents);
  await replaceNameChangeExtractedFields(caseRecord.id, extractedFields);
  await createNameChangePlanSnapshot(caseRecord.id, plan);

  return { caseRecord, plan };
}
