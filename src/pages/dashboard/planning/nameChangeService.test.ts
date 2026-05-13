import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { NameChangeCaseInput, NameChangeCaseRecord, NameChangeDocumentInput, NameChangeDocumentRecord, NameChangeExtractedFieldInput } from '../../../lib/nameChange/types';
import {
  annotateNameChangePlanStepsFromReminderChanges,
  appendNameChangeExecutionActivity,
  buildNameChangeWorkspaceBundle,
  deriveNameChangeWorkflowStatus,
  defaultNameChangeCaseInput,
  hydrateNameChangeWorkspace,
  mapCaseRecordToNameChangeInput,
  mapReminderRecordToInput,
  MAX_NAME_CHANGE_DOCUMENT_ROWS,
  MAX_NAME_CHANGE_EXTRACTED_FIELD_ROWS,
  MAX_NAME_CHANGE_REMINDER_ROWS,
  MAX_NAME_CHANGE_SNAPSHOT_ROWS,
  mergeNameChangeReminders,
  mergeNameChangePlanExecutionState,
  normalizeNameChangeReminders,
  normalizeNameChangeCaseInput,
  normalizeNameChangeDocuments,
  normalizeNameChangeExtractedFields,
  normalizeNameChangeStructuredIntake,
  remapNameChangeExtractedFieldsToPersistedDocuments,
} from './nameChangeService';

function makeCase(overrides: Partial<NameChangeCaseInput> = {}): NameChangeCaseInput {
  return {
    ...defaultNameChangeCaseInput,
    current_first_name: '  Alex  ',
    current_middle_name: '  Marie ',
    current_last_name: ' Rivera ',
    target_first_name: ' Alex ',
    target_middle_name: '  ',
    target_last_name: ' Jordan ',
    email: ' Alex@Example.COM ',
    phone_last4: '(555) 991-2481',
    county_residence: ' San Diego ',
    marriage_date: ' 2026-04-05 ',
    change_reasons: ['marriage', ' marriage ', ''],
    structured_intake: {
      spouseLastName: ' Jordan ',
      travelBookedSoon: true,
      wantsDocumentIntakeHelp: true,
      bothPartnersChangeName: true,
      employerName: ' Acme Corp ',
    },
    ...overrides,
  };
}

describe('nameChangeService normalization', () => {
  it('normalizes case input into stable, save-safe values', () => {
    const normalized = normalizeNameChangeCaseInput(makeCase());
    expect(normalized.current_first_name).toBe('Alex');
    expect(normalized.current_middle_name).toBe('Marie');
    expect(normalized.target_middle_name).toBeNull();
    expect(normalized.email).toBe('alex@example.com');
    expect(normalized.phone_last4).toBe('2481');
    expect(normalized.county_residence).toBe('San Diego');
    expect(normalized.marriage_date).toBe('2026-04-05');
    expect(normalized.change_reasons).toEqual(['marriage']);
    expect(normalized.structured_intake).toEqual({
      spouseLastName: 'Jordan',
      travelBookedSoon: true,
      wantsDocumentIntakeHelp: true,
      bothPartnersChangeName: true,
      employerName: 'Acme Corp',
    });
  });

  it('normalizes structured intake into a stable typed contract', () => {
    expect(normalizeNameChangeStructuredIntake({
      spouseLastName: ' Jordan ',
      travelBookedSoon: 1,
      wantsDocumentIntakeHelp: undefined,
      bothPartnersChangeName: 1,
      employerName: ' Acme Corp ',
      randomNoise: 'ignore me',
    } as unknown as Record<string, unknown>)).toEqual({
      spouseLastName: 'Jordan',
      travelBookedSoon: true,
      wantsDocumentIntakeHelp: true,
      bothPartnersChangeName: true,
      employerName: 'Acme Corp',
    });

    expect(normalizeNameChangeStructuredIntake(null)).toEqual({
      spouseLastName: '',
      travelBookedSoon: false,
      wantsDocumentIntakeHelp: true,
      bothPartnersChangeName: false,
      employerName: '',
    });
  });

  it('dedupes documents by kind and trims metadata', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-old',
        document_kind: 'marriage_certificate',
        display_name: '  Marriage cert  ',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
        file_name_masked: ' cert.pdf ',
        issuing_authority: ' San Diego County ',
      },
      {
        id: 'doc-final',
        document_kind: 'marriage_certificate',
        display_name: ' Final certificate ',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: ' final-cert.pdf ',
        issuing_authority: ' County Clerk ',
      },
    ];

    expect(normalizeNameChangeDocuments(documents)).toEqual([
      expect.objectContaining({
        id: 'doc-final',
        document_kind: 'marriage_certificate',
        display_name: 'Final certificate',
        file_name_masked: 'final-cert.pdf',
        issuing_authority: 'County Clerk',
      }),
    ]);
  });

  it('collapses legacy court-order aliases into one normalized document row', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-legacy',
        document_kind: 'court_order_name_change',
        display_name: '  Court order PDF  ',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
        file_name_masked: ' order.pdf ',
      },
      {
        id: 'doc-draft',
        document_kind: 'court_order',
        display_name: ' Court order ',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: ' reviewed.pdf ',
      },
    ];

    expect(normalizeNameChangeDocuments(documents)).toEqual([
      expect.objectContaining({
        id: 'doc-draft',
        document_kind: 'court_order',
        display_name: 'Court order',
        file_name_masked: 'reviewed.pdf',
      }),
    ]);
  });

  it('drops blank extracted fields and dedupes by source + key', () => {
    const fields: NameChangeExtractedFieldInput[] = [
      {
        field_key: 'spouse_last_name',
        field_label: ' Spouse last name ',
        field_value_masked: ' Jordan ',
        source_type: 'manual',
        is_verified: true,
      },
      {
        field_key: 'spouse_last_name',
        field_label: 'Spouse surname',
        field_value_masked: ' Jordan-Smith ',
        source_type: 'manual',
        is_verified: true,
      },
      {
        field_key: 'county',
        field_label: 'County',
        field_value_masked: '   ',
        source_type: 'manual',
        is_verified: false,
      },
    ];

    expect(normalizeNameChangeExtractedFields(fields)).toEqual([
      {
        document_id: null,
        field_key: 'spouse_last_name',
        field_label: 'Spouse surname',
        field_value_masked: 'Jordan-Smith',
        source_type: 'manual',
        is_verified: true,
      },
    ]);
  });

  it('canonicalizes extracted field aliases and normalized date-like values before save', () => {
    const fields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'doc-marriage',
        field_key: 'certificate no.',
        field_label: ' Certificate no. ',
        field_value_masked: ' 2026-04-05 1:30 PM PST ',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'doc-marriage',
        field_key: 'certificate_number',
        field_label: 'Certificate number',
        field_value_masked: ' NV-22 ',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'doc-order',
        field_key: 'signed dt',
        field_label: ' Signed dt ',
        field_value_masked: ' Signed date: Friday, April 5, 2026 1:30 PM PST ',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    expect(normalizeNameChangeExtractedFields(fields)).toEqual([
      {
        document_id: 'doc-marriage',
        field_key: 'certificate_number',
        field_label: 'Certificate number',
        field_value_masked: 'NV-22',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'doc-order',
        field_key: 'court_order_date',
        field_label: 'Signed dt',
        field_value_masked: '2026-04-05',
        source_type: 'document_extract',
        is_verified: true,
      },
    ]);
  });

  it('remaps extracted field document links onto freshly persisted documents', () => {
    const sourceDocuments: NameChangeDocumentInput[] = [
      {
        id: 'temp-marriage',
        document_kind: 'marriage_certificate',
        display_name: 'Marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
      {
        id: 'temp-passport',
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
    ];
    const persistedDocuments: NameChangeDocumentRecord[] = [
      {
        id: 'db-marriage',
        name_change_case_id: 'case-1',
        document_kind: 'marriage_certificate',
        display_name: 'Marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: null,
        issuing_authority: null,
        issued_on: null,
        expires_on: null,
        extraction_confidence: null,
        extracted_snapshot: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'db-passport',
        name_change_case_id: 'case-1',
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
        file_name_masked: null,
        issuing_authority: null,
        issued_on: null,
        expires_on: null,
        extraction_confidence: null,
        extracted_snapshot: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    expect(remapNameChangeExtractedFieldsToPersistedDocuments(sourceDocuments, persistedDocuments, [
      {
        document_id: 'temp-marriage',
        field_key: 'spouse_last_name',
        field_label: 'Spouse last name',
        field_value_masked: 'Jordan',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'temp-passport',
        field_key: 'issuance_date',
        field_label: 'Passport issue date',
        field_value_masked: '2024-06-01',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        field_key: 'county',
        field_label: 'County',
        field_value_masked: 'San Diego',
        source_type: 'manual',
        is_verified: true,
      },
    ])).toEqual([
      expect.objectContaining({ document_id: 'db-marriage', field_key: 'spouse_last_name' }),
      expect.objectContaining({ document_id: 'db-passport', field_key: 'issuance_date' }),
      expect.objectContaining({ document_id: null, field_key: 'county' }),
    ]);
  });

  it('exports stable name-change workspace query caps', () => {
    expect(MAX_NAME_CHANGE_DOCUMENT_ROWS).toBe(100);
    expect(MAX_NAME_CHANGE_EXTRACTED_FIELD_ROWS).toBe(500);
    expect(MAX_NAME_CHANGE_REMINDER_ROWS).toBe(100);
    expect(MAX_NAME_CHANGE_SNAPSHOT_ROWS).toBe(1);
  });

  it('keeps name-change workspace document, field, and reminder reads bounded', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/planning/nameChangeService.ts'), 'utf8');

    expect(source).toContain('MAX_NAME_CHANGE_DOCUMENT_ROWS = 100');
    expect(source).toContain('MAX_NAME_CHANGE_EXTRACTED_FIELD_ROWS = 500');
    expect(source).toContain('MAX_NAME_CHANGE_REMINDER_ROWS = 100');
    expect(source).toContain('MAX_NAME_CHANGE_SNAPSHOT_ROWS = 1');
    expect(source).toContain(".from('name_change_documents').select(NAME_CHANGE_DOCUMENT_SELECT).eq('name_change_case_id', caseId).order('created_at', { ascending: true }).limit(MAX_NAME_CHANGE_DOCUMENT_ROWS)");
    expect(source).toContain(".from('name_change_extracted_fields').select(NAME_CHANGE_EXTRACTED_FIELD_SELECT).eq('name_change_case_id', caseId).order('created_at', { ascending: true }).limit(MAX_NAME_CHANGE_EXTRACTED_FIELD_ROWS)");
    expect(source).toContain(".from('name_change_plan_snapshots').select(NAME_CHANGE_PLAN_SNAPSHOT_SELECT).eq('name_change_case_id', caseId).order('created_at', { ascending: false }).limit(MAX_NAME_CHANGE_SNAPSHOT_ROWS)");
    expect(source).toContain(".from('name_change_reminders').select(NAME_CHANGE_REMINDER_SELECT).eq('name_change_case_id', caseId).order('suggested_offset_days', { ascending: true }).limit(MAX_NAME_CHANGE_REMINDER_ROWS)");
  });

  it('routes name-change writes through RPCs instead of raw client table mutations', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/planning/nameChangeService.ts'), 'utf8');

    expect(source).toContain("supabase.rpc('name_change_case_write'");
    expect(source).toContain("supabase.rpc('name_change_documents_replace'");
    expect(source).toContain("supabase.rpc('name_change_extracted_fields_replace'");
    expect(source).toContain("supabase.rpc('name_change_plan_snapshot_write'");
    expect(source).toContain("supabase.rpc('name_change_reminders_replace'");
    expect(source).not.toContain(".from('name_change_cases')\n    .upsert(");
    expect(source).not.toContain(".from('name_change_documents').delete()");
    expect(source).not.toContain(".from('name_change_documents')\n    .insert(");
    expect(source).not.toContain(".from('name_change_extracted_fields').delete()");
    expect(source).not.toContain(".from('name_change_extracted_fields')\n    .insert(");
    expect(source).not.toContain(".from('name_change_plan_snapshots')\n    .insert(");
    expect(source).not.toContain(".from('name_change_reminders').delete()");
    expect(source).not.toContain(".from('name_change_reminders')\n    .insert(");
  });

  it('remaps legacy court-order extracted fields onto canonical persisted court-order documents', () => {
    const sourceDocuments: NameChangeDocumentInput[] = [
      {
        id: 'temp-court-order',
        document_kind: 'court_order_name_change',
        display_name: 'Court order name change',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const persistedDocuments: NameChangeDocumentRecord[] = [
      {
        id: 'db-court-order',
        name_change_case_id: 'case-1',
        document_kind: 'court_order',
        display_name: 'Court order',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: null,
        issuing_authority: null,
        issued_on: null,
        expires_on: null,
        extraction_confidence: null,
        extracted_snapshot: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    expect(remapNameChangeExtractedFieldsToPersistedDocuments(sourceDocuments, persistedDocuments, [
      {
        document_id: 'temp-court-order',
        field_key: 'case_number',
        field_label: 'Case number',
        field_value_masked: '24-CV-1188',
        source_type: 'document_extract',
        is_verified: true,
      },
    ])).toEqual([
      expect.objectContaining({ document_id: 'db-court-order', field_key: 'case_number' }),
    ]);
  });

  it('drops stale document links when a source document can no longer be matched', () => {
    expect(remapNameChangeExtractedFieldsToPersistedDocuments([], [], [
      {
        document_id: 'missing-doc',
        field_key: 'spouse_last_name',
        field_label: 'Spouse last name',
        field_value_masked: 'Jordan',
        source_type: 'document_extract',
        is_verified: true,
      },
    ])).toEqual([
      expect.objectContaining({ document_id: null, field_key: 'spouse_last_name' }),
    ]);
  });

  it('matches source documents by id when remapping extracted fields', () => {
    const sourceDocuments: NameChangeDocumentInput[] = [
      {
        id: 'temp-license',
        document_kind: 'current_drivers_license',
        display_name: 'Driver license',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const persistedDocuments: NameChangeDocumentRecord[] = [
      {
        id: 'db-license',
        name_change_case_id: 'case-1',
        document_kind: 'current_drivers_license',
        display_name: 'Driver license',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: null,
        issuing_authority: null,
        issued_on: null,
        expires_on: null,
        extraction_confidence: null,
        extracted_snapshot: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    expect(remapNameChangeExtractedFieldsToPersistedDocuments(sourceDocuments, persistedDocuments, [
      {
        document_id: 'temp-license',
        field_key: 'issuance_date',
        field_label: 'Issue date',
        field_value_masked: '2024-06-01',
        source_type: 'document_extract',
        is_verified: true,
      },
    ])).toEqual([
      expect.objectContaining({ document_id: 'db-license', field_key: 'issuance_date' }),
    ]);
  });

  it('hydrates loaded workspace through the same normalization path used for saves', () => {
    const caseRecord: NameChangeCaseRecord = {
      id: 'case-1',
      wedding_site_id: 'site-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...makeCase(),
      current_middle_name: '  Marie ',
      target_middle_name: null,
      email: ' Alex@Example.COM ',
      phone_last4: '(555) 991-2481',
      county_residence: ' San Diego ',
      marriage_state: 'California',
      marriage_date: ' 2026-04-05 ',
      latest_plan_summary: null,
    };
    const hydrated = hydrateNameChangeWorkspace({
      caseRecord,
      documents: [
        {
          id: 'doc-1',
          name_change_case_id: 'case-1',
          document_kind: 'marriage_certificate',
          display_name: '  Marriage cert  ',
          storage_mode: 'metadata_only',
          intake_status: 'reviewed',
          file_name_masked: ' cert.pdf ',
          issuing_authority: ' San Diego County ',
          issued_on: null,
          expires_on: null,
          extraction_confidence: null,
          extracted_snapshot: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      extractedFields: [
        {
          id: 'field-1',
          name_change_case_id: 'case-1',
          document_id: null,
          field_key: 'spouse_last_name',
          field_label: ' Spouse surname ',
          field_value_masked: ' Jordan ',
          source_type: 'manual',
          is_verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      latestSnapshot: null,
      reminders: [],
    });

    expect(hydrated.draft).toEqual(mapCaseRecordToNameChangeInput(caseRecord));
    expect(hydrated.documents[0]).toMatchObject({ id: 'doc-1', display_name: 'Marriage cert', file_name_masked: 'cert.pdf' });
    expect(hydrated.extractedFields[0]).toMatchObject({ field_value_masked: 'Jordan' });
    expect(hydrated.plan.summary.readinessPercent).toBeGreaterThan(0);
    expect(hydrated.reminders.length).toBeGreaterThan(0);
  });

  it('normalizes reminder inputs and dedupes by reminder key', () => {
    expect(normalizeNameChangeReminders([
      {
        reminder_key: ' reminder-banks ',
        label: '  Follow up on banks ',
        reason: '  Make sure account names match. ',
        depends_on_step_id: ' institution-banks ',
        suggested_offset_days: 4.6,
        urgency: 'medium',
        status: 'pending',
        section_key: 'institutional',
        planner_intent: 'open_execution_card',
        focus_target_id: ' execution-card-banks ',
      },
      {
        reminder_key: 'reminder-banks',
        label: 'Banks follow-up',
        reason: 'Use the better copy',
        depends_on_step_id: 'institution-banks',
        suggested_offset_days: 2,
        urgency: 'high',
        status: 'scheduled',
        section_key: 'institutional',
        planner_intent: 'open_execution_card',
        focus_target_id: 'execution-card-banks',
      },
    ])).toEqual([
      {
        reminder_key: 'reminder-banks',
        label: 'Banks follow-up',
        reason: 'Use the better copy',
        depends_on_step_id: 'institution-banks',
        suggested_offset_days: 2,
        urgency: 'high',
        status: 'scheduled',
        section_key: 'institutional',
        planner_intent: 'open_execution_card',
        focus_target_id: 'execution-card-banks',
      },
    ]);
  });

  it('maps reminder records to inputs without dropping planner routing metadata', () => {
    expect(mapReminderRecordToInput({
      id: 'reminder-row-1',
      name_change_case_id: 'case-1',
      reminder_key: 'reminder-banks',
      label: 'Follow up on Banks and credit cards',
      reason: 'Keep bank rollout moving',
      depends_on_step_id: 'institution-banks',
      suggested_offset_days: 4,
      urgency: 'medium',
      status: 'pending',
      section_key: 'institutional',
      planner_intent: 'open_execution_card',
      focus_target_id: 'execution-card-banks',
      created_at: '2026-04-24T14:00:00.000Z',
      updated_at: '2026-04-24T14:00:00.000Z',
    })).toMatchObject({
      reminder_key: 'reminder-banks',
      section_key: 'institutional',
      planner_intent: 'open_execution_card',
      focus_target_id: 'execution-card-banks',
    });
  });

  it('builds a workspace bundle with generated reminders', () => {
    const bundle = buildNameChangeWorkspaceBundle(makeCase(), [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ], []);

    expect(bundle.plan.steps.some((step) => step.id === 'institution-banks')).toBe(true);
    expect(bundle.reminders.some((reminder) => reminder.reminder_key === 'reminder-banks')).toBe(true);
  });

  it('preserves explicit reminder statuses when building a workspace bundle', () => {
    const bundle = buildNameChangeWorkspaceBundle(makeCase(), [], [], [
      {
        reminder_key: 'reminder-banks',
        label: 'Follow up on Banks and credit cards',
        reason: 'Persist this status',
        depends_on_step_id: 'institution-banks',
        suggested_offset_days: 5,
        urgency: 'medium',
        status: 'scheduled',
      },
    ]);

    expect(bundle.reminders.find((reminder) => reminder.reminder_key === 'reminder-banks')).toMatchObject({
      reminder_key: 'reminder-banks',
      status: 'scheduled',
      section_key: 'institutional',
      planner_intent: 'open_execution_card',
      focus_target_id: 'execution-card-banks',
    });
    expect(bundle.reminders.length).toBeGreaterThan(1);
  });

  it('merges generated reminders with existing statuses instead of wiping them', () => {
    expect(mergeNameChangeReminders([
      {
        reminder_key: 'reminder-banks',
        label: 'Generated banks follow-up',
        reason: 'New generated guidance',
        depends_on_step_id: 'institution-banks',
        suggested_offset_days: 5,
        urgency: 'medium',
        status: 'pending',
      },
      {
        reminder_key: 'reminder-insurance',
        label: 'Generated insurance follow-up',
        reason: 'Generated guidance',
        depends_on_step_id: 'institution-insurance',
        suggested_offset_days: 7,
        urgency: 'medium',
        status: 'pending',
      },
    ], [
      {
        reminder_key: 'reminder-banks',
        label: 'Old banks follow-up',
        reason: 'Keep my status',
        depends_on_step_id: 'institution-banks',
        suggested_offset_days: 4,
        urgency: 'high',
        status: 'dismissed',
      },
      {
        reminder_key: 'reminder-passport-followup',
        label: 'Old passport follow-up',
        reason: 'Should drop if no longer generated',
        depends_on_step_id: 'federal-passport',
        suggested_offset_days: 1,
        urgency: 'high',
        status: 'scheduled',
      },
    ])).toEqual([
      expect.objectContaining({ reminder_key: 'reminder-banks', status: 'dismissed', label: 'Generated banks follow-up' }),
      expect.objectContaining({ reminder_key: 'reminder-insurance', status: 'pending' }),
    ]);
  });

  it('keeps reminder statuses stable when planner data changes but reminder keys remain', () => {
    const initialBundle = buildNameChangeWorkspaceBundle(makeCase(), [], [], [
      {
        reminder_key: 'reminder-banks',
        label: 'Follow up on Banks and credit cards',
        reason: 'Persist this status',
        depends_on_step_id: 'institution-banks',
        suggested_offset_days: 5,
        urgency: 'medium',
        status: 'scheduled',
      },
    ]);

    const updatedBundle = buildNameChangeWorkspaceBundle(
      makeCase({ county_residence: 'Orange County' }),
      [],
      [],
      initialBundle.reminders,
    );

    expect(updatedBundle.reminders.find((reminder) => reminder.reminder_key === 'reminder-banks')).toMatchObject({
      status: 'scheduled',
    });
  });

  it('merges existing plan execution state onto regenerated plan steps', () => {
    const initialBundle = buildNameChangeWorkspaceBundle(makeCase(), [], [], []);
    const existingPlan = {
      ...initialBundle.plan,
      steps: initialBundle.plan.steps.map((step) => step.id === 'federal-ssa' ? {
        ...step,
        executionStatus: 'complete' as const,
        executionNote: 'SSA update confirmed by mail',
        executionUpdatedAt: '2026-04-18T18:00:00.000Z',
        completedAt: '2026-04-18T18:00:00.000Z',
      } : step),
    };

    const mergedPlan = mergeNameChangePlanExecutionState(initialBundle.plan, existingPlan);
    expect(mergedPlan.steps.find((step) => step.id === 'federal-ssa')).toMatchObject({
      executionStatus: 'complete',
      executionNote: 'SSA update confirmed by mail',
      completedAt: '2026-04-18T18:00:00.000Z',
    });
    expect(mergedPlan.summary.executionCounts).toMatchObject({ complete: 1 });
  });

  it('hydrates execution status from the latest snapshot when present', () => {
    const hydrated = hydrateNameChangeWorkspace({
      caseRecord: {
        id: 'case-2',
        wedding_site_id: 'site-2',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...makeCase(),
        current_middle_name: '  Marie ',
        target_middle_name: null,
        email: ' Alex@Example.COM ',
        phone_last4: '(555) 991-2481',
        county_residence: ' San Diego ',
        marriage_state: 'California',
        marriage_date: ' 2026-04-05 ',
        latest_plan_summary: null,
      },
      documents: [],
      extractedFields: [],
      latestSnapshot: {
        id: 'snapshot-1',
        name_change_case_id: 'case-2',
        engine_version: 'test',
        created_at: new Date().toISOString(),
        plan_payload: {
          ...buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan,
          steps: buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan.steps.map((step) => step.id === 'state-dmv' ? { ...step, executionStatus: 'in_progress' as const } : step),
        },
      },
      reminders: [],
    });

    expect(hydrated.plan.steps.find((step) => step.id === 'state-dmv')).toMatchObject({ executionStatus: 'in_progress' });
  });

  it('derives draft workflow status when blockers remain', () => {
    const plan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    expect(deriveNameChangeWorkflowStatus(plan)).toBe('draft');
  });

  it('derives in-progress and complete workflow states from execution progress', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ], []).plan;

    const inProgressPlan = mergeNameChangePlanExecutionState({
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa' ? { ...step, executionStatus: 'in_progress' as const } : step),
    }, basePlan);
    expect(deriveNameChangeWorkflowStatus(inProgressPlan)).toBe('in_progress');

    const completePlan = mergeNameChangePlanExecutionState({
      ...basePlan,
      steps: basePlan.steps.map((step) => step.status === 'blocked' ? step : { ...step, executionStatus: 'complete' as const }),
    }, basePlan);
    expect(deriveNameChangeWorkflowStatus(completePlan)).toBe('complete');
  });

  it('prefers explicit new execution note metadata over stale snapshot values', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const existingPlan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa' ? {
        ...step,
        executionStatus: 'in_progress' as const,
        executionNote: 'Old note',
        executionUpdatedAt: '2026-04-18T18:00:00.000Z',
      } : step),
    };
    const generatedPlan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa' ? {
        ...step,
        executionStatus: 'complete' as const,
        executionNote: 'New completion note',
        executionUpdatedAt: '2026-04-18T19:00:00.000Z',
        completedAt: '2026-04-18T19:00:00.000Z',
      } : step),
    };

    const merged = mergeNameChangePlanExecutionState(generatedPlan, existingPlan);
    expect(merged.steps.find((step) => step.id === 'federal-ssa')).toMatchObject({
      executionStatus: 'complete',
      executionNote: 'New completion note',
      executionUpdatedAt: '2026-04-18T19:00:00.000Z',
      completedAt: '2026-04-18T19:00:00.000Z',
    });
  });

  it('builds recent execution activity from updated workflow steps', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const merged = mergeNameChangePlanExecutionState({
      ...basePlan,
      steps: basePlan.steps.map((step, index) => ({
        ...step,
        executionStatus: index === 0 ? 'complete' as const : index === 1 ? 'in_progress' as const : step.executionStatus,
        executionNote: index < 2 ? `note-${index}` : step.executionNote,
        executionUpdatedAt: index < 2 ? `2026-04-18T19:0${index}:00.000Z` : step.executionUpdatedAt,
        completedAt: index === 0 ? '2026-04-18T19:00:00.000Z' : step.completedAt,
      })),
    }, basePlan);

    expect(merged.summary.recentExecutionActivity).toEqual([
      expect.objectContaining({ stepId: merged.steps[1].id, source: 'step', executionStatus: 'in_progress', note: 'note-1', timestamp: '2026-04-18T19:01:00.000Z' }),
      expect.objectContaining({ stepId: merged.steps[0].id, source: 'step', executionStatus: 'complete', note: 'note-0', timestamp: '2026-04-18T19:00:00.000Z' }),
    ]);
    expect(merged.summary.activitySourceCounts).toEqual({ step: 2, reminder: 0 });
    expect(merged.summary.latestMovementPosture).toBe('step-led');
    expect(merged.summary.dominantMovementLane).toBe('step-progress');
    expect(merged.summary.mixedMovementReason).toBeNull();
    expect(merged.summary.mixedMovementHasUntouchedRisk).toBe(false);
    expect(merged.summary.mixedMovementReminderHeavy).toBe(false);
    expect(merged.summary.reminderChurnRisk).toBe('low');
    expect(merged.summary.hasRecentCompletion).toBe(true);
    expect(merged.summary.hasRecentStart).toBe(true);
    expect(merged.summary.hasRecentUntouchedRisk).toBe(false);
    expect(merged.summary.hasZeroRecentStepMovement).toBe(false);
  });

  it('appends manual reminder activity into recent execution activity', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const updatedPlan = appendNameChangeExecutionActivity(basePlan, {
      title: 'Reminder updated: Follow up on Banks and credit cards',
      executionStatus: 'in_progress',
      note: 'Reminder status changed to scheduled',
      timestamp: '2026-04-18T20:00:00.000Z',
    });

    expect(updatedPlan.summary.recentExecutionActivity?.[0]).toMatchObject({
      stepId: null,
      source: 'reminder',
      title: 'Reminder updated: Follow up on Banks and credit cards',
      executionStatus: 'in_progress',
      note: 'Reminder status changed to scheduled',
      timestamp: '2026-04-18T20:00:00.000Z',
    });
    expect(updatedPlan.summary.activitySourceCounts).toEqual({ step: 0, reminder: 1 });
    expect(updatedPlan.summary.latestMovementPosture).toBe('reminder-led');
    expect(updatedPlan.summary.dominantMovementLane).toBe('no-step-movement');
    expect(updatedPlan.summary.mixedMovementReason).toBeNull();
    expect(updatedPlan.summary.mixedMovementHasUntouchedRisk).toBe(false);
    expect(updatedPlan.summary.mixedMovementReminderHeavy).toBe(false);
    expect(updatedPlan.summary.reminderChurnRisk).toBe('medium');
    expect(updatedPlan.summary.hasRecentCompletion).toBe(false);
    expect(updatedPlan.summary.hasRecentStart).toBe(false);
    expect(updatedPlan.summary.hasRecentUntouchedRisk).toBe(false);
    expect(updatedPlan.summary.hasZeroRecentStepMovement).toBe(true);
  });

  it('keeps invalid persisted execution activity timestamps from outranking real recent activity', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const withInvalidPersistedActivity = {
      ...basePlan,
      summary: {
        ...basePlan.summary,
        recentExecutionActivity: [
          {
            stepId: null,
            source: 'reminder' as const,
            title: 'Broken imported reminder',
            executionStatus: 'in_progress' as const,
            note: 'Imported with a bad timestamp',
            timestamp: 'not-a-date',
          },
        ],
      },
    };

    const updatedPlan = appendNameChangeExecutionActivity(withInvalidPersistedActivity, {
      title: 'Reminder updated: Follow up on Banks and credit cards',
      executionStatus: 'in_progress',
      note: 'Reminder status changed to scheduled',
      timestamp: '2026-04-18T20:00:00.000Z',
    });

    expect(updatedPlan.summary.recentExecutionActivity?.[0]).toMatchObject({
      title: 'Reminder updated: Follow up on Banks and credit cards',
      timestamp: '2026-04-18T20:00:00.000Z',
    });
    expect(updatedPlan.summary.recentExecutionActivity?.[1]).toMatchObject({
      title: 'Broken imported reminder',
      timestamp: 'not-a-date',
    });
  });

  it('marks latest movement posture as mixed when recent activity is balanced', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const planWithStep = mergeNameChangePlanExecutionState({
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa'
        ? { ...step, executionStatus: 'in_progress' as const, executionUpdatedAt: '2026-04-18T19:00:00.000Z' }
        : step),
    }, basePlan);
    const mixedPlan = appendNameChangeExecutionActivity(planWithStep, {
      title: 'Reminder updated: Follow up on Banks and credit cards',
      executionStatus: 'in_progress',
      note: 'Reminder status changed to scheduled',
      timestamp: '2026-04-18T20:00:00.000Z',
    });

    expect(mixedPlan.summary.activitySourceCounts).toEqual({ step: 1, reminder: 1 });
    expect(mixedPlan.summary.latestMovementPosture).toBe('mixed');
    expect(mixedPlan.summary.dominantMovementLane).toBe('mixed');
    expect(mixedPlan.summary.mixedMovementReason).toBe('step-reminder-balance');
    expect(mixedPlan.summary.mixedMovementHasUntouchedRisk).toBe(false);
    expect(mixedPlan.summary.mixedMovementReminderHeavy).toBe(false);
    expect(mixedPlan.summary.reminderChurnRisk).toBe('low');
    expect(mixedPlan.summary.hasRecentCompletion).toBe(false);
    expect(mixedPlan.summary.hasRecentStart).toBe(true);
    expect(mixedPlan.summary.hasRecentUntouchedRisk).toBe(false);
    expect(mixedPlan.summary.hasZeroRecentStepMovement).toBe(false);
  });

  it('marks recent activity as start-led when starts dominate the latest window', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const startPlan = mergeNameChangePlanExecutionState({
      ...basePlan,
      steps: basePlan.steps.map((step, index) => index < 2
        ? { ...step, executionStatus: 'in_progress' as const, executionUpdatedAt: `2026-04-18T19:0${index}:00.000Z` }
        : step),
    }, basePlan);

    expect(startPlan.summary.dominantMovementLane).toBe('start-led');
  });

  it('flags high reminder churn when recent activity is dominated by reminder actions', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const churnPlan = [1, 2, 3, 4].reduce((plan, index) => appendNameChangeExecutionActivity(plan, {
      title: `Reminder updated ${index}`,
      executionStatus: 'in_progress',
      note: `Reminder status changed ${index}`,
      timestamp: `2026-04-18T20:0${index}:00.000Z`,
    }), basePlan);

    expect(churnPlan.summary.activitySourceCounts).toEqual({ step: 0, reminder: 4 });
    expect(churnPlan.summary.latestMovementPosture).toBe('reminder-led');
    expect(churnPlan.summary.dominantMovementLane).toBe('no-step-movement');
    expect(churnPlan.summary.mixedMovementReason).toBeNull();
    expect(churnPlan.summary.mixedMovementHasUntouchedRisk).toBe(false);
    expect(churnPlan.summary.mixedMovementReminderHeavy).toBe(false);
    expect(churnPlan.summary.reminderChurnRisk).toBe('high');
    expect(churnPlan.summary.hasRecentCompletion).toBe(false);
    expect(churnPlan.summary.hasRecentStart).toBe(false);
    expect(churnPlan.summary.hasRecentUntouchedRisk).toBe(false);
    expect(churnPlan.summary.hasZeroRecentStepMovement).toBe(true);
  });

  it('flags untouched risk when recent activity still contains todo step entries', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const todoWindowPlan = mergeNameChangePlanExecutionState({
      ...basePlan,
      steps: basePlan.steps.map((step, index) => index === 0
        ? { ...step, executionStatus: 'todo' as const, executionUpdatedAt: '2026-04-18T20:00:00.000Z' }
        : step),
    }, basePlan);

    expect(todoWindowPlan.summary.hasRecentUntouchedRisk).toBe(true);
    expect(todoWindowPlan.summary.hasZeroRecentStepMovement).toBe(false);
    expect(todoWindowPlan.summary.dominantMovementLane).toBe('step-progress');
    expect(todoWindowPlan.summary.mixedMovementReason).toBeNull();
    expect(todoWindowPlan.summary.mixedMovementHasUntouchedRisk).toBe(false);
    expect(todoWindowPlan.summary.mixedMovementReminderHeavy).toBe(false);
  });

  it('marks recent activity as completion-led when completions dominate the latest window', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const completionPlan = mergeNameChangePlanExecutionState({
      ...basePlan,
      steps: basePlan.steps.map((step, index) => index < 2
        ? { ...step, executionStatus: 'complete' as const, executionUpdatedAt: `2026-04-18T19:0${index}:00.000Z`, completedAt: `2026-04-18T19:0${index}:00.000Z` }
        : step),
    }, basePlan);

    expect(completionPlan.summary.dominantMovementLane).toBe('completion-led');
    expect(completionPlan.summary.mixedMovementReason).toBeNull();
    expect(completionPlan.summary.mixedMovementHasUntouchedRisk).toBe(false);
    expect(completionPlan.summary.mixedMovementReminderHeavy).toBe(false);
  });

  it('recomputes execution tracks and milestones from ordered step progress', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const progressedPlan = mergeNameChangePlanExecutionState({
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'eligibility-proof'
        ? {
          ...step,
          status: 'ready' as const,
          executionStatus: 'complete' as const,
          executionUpdatedAt: '2026-04-18T19:00:00.000Z',
          completedAt: '2026-04-18T19:00:00.000Z',
        }
        : step.id === 'federal-ssa'
          ? {
            ...step,
            status: 'ready' as const,
            executionStatus: 'in_progress' as const,
            executionUpdatedAt: '2026-04-18T19:05:00.000Z',
          }
          : step.id === 'state-dmv'
            ? {
              ...step,
              status: 'ready' as const,
              executionStatus: 'todo' as const,
            }
            : step,
      ),
    }, basePlan);

    expect(progressedPlan.summary.executionTracks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'track-legal-proof', status: 'complete' }),
        expect.objectContaining({ id: 'track-ssa', status: 'in_progress' }),
        expect.objectContaining({ id: 'track-photo-id', status: 'in_progress' }),
        expect.objectContaining({ id: 'track-rollout', status: 'upcoming' }),
      ]),
    );
    expect(progressedPlan.summary.milestoneChecklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'milestone-legal-proof', status: 'complete' }),
        expect.objectContaining({ id: 'milestone-ssa', status: 'in_progress' }),
        expect.objectContaining({ id: 'milestone-photo-id', status: 'in_progress' }),
        expect.objectContaining({ id: 'milestone-account-rollout', status: 'upcoming' }),
      ]),
    );
    expect(progressedPlan.summary.institutionCategoryCoverage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'legal_government', status: 'blocked' }),
        expect.objectContaining({ id: 'financial', status: 'blocked' }),
        expect.objectContaining({ id: 'travel_mobility', status: 'blocked' }),
      ]),
    );
  });

  it('explains mixed movement when both starts and completions are present without dominance', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const mixedStepPlan = mergeNameChangePlanExecutionState({
      ...basePlan,
      steps: basePlan.steps.map((step, index) => index === 0
        ? { ...step, executionStatus: 'complete' as const, executionUpdatedAt: '2026-04-18T19:00:00.000Z', completedAt: '2026-04-18T19:00:00.000Z' }
        : index === 1
          ? { ...step, executionStatus: 'in_progress' as const, executionUpdatedAt: '2026-04-18T19:01:00.000Z' }
          : step),
    }, basePlan);

    expect(mixedStepPlan.summary.dominantMovementLane).toBe('step-progress');
    const reminderMixed = appendNameChangeExecutionActivity(mixedStepPlan, {
      title: 'Reminder updated: Follow up on Banks and credit cards',
      executionStatus: 'in_progress',
      note: 'Reminder status changed to scheduled',
      timestamp: '2026-04-18T20:00:00.000Z',
    });
    const balancedMixed = appendNameChangeExecutionActivity(reminderMixed, {
      title: 'Reminder updated: Follow up on Health, auto, renters, and life insurance',
      executionStatus: 'in_progress',
      note: 'Reminder status changed to scheduled',
      timestamp: '2026-04-18T20:01:00.000Z',
    });

    expect(balancedMixed.summary.dominantMovementLane).toBe('mixed');
    expect(balancedMixed.summary.mixedMovementReason).toBe('starts-and-completions');
    expect(balancedMixed.summary.mixedMovementHasUntouchedRisk).toBe(false);
    expect(balancedMixed.summary.mixedMovementReminderHeavy).toBe(false);
  });

  it('marks mixed movement as still carrying untouched risk when todo step entries are in the latest mixed window', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const stepTodoPlan = mergeNameChangePlanExecutionState({
      ...basePlan,
      steps: basePlan.steps.map((step, index) => index === 0
        ? { ...step, executionStatus: 'todo' as const, executionUpdatedAt: '2026-04-18T19:00:00.000Z' }
        : index === 1
          ? { ...step, executionStatus: 'in_progress' as const, executionUpdatedAt: '2026-04-18T19:01:00.000Z' }
          : step),
    }, basePlan);
    const firstReminderMixed = appendNameChangeExecutionActivity(stepTodoPlan, {
      title: 'Reminder updated: Follow up on Banks and credit cards',
      executionStatus: 'in_progress',
      note: 'Reminder status changed to scheduled',
      timestamp: '2026-04-18T20:00:00.000Z',
    });
    const mixed = appendNameChangeExecutionActivity(firstReminderMixed, {
      title: 'Reminder updated: Follow up on Health, auto, renters, and life insurance',
      executionStatus: 'in_progress',
      note: 'Reminder status changed to scheduled',
      timestamp: '2026-04-18T20:01:00.000Z',
    });

    expect(mixed.summary.dominantMovementLane).toBe('mixed');
    expect(mixed.summary.mixedMovementReason).toBe('step-reminder-balance');
    expect(mixed.summary.mixedMovementHasUntouchedRisk).toBe(true);
    expect(mixed.summary.mixedMovementReminderHeavy).toBe(false);
  });

  it('appends bulk reminder activity into recent execution activity', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const updatedPlan = appendNameChangeExecutionActivity(basePlan, {
      title: 'Bulk reminder update (2)',
      executionStatus: 'in_progress',
      note: 'Follow up on Banks and credit cards → scheduled · Follow up on Health, auto, renters, and life insurance → scheduled',
      timestamp: '2026-04-18T20:05:00.000Z',
    });

    expect(updatedPlan.summary.recentExecutionActivity?.[0]).toMatchObject({
      stepId: null,
      source: 'reminder',
      title: 'Bulk reminder update (2)',
      executionStatus: 'in_progress',
      timestamp: '2026-04-18T20:05:00.000Z',
    });
  });

  it('can append a stale-reminder scheduling activity label distinctly', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const updatedPlan = appendNameChangeExecutionActivity(basePlan, {
      title: 'Scheduled stale reminders (2)',
      executionStatus: 'in_progress',
      note: 'Follow up on Banks and credit cards → scheduled · Follow up on Health, auto, renters, and life insurance → scheduled',
      timestamp: '2026-04-18T20:06:00.000Z',
    });

    expect(updatedPlan.summary.recentExecutionActivity?.[0]).toMatchObject({
      source: 'reminder',
      title: 'Scheduled stale reminders (2)',
      timestamp: '2026-04-18T20:06:00.000Z',
    });
  });

  it('annotates dependent plan steps when reminder statuses change', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const updatedPlan = annotateNameChangePlanStepsFromReminderChanges(basePlan, [
      {
        label: 'Follow up on Banks and credit cards',
        depends_on_step_id: 'institution-banks',
        status: 'scheduled',
      },
    ], '2026-04-18T20:10:00.000Z');

    expect(updatedPlan.steps.find((step) => step.id === 'institution-banks')).toMatchObject({
      executionStatus: 'in_progress',
      executionNote: expect.stringContaining('Follow up on Banks and credit cards reminder → scheduled'),
      executionUpdatedAt: '2026-04-18T20:10:00.000Z',
    });
  });

  it('replaces prior reminder annotation fragments instead of endlessly appending them', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const firstPass = annotateNameChangePlanStepsFromReminderChanges({
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'institution-banks'
        ? { ...step, executionNote: 'Called SSA already · Follow up on Banks and credit cards reminder → pending' }
        : step),
    }, [
      {
        label: 'Follow up on Banks and credit cards',
        depends_on_step_id: 'institution-banks',
        status: 'scheduled',
      },
    ], '2026-04-18T20:15:00.000Z');

    expect(firstPass.steps.find((step) => step.id === 'institution-banks')).toMatchObject({
      executionStatus: 'in_progress',
      executionNote: 'Called SSA already · Follow up on Banks and credit cards reminder → scheduled',
      executionUpdatedAt: '2026-04-18T20:15:00.000Z',
    });
  });

  it('does not downgrade already-in-progress steps when reminder changes come through', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const updatedPlan = annotateNameChangePlanStepsFromReminderChanges({
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'institution-banks'
        ? { ...step, executionStatus: 'complete' as const, executionNote: 'Bank updated already' }
        : step),
    }, [
      {
        label: 'Follow up on Banks and credit cards',
        depends_on_step_id: 'institution-banks',
        status: 'scheduled',
      },
    ], '2026-04-18T20:20:00.000Z');

    expect(updatedPlan.steps.find((step) => step.id === 'institution-banks')).toMatchObject({
      executionStatus: 'complete',
      executionUpdatedAt: '2026-04-18T20:20:00.000Z',
    });
  });

  it('does not refresh step touch timestamps for dismissal-only reminder changes', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const updatedPlan = annotateNameChangePlanStepsFromReminderChanges({
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'institution-banks'
        ? { ...step, executionStatus: 'in_progress' as const, executionUpdatedAt: '2026-04-18T20:00:00.000Z' }
        : step),
    }, [
      {
        label: 'Follow up on Banks and credit cards',
        depends_on_step_id: 'institution-banks',
        status: 'dismissed',
      },
    ], '2026-04-18T21:00:00.000Z');

    expect(updatedPlan.steps.find((step) => step.id === 'institution-banks')).toMatchObject({
      executionStatus: 'in_progress',
      executionUpdatedAt: '2026-04-18T20:00:00.000Z',
      executionNote: 'Follow up on Banks and credit cards reminder → dismissed',
    });
  });

  it('marks dependent steps complete when reminder changes are sent', () => {
    const basePlan = buildNameChangeWorkspaceBundle(makeCase(), [], [], []).plan;
    const updatedPlan = annotateNameChangePlanStepsFromReminderChanges({
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'institution-banks'
        ? { ...step, executionStatus: 'in_progress' as const, executionUpdatedAt: '2026-04-18T20:00:00.000Z' }
        : step),
    }, [
      {
        label: 'Follow up on Banks and credit cards',
        depends_on_step_id: 'institution-banks',
        status: 'sent',
      },
    ], '2026-04-18T21:30:00.000Z');

    expect(updatedPlan.steps.find((step) => step.id === 'institution-banks')).toMatchObject({
      executionStatus: 'complete',
      executionUpdatedAt: '2026-04-18T21:30:00.000Z',
      completedAt: '2026-04-18T21:30:00.000Z',
      executionNote: 'Follow up on Banks and credit cards reminder → sent',
    });
  });
});
