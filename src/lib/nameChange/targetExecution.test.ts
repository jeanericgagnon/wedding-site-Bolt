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
      {
        document_kind: 'current_drivers_license',
        display_name: 'Driver license',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'license-•••.pdf',
        issuing_authority: 'California DMV',
        issued_on: '2025-03-01',
        extraction_confidence: 0.9,
      },
    ];

    const snapshot = buildNameChangeTargetExecutionSnapshot('ssa', makeCase(), documents, []);
    expect(snapshot.targetLabel).toContain('Social Security');
    expect(snapshot.recommendedFormCode).toBe('SSA-SS5');
    expect(snapshot.formPayload.formCode).toBe('SSA-SS5');
    expect(snapshot.checklist.length).toBeGreaterThan(0);
    expect(snapshot.readinessSummary.status).toBe('blocked');
    expect(snapshot.nextAction).toMatchObject({
      category: expect.any(String),
      label: expect.any(String),
      detail: expect.any(String),
    });
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
    expect(snapshot.blockers).toEqual(expect.arrayContaining([
      expect.stringContaining('Structured case truth conflicts with extracted document values'),
    ]));
    expect(snapshot.fieldRisks).toEqual([]);
    expect(snapshot.readinessSummary).toMatchObject({
      status: 'blocked',
      blockingFieldRisks: 0,
      lowConfidenceFields: 0,
      documentRepairDebt: expect.any(Number),
    });
    expect(snapshot.nextAction).toMatchObject({
      category: 'document',
      label: 'Unblock Legal proof document ready',
      detail: 'The marriage certificate is reviewed, but metadata is still missing: masked filename, issuing authority, issued date, extraction confidence.',
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

  it('counts missing support-doc intake as document repair debt even before a field points at it', () => {
    const snapshot = buildNameChangeTargetExecutionSnapshot('ssa', makeCase(), [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ], []);

    expect(snapshot.checklist).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'ssa-support-doc',
        status: 'attention',
      }),
    ]));
    expect(snapshot.readinessSummary.documentRepairDebt).toBeGreaterThan(0);
  });

  it('blocks execution readiness when a required requirement is only attention-level trusted', () => {
    const snapshot = buildNameChangeTargetExecutionSnapshot('ssa', makeCase(), [
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
        file_name_masked: 'passport-•••.pdf',
      },
    ], []);

    expect(snapshot.sequence.dependencies.find((dependency) => dependency.key === 'identity-document-coverage')).toMatchObject({
      status: 'attention',
      required: true,
      nextActionCategory: 'document',
      blocksReady: true,
    });
    expect(snapshot.ready).toBe(false);
    expect(snapshot.blockers).toContain('Identity documents exist in intake, but metadata is still too thin for confident downstream use.');
    expect(snapshot.nextAction).toMatchObject({
      category: 'document',
      label: expect.stringContaining('Unblock'),
    });
  });

  it('promotes a ready packet into a final review next action', () => {
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
        intake_status: 'reviewed',
        file_name_masked: 'passport-•••.pdf',
        issuing_authority: 'U.S. Department of State',
        issued_on: '2024-06-01',
        expires_on: '2034-06-01',
        extraction_confidence: 0.92,
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
      {
        field_key: 'issuance_date',
        field_label: 'Passport issue date',
        field_value_masked: '2024-06-01',
        source_type: 'manual',
        is_verified: true,
      },
    ];

    const snapshot = buildNameChangeTargetExecutionSnapshot('ssa', makeCase(), documents, extractedFields);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.readinessSummary).toMatchObject({
      status: 'ready',
      blockingFieldRisks: 0,
      attentionFieldRisks: 0,
    });
    expect(snapshot.nextAction).toMatchObject({
      category: 'review',
      label: 'Prepare SSA-SS5',
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

  it('treats target middle name conflicts as target legal-name checklist attention for DMV execution', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'court-order-doc',
        document_kind: 'court_order_name_change',
        display_name: 'Court order',
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
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'court-order-doc',
        field_key: 'first_name',
        field_label: 'First name',
        field_value_masked: 'Alex',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'court-order-doc',
        field_key: 'middle_name',
        field_label: 'Middle name',
        field_value_masked: 'Quinn',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'court-order-doc',
        field_key: 'last_name',
        field_label: 'Last name',
        field_value_masked: 'Jordan',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'court-order-doc',
        field_key: 'case_number',
        field_label: 'Case number',
        field_value_masked: '24-CV-1188',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'court-order-doc',
        field_key: 'court_order_date',
        field_label: 'Court order date',
        field_value_masked: '2026-04-05',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];
    const profile = makeCase({
      legal_basis: 'court_order' as never,
      marriage_state: null,
      marriage_date: null,
      target_middle_name: 'Marie',
      structured_intake: {
        spouseLastName: null,
        travelBookedSoon: false,
        wantsDocumentIntakeHelp: true,
      },
      change_reasons: ['court_order'],
    });
    const basePlan = buildNameChangePlan({ profile, documents, extractedFields });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa' ? { ...step, executionStatus: 'complete' as const } : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('dmv', profile, documents, extractedFields, plan);
    expect(snapshot.checklist.find((item) => item.key === 'target-legal-name-county')).toMatchObject({
      status: 'attention',
      reason: 'Target legal name + county available is populated, but at least one field still comes from a low-confidence source.',
    });
  });

  it('keeps county-context dependency blockers routed as dependency work', () => {
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
    const basePlan = buildNameChangePlan({ profile: makeCase({ county_residence: null }), documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa' ? { ...step, executionStatus: 'complete' as const } : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('dmv', makeCase({ county_residence: null }), documents, [], plan);
    expect(snapshot.sequence.dependencies.find((dependency) => dependency.key === 'county-context')).toMatchObject({
      nextActionCategory: 'dependency',
      status: 'missing',
      blocksReady: true,
    });
    expect(snapshot.nextAction).toMatchObject({
      category: 'dependency',
      label: 'Unblock County / jurisdiction context',
    });
  });

  it('routes missing field-presence checklist work into packet preparation actions', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'marriage-certificate-•••.pdf',
        issuing_authority: 'San Diego County Clerk',
        issued_on: '2026-04-10',
        extraction_confidence: 0.95,
      },
      {
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'passport-•••.pdf',
        issuing_authority: 'U.S. Department of State',
        issued_on: '2024-06-01',
        expires_on: '2034-06-01',
        extraction_confidence: 0.92,
      },
    ];

    const snapshot = buildNameChangeTargetExecutionSnapshot('ssa', makeCase({ current_last_name: '' }), documents, []);
    expect(snapshot.checklist.find((item) => item.key === 'current-legal-name')).toMatchObject({
      kind: 'field_presence',
      status: 'missing',
    });
    expect(snapshot.nextAction).toMatchObject({
      category: 'dependency',
      label: 'Unblock Case legal-name setup complete',
      detail: 'Case setup is still missing current last name.',
    });
  });

  it('tags document-support checklist actions with their document kind', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'passport-•••.pdf',
        issuing_authority: 'U.S. Department of State',
        issued_on: '2024-06-01',
        expires_on: '2034-06-01',
        extraction_confidence: 0.92,
      },
    ];
    const basePlan = buildNameChangePlan({ profile: makeCase({ marriage_state: 'Nevada' }), documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa'
        ? { ...step, executionStatus: 'complete' as const }
        : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('passport', makeCase({ marriage_state: 'Nevada' }), documents, [], plan);

    expect(snapshot.nextAction).toMatchObject({
      category: 'document',
      label: expect.stringContaining('marriage certificate'),
      documentKind: 'marriage_certificate',
    });
  });

  it('tags document-sourced packet repair actions with their source document kind', () => {
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
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'doc-marriage',
        field_key: 'spouse_last_name',
        field_label: 'Spouse last name',
        field_value_masked: 'Jordan',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    const snapshot = buildNameChangeTargetExecutionSnapshot('ssa', makeCase({ target_last_name: 'Jordan-Smith' }), [
      { id: 'doc-marriage', ...documents[0] },
    ], extractedFields);

    expect(snapshot.nextAction).toMatchObject({
      category: 'document',
      label: expect.stringContaining('marriage certificate'),
      documentKind: 'marriage_certificate',
    });
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

  it('routes recent-passport name changes to DS-5504 at execution level', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'passport-doc',
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'passport-doc',
        field_key: 'issuance_date',
        field_label: 'Passport issue date',
        field_value_masked: new Date().toISOString().slice(0, 10),
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    const snapshot = buildNameChangeTargetExecutionSnapshot('passport', makeCase(), documents, extractedFields);
    expect(snapshot.recommendedFormCode).toBe('DS-5504');
    expect(snapshot.formPayload.formCode).toBe('DS-5504');
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

  it('builds tax execution snapshots gated behind SSA and jurisdiction context', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
      {
        document_kind: 'social_security_card',
        display_name: 'Social Security card',
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

    const snapshot = buildNameChangeTargetExecutionSnapshot('taxes', makeCase(), documents, [], plan);
    expect(snapshot.targetLabel).toContain('IRS and state tax');
    expect(snapshot.recommendedFormCode).toBe('TAX-SSA-STATE-ALIGNMENT-PACKET');
    expect(snapshot.sequence.dependencies.find((dependency) => dependency.key === 'federal-ssa-complete')).toMatchObject({ status: 'satisfied' });
    expect(snapshot.checklist.find((item) => item.key === 'county-context')).toMatchObject({ status: 'ready' });
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

  it('builds a dedicated court-order path review snapshot', () => {
    const profile = makeCase({
      legal_basis: 'court_order' as never,
      marriage_state: null,
      marriage_date: null,
      structured_intake: {
        spouseLastName: null,
        travelBookedSoon: false,
        wantsDocumentIntakeHelp: true,
      },
      change_reasons: ['court_order'],
    });
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-court-order',
        document_kind: 'court_order_name_change',
        display_name: 'Court order',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'court-order-•••.pdf',
        issuing_authority: 'San Diego Superior Court',
        issued_on: '2026-04-05',
        extraction_confidence: 0.93,
      },
      {
        document_kind: 'current_drivers_license',
        display_name: 'Driver license',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'doc-court-order',
        field_key: 'first_name',
        field_label: 'First name',
        field_value_masked: 'Alex',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'doc-court-order',
        field_key: 'middle_name',
        field_label: 'Middle name',
        field_value_masked: 'Marie',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'doc-court-order',
        field_key: 'last_name',
        field_label: 'Last name',
        field_value_masked: 'Jordan',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'doc-court-order',
        field_key: 'case_number',
        field_label: 'Case number',
        field_value_masked: '24-CV-1188',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'doc-court-order',
        field_key: 'court_order_date',
        field_label: 'Court order date',
        field_value_masked: '2026-04-05',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    const snapshot = buildNameChangeTargetExecutionSnapshot('courtOrder', profile, documents, extractedFields);
    expect(snapshot.targetLabel).toContain('Court-order');
    expect(snapshot.recommendedFormCode).toBe('COURT-ORDER-PATH-REVIEW');
    expect(snapshot.sequence.dependencies.find((dependency) => dependency.key === 'court-order-path-readiness')).toMatchObject({
      status: 'attention',
      blocksReady: true,
      nextActionCategory: 'review',
    });
    expect(snapshot.checklist.find((item) => item.key === 'court-order-path-readiness')).toMatchObject({
      status: 'attention',
      nextActionCategory: 'review',
    });
    expect(snapshot.autofillFields.find((field) => field.targetField === 'applicant.target_first_name')).toMatchObject({
      value: expect.objectContaining({
        source: 'extracted_field',
        value: 'Alex',
        sourceFieldKey: 'first_name',
      }),
    });
    expect(snapshot.autofillFields.find((field) => field.targetField === 'applicant.target_middle_name')).toMatchObject({
      value: expect.objectContaining({
        source: 'extracted_field',
        value: 'Marie',
        sourceFieldKey: 'middle_name',
      }),
    });
    expect(snapshot.autofillFields.find((field) => field.targetField === 'applicant.target_last_name')).toMatchObject({
      value: expect.objectContaining({
        source: 'extracted_field',
        value: 'Jordan',
        sourceFieldKey: 'last_name',
      }),
    });
    expect(snapshot.autofillFields.find((field) => field.targetField === 'legal.court_order_case_number')).toMatchObject({
      value: expect.objectContaining({
        source: 'extracted_field',
        value: '24-CV-1188',
        sourceFieldKey: 'case_number',
      }),
    });
    expect(snapshot.autofillFields.find((field) => field.targetField === 'legal.court_order_date')).toMatchObject({
      value: expect.objectContaining({
        source: 'extracted_field',
        value: '2026-04-05',
        sourceFieldKey: 'court_order_date',
      }),
    });
    expect(snapshot.formPayload.fields.find((field) => field.fieldKey === 'case.targetFirstName')).toMatchObject({
      value: 'Alex',
      source: 'extracted_field',
      sourceFieldKey: 'first_name',
    });
    expect(snapshot.checklist.find((item) => item.key === 'target-legal-name')).toMatchObject({ status: 'ready' });
    expect(snapshot.checklist.find((item) => item.key === 'court-order-path-readiness')).toMatchObject({
      status: 'attention',
      nextActionCategory: 'review',
    });
    expect(snapshot.nextAction).toMatchObject({
      category: 'review',
      label: 'Review Court-order path readiness',
    });
  });

  it('tells the user to upload court-order proof before asking for extraction fields', () => {
    const profile = makeCase({
      legal_basis: 'court_order' as never,
      marriage_state: null,
      marriage_date: null,
      structured_intake: {
        spouseLastName: null,
        travelBookedSoon: false,
        wantsDocumentIntakeHelp: true,
      },
      change_reasons: ['court_order'],
    });

    const snapshot = buildNameChangeTargetExecutionSnapshot('courtOrder', profile, [], []);
    expect(snapshot.nextAction).toMatchObject({
      category: 'document',
      label: 'Upload court-order proof',
      detail: 'Court-order path is selected, but no court-order proof is represented in intake yet.',
    });
  });

  it('tells the user to review court-order proof before asking for extraction fields', () => {
    const profile = makeCase({
      legal_basis: 'court_order' as never,
      marriage_state: null,
      marriage_date: null,
      structured_intake: {
        spouseLastName: null,
        travelBookedSoon: false,
        wantsDocumentIntakeHelp: true,
      },
      change_reasons: ['court_order'],
    });
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'court-order-doc',
        document_kind: 'court_order_name_change',
        display_name: 'Court order',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
      {
        document_kind: 'current_drivers_license',
        display_name: 'Driver license',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
    ];

    const snapshot = buildNameChangeTargetExecutionSnapshot('courtOrder', profile, documents, []);
    expect(snapshot.nextAction).toMatchObject({
      category: 'document',
      label: 'Review court-order proof',
      detail: 'Court-order proof is in intake, but no verified target-name or case-reference extraction is represented yet.',
    });
  });

  it('gives a concrete court-order extraction next action when target legal name + case reference fields are still missing', () => {
    const profile = makeCase({
      legal_basis: 'court_order' as never,
      marriage_state: null,
      marriage_date: null,
      structured_intake: {
        spouseLastName: null,
        travelBookedSoon: false,
        wantsDocumentIntakeHelp: true,
      },
      change_reasons: ['court_order'],
    });
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'court-order-doc',
        document_kind: 'court_order_name_change',
        display_name: 'Court order',
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

    const snapshot = buildNameChangeTargetExecutionSnapshot('courtOrder', profile, documents, []);
    expect(snapshot.nextAction).toMatchObject({
      category: 'document',
      label: 'Capture court-order target legal name + case reference fields',
      detail: 'Court-order proof is in intake, but no verified target-name or case-reference extraction is represented yet.',
    });
  });

  it('gives a concrete court-order extraction next action when target middle name is the last missing grounded field', () => {
    const profile = makeCase({
      legal_basis: 'court_order' as never,
      marriage_state: null,
      marriage_date: null,
      structured_intake: {
        spouseLastName: null,
        travelBookedSoon: false,
        wantsDocumentIntakeHelp: true,
      },
      change_reasons: ['court_order'],
    });
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'court-order-doc',
        document_kind: 'court_order_name_change',
        display_name: 'Court order',
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
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'court-order-doc',
        field_key: 'first_name',
        field_label: 'First name',
        field_value_masked: 'Alex',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'court-order-doc',
        field_key: 'last_name',
        field_label: 'Last name',
        field_value_masked: 'Jordan',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'court-order-doc',
        field_key: 'case_number',
        field_label: 'Case number',
        field_value_masked: '24-CV-1188',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'court-order-doc',
        field_key: 'court_order_date',
        field_label: 'Court order date',
        field_value_masked: '2026-04-15',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    const snapshot = buildNameChangeTargetExecutionSnapshot('courtOrder', profile, documents, extractedFields);
    expect(snapshot.nextAction).toMatchObject({
      category: 'document',
      label: 'Capture court-order target middle name',
      detail: 'Court-order target first and last name are verified, but the target middle name still needs grounded extraction before downstream use is fully trusted.',
    });
  });

  it('gives a concrete court-order extraction next action when signed date is the last missing grounded field', () => {
    const profile = makeCase({
      legal_basis: 'court_order' as never,
      marriage_state: null,
      marriage_date: null,
      structured_intake: {
        spouseLastName: null,
        travelBookedSoon: false,
        wantsDocumentIntakeHelp: true,
      },
      change_reasons: ['court_order'],
    });
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'court-order-doc',
        document_kind: 'court_order_name_change',
        display_name: 'Court order',
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
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'court-order-doc',
        field_key: 'first_name',
        field_label: 'First name',
        field_value_masked: 'Alex',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'court-order-doc',
        field_key: 'middle_name',
        field_label: 'Middle name',
        field_value_masked: 'Marie',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'court-order-doc',
        field_key: 'last_name',
        field_label: 'Last name',
        field_value_masked: 'Jordan',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'court-order-doc',
        field_key: 'case_number',
        field_label: 'Case number',
        field_value_masked: '24-CV-1188',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    const snapshot = buildNameChangeTargetExecutionSnapshot('courtOrder', profile, documents, extractedFields);
    expect(snapshot.nextAction).toMatchObject({
      category: 'document',
      label: 'Capture court-order signed date',
      detail: 'Court-order target legal name and case number are verified, but the signed date still needs grounded extraction before downstream use is fully trusted.',
    });
  });

  it('gives a concrete marriage-certificate grounding next action when out-of-state passport follow-through is missing both reference fields', () => {
    const profile = makeCase({ marriage_state: 'Nevada' });
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-marriage',
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
    const basePlan = buildNameChangePlan({ profile, documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa'
        ? { ...step, executionStatus: 'in_progress' as const }
        : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('passport', profile, documents, [], plan);
    expect(snapshot.nextAction).toMatchObject({
      category: 'document',
      label: 'Capture marriage-certificate county + certificate number',
      detail: 'Marriage certificate is present, but no grounded county or certificate-number extraction is represented yet for out-of-state follow-through.',
    });
  });

  it('uses a passport-specific next action for non-us passport routing', () => {
    const snapshot = buildNameChangeTargetExecutionSnapshot('passport', makeCase({ is_us_citizen: false }), [], []);

    expect(snapshot.nextAction).toMatchObject({
      category: 'dependency',
      label: 'Route non-U.S. passport follow-through',
      detail: 'Current modeled passport flow assumes U.S. citizenship eligibility.',
    });
  });

  it('uses a passport-specific next action for first-passport eligibility branching', () => {
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
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        field_key: 'spouse_last_name',
        field_label: 'Spouse last name',
        field_value_masked: 'Jordan',
        source_type: 'manual',
        is_verified: true,
      },
    ];
    const basePlan = buildNameChangePlan({
      profile: makeCase({ has_us_passport: false, passport_needs_update: true }),
      documents,
      extractedFields,
    });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa'
        ? { ...step, executionStatus: 'in_progress' as const }
        : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('passport', makeCase({ has_us_passport: false, passport_needs_update: true }), documents, extractedFields, plan);
    expect(snapshot.nextAction).toMatchObject({
      category: 'review',
      label: 'Confirm first-passport eligibility path',
      detail: 'This passport update is really a first-passport branch, so confirm the initial application path and packet before treating it like a standard renewal.',
    });
  });

  it('splits ready passport work into two chains when both partners are changing names', () => {
    const profile = makeCase({ change_reasons: ['marriage', 'both_partners_change_name'] });
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
        intake_status: 'reviewed',
        file_name_masked: 'passport-•••.pdf',
        issuing_authority: 'U.S. Department of State',
        issued_on: '2024-06-01',
        expires_on: '2034-06-01',
        extraction_confidence: 0.92,
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
      {
        field_key: 'issuance_date',
        field_label: 'Passport issue date',
        field_value_masked: '2024-06-01',
        source_type: 'manual',
        is_verified: true,
      },
    ];
    const basePlan = buildNameChangePlan({ profile, documents, extractedFields });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa'
        ? { ...step, executionStatus: 'in_progress' as const }
        : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('passport', profile, documents, extractedFields, plan);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.nextAction).toMatchObject({
      category: 'review',
      label: 'Split passport work into two partner chains',
    });
  });

  it('splits ready SSA work into two partner packets when both partners are changing names', () => {
    const profile = makeCase({ change_reasons: ['marriage', 'both_partners_change_name'] });
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
        intake_status: 'reviewed',
        file_name_masked: 'license-•••.pdf',
        issuing_authority: 'California DMV',
        issued_on: '2025-03-01',
        extraction_confidence: 0.9,
      },
      {
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'passport-•••.pdf',
        issuing_authority: 'U.S. Department of State',
        issued_on: '2024-06-01',
        expires_on: '2034-06-01',
        extraction_confidence: 0.92,
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

    const snapshot = buildNameChangeTargetExecutionSnapshot('ssa', profile, documents, extractedFields);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.nextAction).toMatchObject({
      category: 'packet',
      label: 'Open two SSA partner packets',
    });
  });

  it('splits ready SSA work from structured dual-partner intake', () => {
    const profile = makeCase({
      structured_intake: {
        spouseLastName: 'Jordan',
        travelBookedSoon: false,
        wantsDocumentIntakeHelp: true,
        bothPartnersChangeName: true,
      },
    });
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
        intake_status: 'reviewed',
        file_name_masked: 'license-•••.pdf',
        issuing_authority: 'California DMV',
        issued_on: '2025-03-01',
        extraction_confidence: 0.9,
      },
      {
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'passport-•••.pdf',
        issuing_authority: 'U.S. Department of State',
        issued_on: '2024-06-01',
        expires_on: '2034-06-01',
        extraction_confidence: 0.92,
      },
    ];

    const snapshot = buildNameChangeTargetExecutionSnapshot('ssa', profile, documents, []);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.nextAction).toMatchObject({
      category: 'packet',
      label: 'Open two SSA partner packets',
    });
  });

  it('splits ready DMV work into two partner appointments when both partners are changing names', () => {
    const profile = makeCase({ change_reasons: ['marriage', 'both_partners_change_name'] });
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
        intake_status: 'reviewed',
        file_name_masked: 'license-•••.pdf',
        issuing_authority: 'California DMV',
        issued_on: '2025-03-01',
        extraction_confidence: 0.9,
      },
      {
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'passport-•••.pdf',
        issuing_authority: 'U.S. Department of State',
        issued_on: '2024-06-01',
        expires_on: '2034-06-01',
        extraction_confidence: 0.92,
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
    const basePlan = buildNameChangePlan({ profile, documents, extractedFields });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa'
        ? { ...step, executionStatus: 'complete' as const }
        : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('dmv', profile, documents, extractedFields, plan);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.nextAction).toMatchObject({
      category: 'packet',
      label: 'Open two DMV partner appointment tracks',
    });
  });

  it('splits downstream rollout into partner-specific confirmations when both partners are changing names', () => {
    const profile = makeCase({ change_reasons: ['marriage', 'both_partners_change_name'] });
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
        intake_status: 'reviewed',
        file_name_masked: 'license-•••.pdf',
        issuing_authority: 'California DMV',
        issued_on: '2025-03-01',
        extraction_confidence: 0.9,
      },
      {
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'passport-•••.pdf',
        issuing_authority: 'U.S. Department of State',
        issued_on: '2024-06-01',
        expires_on: '2034-06-01',
        extraction_confidence: 0.92,
      },
      {
        document_kind: 'proof_of_address',
        display_name: 'Utility bill',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'utility-bill-•••.pdf',
        issuing_authority: 'SDGE',
        issued_on: '2026-04-12',
        extraction_confidence: 0.88,
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
    const basePlan = buildNameChangePlan({ profile, documents, extractedFields });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa' || step.id === 'state-dmv'
        ? { ...step, executionStatus: 'complete' as const }
        : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('banks', profile, documents, extractedFields, plan);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.nextAction).toMatchObject({
      category: 'checklist',
      label: 'Track separate partner completion proof',
      detail: 'Both partners are changing names, so banks and credit cards should keep separate completion status, confirmation artifacts, and mailed-notice proof for each partner. Mark this lane complete only after both partner tracks are finished.',
    });
  });

  it('prompts courtesy rollout lanes to keep separate per-partner proof state', () => {
    const profile = makeCase({
      change_reasons: ['marriage', 'both_partners_change_name'],
    });
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-license',
        document_kind: 'current_drivers_license',
        display_name: 'Driver license',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'drivers-license-•••.jpg',
        issuing_authority: 'California DMV',
        issued_on: '2025-10-20',
        extraction_confidence: 0.95,
      },
      {
        id: 'doc-address',
        document_kind: 'proof_of_address',
        display_name: 'Proof of address',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'utility-bill-•••.pdf',
        issuing_authority: 'SDGE',
        issued_on: '2026-04-11',
        extraction_confidence: 0.9,
      },
      {
        id: 'doc-passport',
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'passport-•••.jpg',
        issuing_authority: 'US Department of State',
        issued_on: '2025-09-10',
        extraction_confidence: 0.95,
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [];
    const basePlan = buildNameChangePlan({ profile, documents, extractedFields });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa' || step.id === 'state-dmv'
        ? { ...step, executionStatus: 'complete' as const }
        : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('courtesy', profile, documents, extractedFields, plan);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.nextAction).toMatchObject({
      category: 'checklist',
      label: 'Track separate partner completion proof',
      detail: 'Both partners are changing names, so courtesy / social identity sync should keep separate completion status, confirmation artifacts, and mailed-notice proof for each partner. Mark this lane complete only after both partner tracks are finished.',
    });
  });

  it('gives a concrete marriage-certificate grounding next action when county is the last missing out-of-state field', () => {
    const profile = makeCase({ marriage_state: 'Nevada' });
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-marriage',
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'doc-marriage',
        field_key: 'certificate_number',
        field_label: 'Certificate number',
        field_value_masked: 'MC-123',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];
    const basePlan = buildNameChangePlan({ profile, documents, extractedFields });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-passport'
        ? { ...step, executionStatus: 'in_progress' as const }
        : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('tsa', profile, documents, extractedFields, plan);
    expect(snapshot.nextAction).toMatchObject({
      category: 'document',
      label: 'Capture marriage-certificate county',
      detail: 'Marriage certificate is present, but verified county and certificate-number extraction are still incomplete for out-of-state follow-through.',
    });
  });

  it('blocks packet readiness when canonical truth conflicts with extracted values', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-marriage',
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
        id: 'doc-passport',
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'passport-•••.pdf',
        issuing_authority: 'U.S. Department of State',
        issued_on: '2024-06-01',
        expires_on: '2034-06-01',
        extraction_confidence: 0.92,
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'doc-marriage',
        field_key: 'spouse_last_name',
        field_label: 'Spouse last name',
        field_value_masked: 'Jordan-Smith',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'doc-passport',
        field_key: 'first_name',
        field_label: 'First name',
        field_value_masked: 'Alicia',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'doc-passport',
        field_key: 'issuance_date',
        field_label: 'Passport issue date',
        field_value_masked: '2024-06-01',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    const snapshot = buildNameChangeTargetExecutionSnapshot('ssa', makeCase(), documents, extractedFields);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.checklist.find((item) => item.key === 'canonical-extraction-alignment')).toMatchObject({
      status: 'attention',
      nextActionCategory: 'document',
      blocksReady: true,
    });
    expect(snapshot.blockers).toContain('Structured case truth conflicts with extracted document values in 2 places: Current first name vs passport extraction, Target last name vs marriage certificate spouse surname.');
    expect(snapshot.nextAction).toMatchObject({
      category: 'document',
      label: 'Resolve current passport conflict',
      detail: 'Current first name vs passport extraction disagree. Structured case says Alex, but extracted document value says Alicia.',
    });
  });

  it('blocks shared institution execution when canonical conflicts remain unresolved', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-marriage',
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
        id: 'doc-passport',
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'passport-•••.pdf',
        issuing_authority: 'U.S. Department of State',
        issued_on: '2024-06-01',
        expires_on: '2034-06-01',
        extraction_confidence: 0.92,
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'doc-marriage',
        field_key: 'spouse_last_name',
        field_label: 'Spouse last name',
        field_value_masked: 'Jordan-Smith',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'doc-passport',
        field_key: 'first_name',
        field_label: 'First name',
        field_value_masked: 'Alicia',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];
    const basePlan = buildNameChangePlan({ profile: makeCase(), documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'state-dmv'
        ? { ...step, executionStatus: 'in_progress' as const }
        : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('banks', makeCase(), documents, extractedFields, plan);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.checklist.find((item) => item.key === 'canonical-extraction-alignment')).toMatchObject({
      status: 'attention',
      nextActionCategory: 'document',
      blocksReady: true,
    });
    expect(snapshot.blockers).toContain('Structured case truth conflicts with extracted document values in 2 places: Current first name vs passport extraction, Target last name vs marriage certificate spouse surname.');
    expect(snapshot.nextAction).toMatchObject({
      category: 'document',
      label: 'Resolve current passport conflict',
      detail: 'Current first name vs passport extraction disagree. Structured case says Alex, but extracted document value says Alicia.',
    });
  });

  it('carries court-order target first name through shared institution execution', () => {
    const profile = makeCase({
      legal_basis: 'court_order' as never,
      marriage_state: null,
      marriage_date: null,
      target_first_name: '',
      target_last_name: '',
      change_reasons: ['court_order'],
      structured_intake: {
        spouseLastName: null,
        travelBookedSoon: false,
        wantsDocumentIntakeHelp: true,
      },
    });
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'court-order-doc',
        document_kind: 'court_order_name_change',
        display_name: 'Court order',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'court-order-•••.pdf',
        issuing_authority: 'San Diego Superior Court',
        issued_on: '2026-04-05',
        extraction_confidence: 0.98,
      },
      {
        id: 'passport-doc',
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'passport-•••.pdf',
        issuing_authority: 'U.S. Department of State',
        issued_on: '2024-06-01',
        expires_on: '2034-06-01',
        extraction_confidence: 0.94,
      },
      {
        id: 'bank-support-doc',
        document_kind: 'bank_statement',
        display_name: 'Bank statement',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'bank-statement-•••.pdf',
        issuing_authority: 'First Federal',
        issued_on: '2026-04-08',
        extraction_confidence: 0.91,
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'court-order-doc',
        field_key: 'first_name',
        field_label: 'Target first name',
        field_value_masked: 'Alicia',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'court-order-doc',
        field_key: 'last_name',
        field_label: 'Target last name',
        field_value_masked: 'Jordan',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'court-order-doc',
        field_key: 'case_number',
        field_label: 'Case number',
        field_value_masked: '24-CV-1188',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'court-order-doc',
        field_key: 'court_order_date',
        field_label: 'Court order date',
        field_value_masked: '2026-04-05',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    const snapshot = buildNameChangeTargetExecutionSnapshot('banks', profile, documents, extractedFields);
    expect(snapshot.autofillFields.find((field) => field.targetField === 'applicant.target_first_name')).toMatchObject({
      value: expect.objectContaining({
        source: 'extracted_field',
        value: 'Alicia',
        sourceFieldKey: 'first_name',
      }),
    });
    expect(snapshot.formPayload.fields.find((field) => field.fieldKey === 'accountHolder.newFirstName')).toMatchObject({
      value: 'Alicia',
      source: 'extracted_field',
      sourceFieldKey: 'first_name',
    });
    expect(snapshot.checklist.find((item) => item.key === 'target-legal-name')).toMatchObject({ status: 'ready' });
  });

  it('carries court-order target first name through dmv execution', () => {
    const profile = makeCase({
      legal_basis: 'court_order' as never,
      marriage_state: null,
      marriage_date: null,
      target_first_name: '',
      target_last_name: '',
      change_reasons: ['court_order'],
      structured_intake: {
        spouseLastName: null,
        travelBookedSoon: false,
        wantsDocumentIntakeHelp: true,
      },
    });
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'court-order-doc',
        document_kind: 'court_order_name_change',
        display_name: 'Court order',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'court-order-•••.pdf',
        issuing_authority: 'San Diego Superior Court',
        issued_on: '2026-04-05',
        extraction_confidence: 0.98,
      },
      {
        id: 'license-doc',
        document_kind: 'current_drivers_license',
        display_name: 'Driver license',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'license-•••.pdf',
        issuing_authority: 'California DMV',
        issued_on: '2025-01-02',
        expires_on: '2033-01-02',
        extraction_confidence: 0.92,
      },
      {
        id: 'address-doc',
        document_kind: 'proof_of_address',
        display_name: 'Utility bill',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'utility-•••.pdf',
        issuing_authority: 'SDG&E',
        issued_on: '2026-04-09',
        extraction_confidence: 0.88,
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'court-order-doc',
        field_key: 'first_name',
        field_label: 'Target first name',
        field_value_masked: 'Alicia',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'court-order-doc',
        field_key: 'middle_name',
        field_label: 'Target middle name',
        field_value_masked: 'Quinn',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'court-order-doc',
        field_key: 'last_name',
        field_label: 'Target last name',
        field_value_masked: 'Jordan',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'court-order-doc',
        field_key: 'case_number',
        field_label: 'Case number',
        field_value_masked: '24-CV-1188',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'court-order-doc',
        field_key: 'court_order_date',
        field_label: 'Court order date',
        field_value_masked: '2026-04-05',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    const snapshot = buildNameChangeTargetExecutionSnapshot('dmv', profile, documents, extractedFields);
    expect(snapshot.autofillFields.find((field) => field.targetField === 'applicant.target_first_name')).toMatchObject({
      value: expect.objectContaining({
        source: 'extracted_field',
        value: 'Alicia',
        sourceFieldKey: 'first_name',
      }),
    });
    expect(snapshot.autofillFields.find((field) => field.targetField === 'applicant.target_middle_name')).toMatchObject({
      value: expect.objectContaining({
        source: 'extracted_field',
        value: 'Quinn',
        sourceFieldKey: 'middle_name',
      }),
    });
    expect(snapshot.formPayload.fields.find((field) => field.fieldKey === 'applicant.newFirstName')).toMatchObject({
      value: 'Alicia',
      source: 'extracted_field',
      sourceFieldKey: 'first_name',
    });
    expect(snapshot.formPayload.fields.find((field) => field.fieldKey === 'applicant.newMiddleName')).toMatchObject({
      value: 'Quinn',
      source: 'extracted_field',
      sourceFieldKey: 'middle_name',
      required: false,
    });
    expect(snapshot.checklist.find((item) => item.key === 'target-legal-name-county')).toMatchObject({ status: 'attention' });
  });

  it('uses snapshot-backed opaque court-order uploads when choosing the next grounded execution action', () => {
    const profile = makeCase({
      legal_basis: 'court_order' as never,
      marriage_state: null,
      marriage_date: null,
      current_middle_name: '',
      target_middle_name: '',
      structured_intake: {
        spouseLastName: null,
        travelBookedSoon: false,
        wantsDocumentIntakeHelp: true,
      },
      change_reasons: ['court_order'],
    });
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'court-order-upload-final.pdf',
        document_kind: 'court_order',
        display_name: 'Court order',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'court-order-•••.pdf',
        issuing_authority: 'San Diego Superior Court',
        issued_on: '2026-04-12',
        extraction_confidence: 0.96,
        extracted_snapshot: {
          fields: {
            first_name: { value: 'Alex' },
            last_name: { value: 'Jordan' },
            case_number: { value: '24-CV-1188' },
            court_order_date: { value: '2026-04-12' },
          },
        },
      },
      {
        document_kind: 'current_drivers_license',
        display_name: 'Driver license',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'license-•••.pdf',
        issuing_authority: 'California DMV',
        issued_on: '2024-02-01',
        extraction_confidence: 0.91,
      },
    ];

    const snapshot = buildNameChangeTargetExecutionSnapshot('courtOrder', profile, documents, []);
    expect(snapshot.checklist.find((item) => item.key === 'court-order-reference-extraction')).toMatchObject({ status: 'ready' });
    expect(snapshot.nextAction?.label).not.toContain('Capture court-order');
  });

  it('builds a per-target status vault from execution truth so the workflow can resume cleanly', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'marriage-cert-doc',
        document_kind: 'marriage_certificate',
        display_name: 'Marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'marriage-•••.pdf',
        issuing_authority: 'San Diego County',
        issued_on: '2026-04-10',
        extraction_confidence: 0.94,
      },
    ];
    const basePlan = buildNameChangePlan({ profile: makeCase(), documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa'
        ? {
            ...step,
            executionStatus: 'in_progress' as const,
            executionNote: 'Need the SSA receipt number before rolling into DMV.',
            executionUpdatedAt: '2026-04-24T21:55:00.000Z',
          }
        : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('ssa', makeCase(), documents, [], plan);
    expect(snapshot.statusVault).toMatchObject({
      status: 'in_progress',
      lastUpdatedAt: '2026-04-24T21:55:00.000Z',
      lastTouchedAt: '2026-04-24T21:55:00.000Z',
      lastTouchedSource: 'execution',
      proofCounts: {
        ready: expect.any(Number),
        attention: expect.any(Number),
        missing: expect.any(Number),
        total: expect.any(Number),
      },
      notes: ['Need the SSA receipt number before rolling into DMV.'],
    });
    expect(snapshot.statusVault.proofSummary).toContain('checks ready');
  });

  it('marks the status vault ready when proof is grounded but no execution step has started yet', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'marriage-cert-doc',
        document_kind: 'marriage_certificate',
        display_name: 'Marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'marriage-•••.pdf',
        issuing_authority: 'San Diego County',
        issued_on: '2026-04-10',
        extraction_confidence: 0.94,
      },
      {
        id: 'passport-doc',
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'passport-•••.pdf',
        issuing_authority: 'U.S. Department of State',
        issued_on: '2024-06-01',
        expires_on: '2034-06-01',
        extraction_confidence: 0.92,
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
      {
        field_key: 'issuance_date',
        field_label: 'Passport issue date',
        field_value_masked: '2024-06-01',
        source_type: 'manual',
        is_verified: true,
      },
    ];

    const snapshot = buildNameChangeTargetExecutionSnapshot('ssa', makeCase(), documents, extractedFields);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.statusVault.status).toBe('ready');
    expect(snapshot.statusVault.proofSummary).toContain('Proof stack looks grounded');
  });

  it('tracks per-target reminder pressure inside the status vault', () => {
    const snapshot = buildNameChangeTargetExecutionSnapshot(
      'ssa',
      makeCase(),
      [],
      [],
      null,
      [
        {
          reminder_key: 'ssa-follow-up',
          label: 'SSA follow-up',
          reason: 'Receipt still missing',
          trigger_type: 'manual',
          status: 'pending',
          urgency: 'high',
          focus_target_id: 'ssa',
          updated_at: '2026-04-24T22:20:00.000Z',
        },
        {
          reminder_key: 'dmv-hold',
          label: 'DMV hold',
          reason: 'Wait for SSA',
          trigger_type: 'manual',
          status: 'pending',
          urgency: 'normal',
          focus_target_id: 'dmv',
          updated_at: '2026-04-24T22:15:00.000Z',
        },
      ],
    );

    expect(snapshot.statusVault.reminderSummary).toEqual({
      openCount: 1,
      highUrgencyCount: 1,
      latestReminderAt: '2026-04-24T22:20:00.000Z',
    });
    expect(snapshot.statusVault.lastTouchedAt).toBe('2026-04-24T22:20:00.000Z');
    expect(snapshot.statusVault.lastTouchedSource).toBe('reminder');
    expect(snapshot.statusVault.notes[0]).toBe('Reminder: SSA follow-up — Receipt still missing');
  });

  it('keeps execution notes ahead of reminder notes when execution is newer', () => {
    const basePlan = buildNameChangePlan({ profile: makeCase(), documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa'
        ? {
            ...step,
            executionStatus: 'in_progress' as const,
            executionNote: 'SSA packet already filed and waiting on receipt.',
            executionUpdatedAt: '2026-04-24T22:40:00.000Z',
          }
        : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot(
      'ssa',
      makeCase(),
      [],
      [],
      plan,
      [{
        reminder_key: 'ssa-follow-up',
        label: 'SSA follow-up',
        reason: 'Receipt still missing',
        trigger_type: 'manual',
        status: 'pending',
        urgency: 'high',
        focus_target_id: 'ssa',
        updated_at: '2026-04-24T22:20:00.000Z',
      }],
    );

    expect(snapshot.statusVault.lastTouchedSource).toBe('execution');
    expect(snapshot.statusVault.notes[0]).toBe('SSA packet already filed and waiting on receipt.');
  });

  it('falls back to milestone confirmations when a target has no explicit execution note yet', () => {
    const basePlan = buildNameChangePlan({ profile: makeCase(), documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      summary: {
        ...basePlan.summary,
        milestoneChecklist: (basePlan.summary.milestoneChecklist ?? []).map((milestone) => milestone.id === 'milestone-legal-proof'
          ? { ...milestone, status: 'complete' as const }
          : milestone),
      },
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('courtOrder', makeCase(), [], [], plan);
    expect(snapshot.statusVault.notes[0]).toBe('Confirmed milestone: Certified legal proof is grounded and reviewed');
  });

  it('falls back to the guided action detail when no note or milestone confirmation exists yet', () => {
    const snapshot = buildNameChangeTargetExecutionSnapshot('dmv', makeCase(), [], []);

    expect(snapshot.nextAction).not.toBeNull();
    expect(snapshot.statusVault.notes[0]).toBe(snapshot.nextAction?.detail);
  });
});
