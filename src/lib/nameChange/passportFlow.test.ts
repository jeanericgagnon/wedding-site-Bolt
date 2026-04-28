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
    expect(snapshot.nextAction).toMatchObject({
      category: 'dependency',
      label: 'Route non-U.S. passport follow-through',
    });
  });

  it('holds first-passport cases on an eligibility review branch instead of marking the path clear', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
      {
        document_kind: 'birth_certificate',
        display_name: 'Birth certificate',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
    ];
    const profile = makeCase({ has_us_passport: false, passport_needs_update: true });
    const basePlan = buildNameChangePlan({ profile, documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa'
        ? { ...step, executionStatus: 'in_progress' as const }
        : step),
    };

    const snapshot = buildNameChangePassportExecutionSnapshot(profile, documents, [], plan);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.recommendedFormCode).toBe('DS-11');
    expect(snapshot.blockers).toContain('Passport follow-through is on a first-passport branch, so confirm DS-11 eligibility and supporting proof before treating it like a standard update path.');
    expect(snapshot.checklist.find((item) => item.key === 'passport-eligibility-path')).toMatchObject({ status: 'attention' });
    expect(snapshot.nextAction).toMatchObject({
      category: 'review',
      label: 'Confirm first-passport eligibility path',
    });
  });

  it('blocks first-passport cases on citizenship-proof intake before the DS-11 branch is treated as grounded', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const profile = makeCase({ has_us_passport: false, passport_needs_update: true });

    const snapshot = buildNameChangePassportExecutionSnapshot(profile, documents, []);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.recommendedFormCode).toBe('DS-11');
    expect(snapshot.blockers).toContain('First-passport follow-through needs citizenship proof in intake before the DS-11 branch can actually run.');
    expect(snapshot.blockers).toContain('First-passport follow-through needs citizenship proof in intake before the DS-11 path can be grounded.');
    expect(snapshot.checklist.find((item) => item.key === 'passport-eligibility-path')).toMatchObject({ status: 'missing' });
    expect(snapshot.checklist.find((item) => item.key === 'passport-support-doc')).toMatchObject({ status: 'missing' });
    expect(snapshot.nextAction).toMatchObject({
      category: 'document',
      label: 'Add citizenship proof for first-passport branch',
      documentKind: 'birth_certificate',
    });
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

  it('blocks passport execution when out-of-state marriage handling has no certificate intake support', () => {
    const profile = makeCase({ marriage_state: 'Nevada' });
    const basePlan = buildNameChangePlan({ profile, documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa'
        ? { ...step, executionStatus: 'in_progress' as const }
        : step),
    };

    const snapshot = buildNameChangePassportExecutionSnapshot(profile, [], [], plan);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.blockers).toContain('Marriage occurred in Nevada, but no marriage certificate is represented in intake for out-of-state certificate handling.');
    expect(snapshot.checklist.find((item) => item.key === 'marriage-jurisdiction-alignment')).toMatchObject({ status: 'missing' });
  });

  it('blocks passport execution when out-of-state marriage certificate grounding is still missing', () => {
    const profile = makeCase({ marriage_state: 'Nevada' });
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-marriage',
        document_kind: 'marriage_certificate',
        display_name: 'Marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const basePlan = buildNameChangePlan({ profile, documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa'
        ? { ...step, executionStatus: 'in_progress' as const }
        : step),
    };

    const snapshot = buildNameChangePassportExecutionSnapshot(profile, documents, [], plan);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.blockers).toContain('Marriage certificate is present, but no grounded county, certificate-number extraction, or issuing-authority metadata is represented yet for out-of-state follow-through.');
    expect(snapshot.checklist.find((item) => item.key === 'out-of-state-marriage-certificate-grounding')).toMatchObject({ status: 'missing' });
  });
});
