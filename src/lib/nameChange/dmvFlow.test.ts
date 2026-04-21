import { describe, expect, it } from 'vitest';
import { buildNameChangeDmvExecutionSnapshot } from './dmvFlow';
import { buildNameChangePlan } from './engine';
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

describe('name change DMV execution snapshot', () => {
  it('marks DMV execution ready when proof + county + support docs exist', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'marriage-certificate-•••.pdf',
        issuing_authority: 'San Diego County Clerk',
        issued_on: '2026-04-05',
        extraction_confidence: 0.97,
      },
      {
        document_kind: 'current_drivers_license',
        display_name: 'Driver license',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
        file_name_masked: 'license-•••.pdf',
        issuing_authority: 'California DMV',
        issued_on: '2025-08-01',
        expires_on: '2030-08-01',
        extraction_confidence: 0.9,
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        field_key: 'county',
        field_label: 'County',
        field_value_masked: 'San Diego',
        source_type: 'manual',
        is_verified: true,
      },
      {
        field_key: 'spouse_last_name',
        field_label: 'Spouse last name',
        field_value_masked: 'Jordan',
        source_type: 'manual',
        is_verified: true,
      },
    ];

    const basePlan = buildNameChangePlan({ profile: makeCase(), documents, extractedFields });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa'
        ? { ...step, executionStatus: 'complete' as const }
        : step),
    };

    const snapshot = buildNameChangeDmvExecutionSnapshot(makeCase(), documents, extractedFields, plan);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.recommendedFormCode).toBe('CA-DL-44');
    expect(snapshot.checklist.find((item) => item.label === 'Legal proof ready for DMV')).toMatchObject({ status: 'ready' });
  });

  it('surfaces blockers when county context and core fields are missing', () => {
    const snapshot = buildNameChangeDmvExecutionSnapshot(makeCase({ county_residence: null, current_first_name: '', current_last_name: '' }), [], []);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.blockers.length).toBeGreaterThan(0);
    expect(snapshot.checklist.find((item) => item.label === 'California county context available')).toMatchObject({ status: 'missing' });
    expect(snapshot.checklist.find((item) => item.label === 'Current legal name available for DMV prep')).toMatchObject({ status: 'missing' });
  });
});
