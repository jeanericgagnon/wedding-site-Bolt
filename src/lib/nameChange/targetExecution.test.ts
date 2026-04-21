import { describe, expect, it } from 'vitest';
import { buildNameChangeTargetExecutionSnapshot } from './targetExecution';
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

describe('name change target execution snapshot', () => {
  it('builds shared SSA execution snapshots with form payload + checklist', () => {
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
    ];

    const snapshot = buildNameChangeTargetExecutionSnapshot('ssa', makeCase(), documents, []);
    expect(snapshot.targetLabel).toContain('Social Security');
    expect(snapshot.recommendedFormCode).toBe('SSA-SS5');
    expect(snapshot.formPayload.formCode).toBe('SSA-SS5');
    expect(snapshot.checklist.length).toBeGreaterThan(0);
    expect(snapshot.readinessSummary.status).toBe('blocked');
  });

  it('blocks execution-ready posture when packet fields are still low confidence', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        field_key: 'spouse_last_name',
        field_label: 'Spouse last name',
        field_value_masked: 'Jordan-Smith',
        source_type: 'manual',
        is_verified: true,
      },
    ];

    const snapshot = buildNameChangeTargetExecutionSnapshot('ssa', makeCase(), documents, extractedFields);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.blockers).toContain('New last name is populated from a low-confidence source and still needs stronger document support.');
    expect(snapshot.formPayload.summary.lowConfidence).toBeGreaterThan(0);
    expect(snapshot.fieldRisks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        fieldKey: 'applicant.newLastName',
        label: 'New last name',
        severity: 'blocking',
        confidence: 'low',
      }),
    ]));
    expect(snapshot.readinessSummary).toMatchObject({
      status: 'blocked',
      blockingFieldRisks: expect.any(Number),
      lowConfidenceFields: expect.any(Number),
      documentRepairDebt: expect.any(Number),
    });
  });

  it('surfaces missing packet fields as attention-level field risks', () => {
    const snapshot = buildNameChangeTargetExecutionSnapshot('dmv', makeCase({ current_first_name: '', current_last_name: '' }), [], []);
    expect(snapshot.fieldRisks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        severity: 'attention',
      }),
    ]));
    expect(snapshot.readinessSummary).toMatchObject({
      attentionFieldRisks: expect.any(Number),
      missingFields: expect.any(Number),
    });
  });

  it('builds shared DMV execution snapshots with sequencing awareness', () => {
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
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa' ? { ...step, executionStatus: 'complete' as const } : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('dmv', makeCase(), documents, [], plan);
    expect(snapshot.targetLabel).toContain('DMV');
    expect(snapshot.recommendedFormCode).toBe('CA-DL-44');
    expect(snapshot.sequence.dependencies.find((dependency) => dependency.key === 'federal-ssa-progress')).toMatchObject({ status: 'satisfied' });
  });

  it('builds shared passport execution snapshots with dynamic form selection', () => {
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
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa'
        ? { ...step, executionStatus: 'in_progress' as const }
        : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('passport', makeCase(), documents, extractedFields, plan);
    expect(snapshot.targetLabel).toContain('Passport');
    expect(snapshot.recommendedFormCode).toBe('DS-82');
    expect(snapshot.sequence.dependencies.find((dependency) => dependency.key === 'federal-ssa-progress')).toMatchObject({ status: 'satisfied' });
  });

  it('builds shared employer execution snapshots with institutional gating', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
      {
        document_kind: 'current_drivers_license',
        display_name: 'Driver license',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
    ];
    const basePlan = buildNameChangePlan({ profile: makeCase(), documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa'
        ? { ...step, executionStatus: 'complete' as const }
        : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('employer', makeCase(), documents, [], plan);
    expect(snapshot.targetLabel).toContain('Employer');
    expect(snapshot.recommendedFormCode).toBe('EMPLOYER-HR-PACKET');
    expect(snapshot.sequence.dependencies.find((dependency) => dependency.key === 'employment-context')).toMatchObject({ status: 'satisfied' });
  });

  it('builds shared bank execution snapshots with primary-id gating', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
      {
        document_kind: 'current_drivers_license',
        display_name: 'Driver license',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
      {
        document_kind: 'proof_of_address',
        display_name: 'Proof of address',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
    ];
    const basePlan = buildNameChangePlan({ profile: makeCase(), documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'state-dmv'
        ? { ...step, executionStatus: 'in_progress' as const }
        : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('banks', makeCase(), documents, [], plan);
    expect(snapshot.targetLabel).toContain('Banks');
    expect(snapshot.recommendedFormCode).toBe('BANK-ACCOUNT-UPDATE-PACKET');
    expect(snapshot.sequence.dependencies.find((dependency) => dependency.key === 'primary-photo-id-progress')).toMatchObject({ status: 'satisfied' });
  });

  it('builds shared insurance execution snapshots with primary-id gating', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
      {
        document_kind: 'current_drivers_license',
        display_name: 'Driver license',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
      {
        document_kind: 'proof_of_address',
        display_name: 'Proof of address',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
    ];
    const basePlan = buildNameChangePlan({ profile: makeCase(), documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'state-dmv'
        ? { ...step, executionStatus: 'in_progress' as const }
        : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('insurance', makeCase(), documents, [], plan);
    expect(snapshot.targetLabel.toLowerCase()).toContain('insurance');
    expect(snapshot.recommendedFormCode).toBe('INSURANCE-POLICY-UPDATE-PACKET');
    expect(snapshot.sequence.dependencies.find((dependency) => dependency.key === 'primary-photo-id-progress')).toMatchObject({ status: 'satisfied' });
  });

  it('builds shared voter execution snapshots with post-DMV gating', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
      {
        document_kind: 'current_drivers_license',
        display_name: 'Driver license',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
      {
        document_kind: 'proof_of_address',
        display_name: 'Proof of address',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
    ];
    const basePlan = buildNameChangePlan({ profile: makeCase(), documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'state-dmv'
        ? { ...step, executionStatus: 'complete' as const }
        : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('voter', makeCase(), documents, [], plan);
    expect(snapshot.targetLabel.toLowerCase()).toContain('voter');
    expect(snapshot.recommendedFormCode).toBe('CA-VOTER-REGISTRATION-UPDATE');
    expect(snapshot.sequence.dependencies.find((dependency) => dependency.key === 'state-dmv-complete')).toMatchObject({ status: 'satisfied' });
  });

  it('builds shared TSA execution snapshots with passport-linked gating', () => {
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
        field_key: 'issuance_date',
        field_label: 'Passport issue date',
        field_value_masked: '2024-06-01',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];
    const basePlan = buildNameChangePlan({ profile: makeCase({ structured_intake: { spouseLastName: 'Jordan', travelBookedSoon: true, wantsDocumentIntakeHelp: true } }), documents, extractedFields });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-passport'
        ? { ...step, executionStatus: 'in_progress' as const }
        : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('tsa', makeCase({ structured_intake: { spouseLastName: 'Jordan', travelBookedSoon: true, wantsDocumentIntakeHelp: true } }), documents, extractedFields, plan);
    expect(snapshot.targetLabel.toLowerCase()).toContain('tsa');
    expect(snapshot.recommendedFormCode).toBe('TSA-TRAVEL-PROFILE-UPDATE');
    expect(snapshot.sequence.dependencies.find((dependency) => dependency.key === 'passport-progress')).toMatchObject({ status: 'satisfied' });
  });

  it('builds shared professional-license execution snapshots with employment-linked gating', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
      {
        document_kind: 'current_drivers_license',
        display_name: 'Driver license',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
    ];
    const basePlan = buildNameChangePlan({ profile: makeCase(), documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'state-dmv'
        ? { ...step, executionStatus: 'in_progress' as const }
        : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('licenses', makeCase(), documents, [], plan);
    expect(snapshot.targetLabel.toLowerCase()).toContain('professional');
    expect(snapshot.recommendedFormCode).toBe('PROFESSIONAL-LICENSE-UPDATE-PACKET');
    expect(snapshot.sequence.dependencies.find((dependency) => dependency.key === 'employment-context')).toMatchObject({ status: 'satisfied' });
  });

  it('builds shared medical execution snapshots with post-ID institutional gating', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
      {
        document_kind: 'current_drivers_license',
        display_name: 'Driver license',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
      {
        document_kind: 'proof_of_address',
        display_name: 'Proof of address',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
    ];
    const basePlan = buildNameChangePlan({ profile: makeCase(), documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'state-dmv'
        ? { ...step, executionStatus: 'in_progress' as const }
        : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('medical', makeCase(), documents, [], plan);
    expect(snapshot.targetLabel.toLowerCase()).toContain('medical');
    expect(snapshot.recommendedFormCode).toBe('MEDICAL-PROVIDER-RECORD-UPDATE');
    expect(snapshot.sequence.dependencies.find((dependency) => dependency.key === 'primary-photo-id-progress')).toMatchObject({ status: 'satisfied' });
  });

  it('builds shared utilities execution snapshots with household-admin gating', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
      {
        document_kind: 'current_drivers_license',
        display_name: 'Driver license',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
      {
        document_kind: 'proof_of_address',
        display_name: 'Proof of address',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
    ];
    const basePlan = buildNameChangePlan({ profile: makeCase(), documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'state-dmv'
        ? { ...step, executionStatus: 'in_progress' as const }
        : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('utilities', makeCase(), documents, [], plan);
    expect(snapshot.targetLabel.toLowerCase()).toContain('utilities');
    expect(snapshot.recommendedFormCode).toBe('UTILITIES-LEASE-RECORD-UPDATE');
    expect(snapshot.sequence.dependencies.find((dependency) => dependency.key === 'primary-photo-id-progress')).toMatchObject({ status: 'satisfied' });
  });

  it('builds shared courtesy execution snapshots with lightweight tail-end gating', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'current_drivers_license',
        display_name: 'Driver license',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
    ];
    const basePlan = buildNameChangePlan({ profile: makeCase(), documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'institution-banks'
        ? { ...step, executionStatus: 'in_progress' as const }
        : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('courtesy', makeCase(), documents, [], plan);
    expect(snapshot.targetLabel.toLowerCase()).toContain('courtesy');
    expect(snapshot.recommendedFormCode).toBe('COURTESY-SOCIAL-IDENTITY-SYNC');
    expect(snapshot.sequence.dependencies.find((dependency) => dependency.key === 'courtesy-identity-support')).toMatchObject({ status: 'satisfied' });
  });
});
