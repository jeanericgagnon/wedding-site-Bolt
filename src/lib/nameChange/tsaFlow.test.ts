import { describe, expect, it } from 'vitest';
import { buildNameChangeTsaExecutionSnapshot } from './tsaFlow';
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
      travelBookedSoon: true,
      wantsDocumentIntakeHelp: true,
    },
    latest_plan_summary: null,
    ...overrides,
  };
}

describe('name change TSA execution snapshot', () => {
  it('marks TSA update ready when passport work is underway and travel-profile docs exist', () => {
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
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
        file_name_masked: 'passport-•••.pdf',
        issuing_authority: 'U.S. Department of State',
        issued_on: '2024-06-01',
        expires_on: '2034-06-01',
        extraction_confidence: 0.92,
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        field_key: 'issuance_date',
        field_label: 'Passport issue date',
        field_value_masked: '2024-06-01',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];
    const basePlan = buildNameChangePlan({ profile: makeCase(), documents, extractedFields });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-passport'
        ? { ...step, executionStatus: 'in_progress' as const }
        : step),
    };

    const snapshot = buildNameChangeTsaExecutionSnapshot(makeCase(), documents, extractedFields, plan);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.recommendedFormCode).toBe('TSA-TRAVEL-PROFILE-UPDATE');
    expect(snapshot.sequence.dependencies.find((dependency) => dependency.key === 'passport-progress')).toMatchObject({ status: 'satisfied' });
  });

  it('blocks TSA update when passport work has not started', () => {
    const snapshot = buildNameChangeTsaExecutionSnapshot(makeCase(), [], []);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.blockers).toContain('TSA / travel profiles should wait until passport work is underway so bookings and identity records stay aligned.');
    expect(snapshot.sequence.dependencies.find((dependency) => dependency.key === 'passport-progress')).toMatchObject({ status: 'missing' });
  });

  it('blocks TSA update when travel is booked soon but no travel identity support is represented', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const basePlan = buildNameChangePlan({ profile: makeCase(), documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-passport'
        ? { ...step, executionStatus: 'in_progress' as const }
        : step),
    };

    const snapshot = buildNameChangeTsaExecutionSnapshot(makeCase(), documents, [], plan);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.blockers).toContain('Travel is already booked, but no current passport or Real ID support is represented in intake yet.');
  });

  it('keeps expedited travel TSA cases on the fast path as attention, not routine satisfied', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
        file_name_masked: 'passport-•••.pdf',
        issuing_authority: 'U.S. Department of State',
        issued_on: '2024-06-01',
        expires_on: '2034-06-01',
        extraction_confidence: 0.92,
      },
    ];
    const profile = makeCase({
      urgency_level: 'expedited',
      structured_intake: {
        spouseLastName: 'Jordan',
        travelBookedSoon: true,
        wantsDocumentIntakeHelp: true,
      },
    });
    const basePlan = buildNameChangePlan({ profile, documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-passport'
        ? { ...step, executionStatus: 'in_progress' as const }
        : step),
    };

    const snapshot = buildNameChangeTsaExecutionSnapshot(profile, documents, [], plan);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.checklist.find((item) => item.key === 'expedited-travel-sequencing')).toMatchObject({ status: 'attention' });
  });

  it('blocks TSA update when passport eligibility path is not modeled for the case', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
    ];
    const basePlan = buildNameChangePlan({ profile: makeCase({ is_us_citizen: false }), documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-passport'
        ? { ...step, executionStatus: 'in_progress' as const }
        : step),
    };

    const snapshot = buildNameChangeTsaExecutionSnapshot(makeCase({ is_us_citizen: false }), documents, [], plan);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.blockers).toContain('Current passport follow-through is not modeled for non-citizen or passport-ineligible cases yet.');
  });

  it('blocks TSA update when out-of-state marriage handling has no certificate intake support', () => {
    const profile = makeCase({ marriage_state: 'Nevada' });
    const basePlan = buildNameChangePlan({ profile, documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-passport'
        ? { ...step, executionStatus: 'in_progress' as const }
        : step),
    };

    const snapshot = buildNameChangeTsaExecutionSnapshot(profile, [], [], plan);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.blockers).toContain('Marriage occurred in Nevada, but no marriage certificate is represented in intake for out-of-state certificate handling.');
    expect(snapshot.checklist.find((item) => item.key === 'marriage-jurisdiction-alignment')).toMatchObject({ status: 'missing' });
  });
});
