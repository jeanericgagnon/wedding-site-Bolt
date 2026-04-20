import { describe, expect, it } from 'vitest';
import { buildNameChangeSsaExecutionSnapshot } from './ssaFlow';
import type { NameChangeCaseInput, NameChangeDocumentInput, NameChangeExtractedFieldInput } from './types';

function makeCase(overrides: Partial<NameChangeCaseInput> = {}): NameChangeCaseInput {
  return {
    workflow_status: 'draft',
    launch_state: 'california',
    legal_basis: 'marriage',
    current_first_name: 'Alex',
    current_middle_name: 'Marie',
    current_last_name: 'Rivera',
    target_first_name: 'Alex',
    target_middle_name: 'Marie',
    target_last_name: 'Jordan',
    email: null,
    phone_last4: null,
    county_residence: 'San Diego',
    marriage_state: 'California',
    marriage_date: '2026-04-05',
    urgency_level: 'standard',
    has_us_passport: true,
    passport_needs_update: true,
    has_real_id_license: true,
    is_us_citizen: true,
    employment_status: 'employed',
    change_reasons: ['marriage'],
    structured_intake: {
      spouseLastName: 'Jordan',
      travelBookedSoon: false,
      wantsDocumentIntakeHelp: true,
    },
    latest_plan_summary: null,
    ...overrides,
  };
}

describe('name change SSA execution snapshot', () => {
  it('marks SSA execution ready when core proof + identity inputs exist', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
      {
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        field_key: 'spouse_last_name',
        field_label: 'Spouse last name',
        field_value_masked: 'Jordan',
        source_type: 'manual',
        is_verified: true,
      },
    ];

    const snapshot = buildNameChangeSsaExecutionSnapshot(makeCase(), documents, extractedFields);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.recommendedFormCode).toBe('SSA-SS5');
    expect(snapshot.checklist.find((item) => item.label === 'Legal proof ready for SSA')).toMatchObject({ status: 'ready' });
  });

  it('surfaces blockers when legal proof and identity coverage are missing', () => {
    const snapshot = buildNameChangeSsaExecutionSnapshot(makeCase({ current_first_name: '', current_last_name: '' }), [], []);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.blockers.length).toBeGreaterThan(0);
    expect(snapshot.checklist.find((item) => item.label === 'Legal proof ready for SSA')).toMatchObject({ status: 'missing' });
    expect(snapshot.checklist.find((item) => item.label === 'Identity document coverage')).toMatchObject({ status: 'missing' });
  });
});
