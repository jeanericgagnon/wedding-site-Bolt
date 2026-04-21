import { describe, expect, it } from 'vitest';
import { buildNameChangePassportExecutionSnapshot } from './passportFlow';
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

describe('name change passport execution snapshot', () => {
  it('marks passport execution ready when legal proof, identity support, and SSA progress exist', () => {
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
        ? { ...step, executionStatus: 'in_progress' as const }
        : step),
    };

    const snapshot = buildNameChangePassportExecutionSnapshot(makeCase(), documents, extractedFields, plan);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.recommendedFormCode).toBe('DS-82');
    expect(snapshot.checklist.find((item) => item.label === 'Passport timing risk reviewed')).toMatchObject({ status: 'ready' });
  });

  it('surfaces blockers when SSA has not started and citizenship is out of scope', () => {
    const snapshot = buildNameChangePassportExecutionSnapshot(makeCase({ is_us_citizen: false }), [], []);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.blockers).toContain('Current modeled passport flow assumes U.S. citizenship eligibility.');
    expect(snapshot.sequence.dependencies.find((dependency) => dependency.key === 'federal-ssa-progress')).toMatchObject({ status: 'missing' });
  });

  it('surfaces the unmodeled passport eligibility path for non-citizen cases', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
    ];

    const snapshot = buildNameChangePassportExecutionSnapshot(makeCase({ is_us_citizen: false }), documents, []);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.blockers).toContain('Current passport follow-through is not modeled for non-citizen or passport-ineligible cases yet.');
    expect(snapshot.checklist.find((item) => item.key === 'passport-eligibility-path')).toMatchObject({ status: 'missing' });
  });

  it('blocks passport execution when travel is booked soon but no travel identity support is in intake', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const profile = makeCase({
      structured_intake: {
        spouseLastName: 'Jordan',
        travelBookedSoon: true,
        wantsDocumentIntakeHelp: true,
      },
    });
    const basePlan = buildNameChangePlan({ profile, documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa'
        ? { ...step, executionStatus: 'in_progress' as const }
        : step),
    };

    const snapshot = buildNameChangePassportExecutionSnapshot(profile, documents, [], plan);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.blockers).toContain('Travel is already booked, but no current passport or Real ID support is represented in intake yet.');
  });

  it('keeps expedited travel passport cases on the fast path as attention, not routine satisfied', () => {
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
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa'
        ? { ...step, executionStatus: 'in_progress' as const }
        : step),
    };

    const snapshot = buildNameChangePassportExecutionSnapshot(profile, documents, [], plan);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.checklist.find((item) => item.key === 'expedited-travel-sequencing')).toMatchObject({ status: 'attention' });
  });
});
