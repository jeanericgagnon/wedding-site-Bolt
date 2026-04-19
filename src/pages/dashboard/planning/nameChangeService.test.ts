import { describe, expect, it } from 'vitest';
import type { NameChangeCaseInput, NameChangeCaseRecord, NameChangeDocumentInput, NameChangeExtractedFieldInput } from '../../../lib/nameChange/types';
import {
  buildNameChangeWorkspaceBundle,
  defaultNameChangeCaseInput,
  hydrateNameChangeWorkspace,
  mapCaseRecordToNameChangeInput,
  normalizeNameChangeReminders,
  normalizeNameChangeCaseInput,
  normalizeNameChangeDocuments,
  normalizeNameChangeExtractedFields,
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
      travelBookedSoon: 1,
      wantsDocumentIntakeHelp: undefined,
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
    expect(normalized.structured_intake).toMatchObject({
      spouseLastName: 'Jordan',
      travelBookedSoon: true,
      wantsDocumentIntakeHelp: true,
    });
  });

  it('dedupes documents by kind and trims metadata', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: '  Marriage cert  ',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
        file_name_masked: ' cert.pdf ',
        issuing_authority: ' San Diego County ',
      },
      {
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
        document_kind: 'marriage_certificate',
        display_name: 'Final certificate',
        file_name_masked: 'final-cert.pdf',
        issuing_authority: 'County Clerk',
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
          intake_status: 'uploaded',
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
    expect(hydrated.documents[0]).toMatchObject({ display_name: 'Marriage cert', file_name_masked: 'cert.pdf' });
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
      },
      {
        reminder_key: 'reminder-banks',
        label: 'Banks follow-up',
        reason: 'Use the better copy',
        depends_on_step_id: 'institution-banks',
        suggested_offset_days: 2,
        urgency: 'high',
        status: 'scheduled',
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
      },
    ]);
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

    expect(bundle.reminders).toEqual([
      expect.objectContaining({ reminder_key: 'reminder-banks', status: 'scheduled' }),
    ]);
  });
});
