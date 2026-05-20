import { describe, expect, it } from 'vitest';
import {
  buildNameChangeTargetExecutionSnapshot,
  getExecutionNextActionDetail,
  getExecutionNextActionGuidance,
  hasExecutionSupportiveWaitGuidance,
  getExecutionStatusVaultNotes,
} from './targetExecution';
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
      label: 'Unblock Identity document coverage',
      detail: 'No current passport, driver license, or social security card has been represented in the case intake yet.',
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
        file_name_masked: 'marriage-certificate-•••.pdf',
        issuing_authority: 'San Diego County Clerk',
        issued_on: '2026-04-05',
        extraction_confidence: 0.97,
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
    expect(snapshot.blockers).toContain('Identity documents exist in intake, but saved details are still too thin for confident downstream use.');
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
    expect(snapshot.checklist.find((item) => item.key === 'benefits-account-record')).toMatchObject({
      status: 'attention',
      blocksReady: false,
      nextActionCategory: 'document',
    });
  });

  it('clears employer benefits follow-through intake once a retirement record is uploaded', () => {
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
      {
        document_kind: 'benefits_account_record',
        display_name: '401(k) beneficiary designation',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
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
    expect(snapshot.checklist.find((item) => item.key === 'benefits-account-record')).toMatchObject({
      status: 'ready',
      blocksReady: false,
    });
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

  it('accepts an insurance member card as insurance-lane support intake', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
      {
        document_kind: 'insurance_card',
        display_name: 'Insurance member ID card',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
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
    expect(snapshot.checklist.find((item) => item.key === 'insurance-support-doc')).toMatchObject({
      status: 'ready',
      label: 'Insurance-supporting document intake',
    });
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

  it('accepts a professional license record as license-lane support intake', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
      {
        document_kind: 'professional_license_record',
        display_name: 'Board license renewal notice',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
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
    expect(snapshot.checklist.find((item) => item.key === 'license-support-doc')).toMatchObject({
      status: 'ready',
      label: 'Professional-license-supporting intake',
    });
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

  it('accepts an insurance member card as medical-lane support intake', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
      {
        document_kind: 'insurance_card',
        display_name: 'Insurance member ID card',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
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
    expect(snapshot.checklist.find((item) => item.key === 'medical-support-doc')).toMatchObject({
      status: 'ready',
      label: 'Medical-office-supporting document intake',
    });
  });

  it('builds legal-government execution snapshots for county recorder and immigration follow-through', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
      {
        document_kind: 'current_passport',
        display_name: 'Current passport',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
    ];
    const basePlan = buildNameChangePlan({ profile: makeCase(), documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa'
        ? { ...step, executionStatus: 'in_progress' as const }
        : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('legalGovernment', makeCase(), documents, [], plan);
    expect(snapshot.targetLabel).toContain('County recorder');
    expect(snapshot.sequence.dependencies.find((dependency) => dependency.key === 'legal-proof-ready-for-government-follow-through')).toMatchObject({ status: 'satisfied' });
    expect(snapshot.checklist.find((item) => item.key === 'county-context')).toMatchObject({ status: 'ready' });
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

  it('still requires court-order middle-name grounding when only the current middle name is populated in case truth', () => {
    const profile = makeCase({
      legal_basis: 'court_order' as never,
      marriage_state: null,
      marriage_date: null,
      current_middle_name: 'Marie',
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
      label: 'Capture marriage-certificate county + certificate number + issuing authority',
      detail: 'Marriage certificate is present, but the county, certificate number, or issuing authority is not ready yet for out-of-state follow-through.',
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
      category: 'document',
      label: 'Add citizenship proof for first-passport branch',
      detail: 'First-passport follow-through needs citizenship proof in intake before the DS-11 path can be grounded.',
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

  it('splits dual-partner tsa rollout into separate travel-profile proof tracks', () => {
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
        extraction_confidence: 0.96,
      },
      {
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        file_name_masked: 'passport-•••.pdf',
        issuing_authority: 'U.S. Department of State',
        issued_on: '2024-06-01',
        extraction_confidence: 0.95,
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [];
    const basePlan = buildNameChangePlan({ profile, documents, extractedFields });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => (
        step.id === 'federal-ssa' || step.id === 'state-dmv' || step.id === 'federal-passport' || step.id === 'institution-tsa-precheck'
          ? { ...step, executionStatus: 'in_progress' as const }
          : step
      )),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('tsa', profile, documents, extractedFields, plan);
    expect(snapshot.nextAction).toMatchObject({
      category: 'review',
      label: 'Split passport work into two partner chains',
      detail: 'Both partners are changing names, so passport follow-through should track separate document packets, travel timing, and submission checkpoints for each partner.',
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
      label: 'Capture marriage-certificate county + issuing authority',
      detail: 'Marriage certificate is present, but the verified county, certificate number, and issuing authority are still incomplete for out-of-state follow-through.',
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
      executionCounts: {
        todo: 0,
        inProgress: 1,
        complete: 0,
        total: 1,
      },
      milestoneCounts: {
        inProgress: 0,
        complete: 0,
        total: 5,
      },
      proofCounts: {
        ready: expect.any(Number),
        attention: expect.any(Number),
        missing: expect.any(Number),
        total: expect.any(Number),
      },
      notes: [
        'Need the SSA receipt number before rolling into DMV.',
        expect.stringMatching(/^Proof needs: /),
      ],
    });
    expect(snapshot.statusVault.proofSummary).toContain('checks ready');
    expect(snapshot.statusVault.proofSummary).toContain('missing');
    expect(snapshot.statusVault.proofSummary).toContain('attention');
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
    expect(snapshot.statusVault.executionCounts).toEqual({
      todo: 0,
      inProgress: 0,
      complete: 0,
      total: 0,
    });
    expect(snapshot.statusVault.milestoneCounts).toEqual({
      inProgress: 0,
      complete: 0,
      total: 0,
    });
    expect(snapshot.statusVault.proofSummary).toContain('Proof stack looks grounded');
  });

  it('tracks multi-step execution counts for downstream targets', () => {
    const basePlan = buildNameChangePlan({ profile: makeCase(), documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => {
        if (step.id === 'institution-irs-records') {
          return {
            ...step,
            executionStatus: 'complete' as const,
            completedAt: '2026-04-24T18:10:00.000Z',
          };
        }

        if (step.id === 'institution-state-tax-agency') {
          return {
            ...step,
            executionStatus: 'in_progress' as const,
            executionUpdatedAt: '2026-04-24T20:10:00.000Z',
          };
        }

        return step;
      }),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('taxes', makeCase(), [], [], plan);
    expect(snapshot.statusVault.executionCounts).toEqual({
      todo: 0,
      inProgress: 1,
      complete: 1,
      total: 2,
    });
    expect(snapshot.statusVault.milestoneCounts).toEqual({
      inProgress: 0,
      complete: 0,
      total: 1,
    });
    expect(snapshot.statusVault.status).toBe('in_progress');
  });

  it('tracks the full financial rollout inside the banks status vault', () => {
    const basePlan = buildNameChangePlan({ profile: makeCase(), documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => {
        if (step.id === 'institution-banks') {
          return {
            ...step,
            executionStatus: 'complete' as const,
            completedAt: '2026-04-24T18:10:00.000Z',
          };
        }

        if (step.id === 'institution-credit-bureaus') {
          return {
            ...step,
            executionStatus: 'in_progress' as const,
            executionUpdatedAt: '2026-04-24T20:10:00.000Z',
          };
        }

        return step;
      }),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('banks', makeCase(), [], [], plan);
    expect(snapshot.statusVault.executionCounts).toEqual({
      todo: 3,
      inProgress: 1,
      complete: 1,
      total: 5,
    });
    expect(snapshot.statusVault.status).toBe('in_progress');
  });

  it('keeps courtesy rollout scoped to social and alumni follow-through', () => {
    const basePlan = buildNameChangePlan({ profile: makeCase(), documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => {
        if (step.id === 'institution-credit-bureaus') {
          return {
            ...step,
            executionStatus: 'complete' as const,
            completedAt: '2026-04-24T18:10:00.000Z',
          };
        }

        if (step.id === 'institution-subscriptions-social') {
          return {
            ...step,
            executionStatus: 'in_progress' as const,
            executionUpdatedAt: '2026-04-24T20:10:00.000Z',
          };
        }

        if (step.id === 'institution-courtesy-social-sync') {
          return {
            ...step,
            executionStatus: 'complete' as const,
            completedAt: '2026-04-24T21:10:00.000Z',
          };
        }

        return step;
      }),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('courtesy', makeCase(), [], [], plan);
    expect(snapshot.statusVault.executionCounts).toEqual({
      todo: 1,
      inProgress: 1,
      complete: 1,
      total: 3,
    });
    expect(snapshot.statusVault.status).toBe('in_progress');
  });

  it('tracks employer rollout through payroll and retirement follow-through', () => {
    const basePlan = buildNameChangePlan({ profile: makeCase(), documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => {
        if (step.id === 'institution-irs-employer') {
          return {
            ...step,
            executionStatus: 'complete' as const,
            completedAt: '2026-04-24T18:10:00.000Z',
          };
        }

        if (step.id === 'institution-retirement-benefits') {
          return {
            ...step,
            executionStatus: 'in_progress' as const,
            executionUpdatedAt: '2026-04-24T20:10:00.000Z',
          };
        }

        return step;
      }),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('employer', makeCase(), [], [], plan);
    expect(snapshot.statusVault.executionCounts).toEqual({
      todo: 0,
      inProgress: 1,
      complete: 1,
      total: 2,
    });
    expect(snapshot.statusVault.status).toBe('in_progress');
  });

  it('tracks legal-government rollout through county recorder and immigration follow-through', () => {
    const basePlan = buildNameChangePlan({ profile: makeCase(), documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => {
        if (step.id === 'institution-county-recorder-property') {
          return {
            ...step,
            executionStatus: 'complete' as const,
            completedAt: '2026-04-24T18:10:00.000Z',
          };
        }

        if (step.id === 'institution-uscis-immigration-records') {
          return {
            ...step,
            executionStatus: 'in_progress' as const,
            executionUpdatedAt: '2026-04-24T20:10:00.000Z',
          };
        }

        return step;
      }),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('legalGovernment', makeCase(), [], [], plan);
    expect(snapshot.statusVault.executionCounts).toEqual({
      todo: 0,
      inProgress: 1,
      complete: 1,
      total: 2,
    });
    expect(snapshot.statusVault.status).toBe('in_progress');
  });

  it('tracks insurance rollout through carrier, disability, and leave follow-through', () => {
    const profile = makeCase({
      structured_intake: {
        employerName: 'Acme Corp',
        travelBookedSoon: false,
        wantsDocumentIntakeHelp: true,
      },
    });
    const basePlan = buildNameChangePlan({ profile, documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => {
        if (step.id === 'institution-insurance') {
          return {
            ...step,
            executionStatus: 'complete' as const,
            completedAt: '2026-04-24T18:10:00.000Z',
          };
        }

        if (step.id === 'institution-disability-insurance') {
          return {
            ...step,
            executionStatus: 'in_progress' as const,
            executionUpdatedAt: '2026-04-24T20:10:00.000Z',
          };
        }

        return step;
      }),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('insurance', profile, [], [], plan);
    expect(snapshot.statusVault.executionCounts).toEqual({
      todo: 1,
      inProgress: 1,
      complete: 1,
      total: 3,
    });
    expect(snapshot.statusVault.status).toBe('in_progress');
  });

  it('tracks medical rollout through provider record follow-through', () => {
    const basePlan = buildNameChangePlan({ profile: makeCase(), documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'institution-medical-records'
        ? {
            ...step,
            executionStatus: 'in_progress' as const,
            executionUpdatedAt: '2026-04-24T20:10:00.000Z',
          }
        : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('medical', makeCase(), [], [], plan);
    expect(snapshot.statusVault.executionCounts).toEqual({
      todo: 0,
      inProgress: 1,
      complete: 0,
      total: 1,
    });
    expect(snapshot.statusVault.status).toBe('in_progress');
  });

  it('tracks travel rollout through tsa, booking support, and loyalty follow-through', () => {
    const profile = makeCase({
      structured_intake: {
        travelBookedSoon: true,
        wantsDocumentIntakeHelp: true,
      },
    });
    const basePlan = buildNameChangePlan({ profile, documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => {
        if (step.id === 'institution-tsa-precheck') {
          return {
            ...step,
            executionStatus: 'complete' as const,
            completedAt: '2026-04-24T18:10:00.000Z',
          };
        }

        if (step.id === 'institution-travel-hospitality') {
          return {
            ...step,
            executionStatus: 'in_progress' as const,
            executionUpdatedAt: '2026-04-24T20:10:00.000Z',
          };
        }

        return step;
      }),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('tsa', profile, [], [], plan);
    expect(snapshot.statusVault.executionCounts).toEqual({
      todo: 2,
      inProgress: 1,
      complete: 1,
      total: 4,
    });
    expect(snapshot.statusVault.status).toBe('in_progress');
  });

  it('keeps travel execution blocked on DMV before title and auto-policy follow-through', () => {
    const profile = makeCase({
      structured_intake: {
        travelBookedSoon: true,
        wantsDocumentIntakeHelp: true,
      },
    });
    const documents: NameChangeDocumentInput[] = [
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
      },
    ];
    const basePlan = buildNameChangePlan({ profile, documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-passport'
        ? {
            ...step,
            executionStatus: 'in_progress' as const,
            executionUpdatedAt: '2026-04-25T18:10:00.000Z',
          }
        : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('tsa', profile, documents, [], plan);
    expect(snapshot.nextAction).toMatchObject({
      category: 'dependency',
      label: 'Unblock Primary photo ID underway before DMV title and travel-profile updates',
      detail: 'Travel and mobility follow-through should wait until DMV work is underway so vehicle title, registration, and auto-policy records can stay aligned with the same identity chain.',
    });
  });

  it('flags traveler-profile timing review for tsa execution when travel is booked soon', () => {
    const profile = makeCase({
      structured_intake: {
        travelBookedSoon: true,
        wantsDocumentIntakeHelp: true,
      },
    });
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
      {
        document_kind: 'current_drivers_license',
        display_name: 'Driver license',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
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
    const basePlan = buildNameChangePlan({ profile, documents, extractedFields });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => (
        step.id === 'federal-passport'
          ? { ...step, executionStatus: 'complete' as const }
          : step.id === 'state-dmv' || step.id === 'institution-tsa-precheck'
            ? { ...step, executionStatus: 'in_progress' as const }
          : step
      )),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('tsa', profile, documents, extractedFields, plan);
    expect(snapshot.nextAction).toMatchObject({
      category: 'document',
      label: 'Add passport expiration date before TSA travel updates',
    });
  });

  it('routes tsa traveler-profile follow-through through the non-us passport chain', () => {
    const profile = makeCase({
      is_us_citizen: false,
      passport_needs_update: false,
      structured_intake: {
        wantsDocumentIntakeHelp: true,
      },
    });
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
      {
        document_kind: 'current_drivers_license',
        display_name: 'Driver license',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const basePlan = buildNameChangePlan({ profile, documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => (
        step.id === 'federal-passport' || step.id === 'state-dmv' || step.id === 'institution-tsa-precheck'
          ? { ...step, executionStatus: 'in_progress' as const }
          : step
      )),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('tsa', profile, documents, [], plan);
    expect(snapshot.nextAction).toMatchObject({
      category: 'review',
      label: 'Route travel-profile updates through the non-U.S. passport chain',
    });
  });

  it('flags surname formatting review before tsa traveler-profile updates for hyphenated names', () => {
    const profile = makeCase({
      target_last_name: 'Jordan-Rivera',
    });
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
      {
        document_kind: 'current_drivers_license',
        display_name: 'Driver license',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
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
    const basePlan = buildNameChangePlan({ profile, documents, extractedFields });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => (
        step.id === 'federal-passport' || step.id === 'state-dmv' || step.id === 'institution-tsa-precheck'
          ? { ...step, executionStatus: 'in_progress' as const }
          : step
      )),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('tsa', profile, documents, extractedFields, plan);
    expect(snapshot.nextAction).toMatchObject({
      category: 'review',
      label: 'Review surname formatting before submission',
    });
  });

  it('flags surname formatting review for hyphenated name execution before employer rollout', () => {
    const profile = makeCase({
      target_last_name: 'Jordan-Rivera',
    });
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
        file_name_masked: 'license-•••.pdf',
        issuing_authority: 'California DMV',
        issued_on: '2025-03-01',
        extraction_confidence: 0.92,
      },
      {
        document_kind: 'benefits_account_record',
        display_name: '401k statement',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const basePlan = buildNameChangePlan({ profile, documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      summary: {
        ...basePlan.summary,
        milestoneChecklist: (basePlan.summary.milestoneChecklist ?? []).map((milestone) => milestone.id === 'milestone-legal-proof'
          ? { ...milestone, status: 'complete' as const }
          : milestone),
      },
      steps: basePlan.steps.map((step) => (
        step.id === 'federal-ssa'
          ? { ...step, executionStatus: 'complete' as const }
          : step
      )),
    };
    const snapshot = buildNameChangeTargetExecutionSnapshot('employer', profile, documents, [], plan);
    expect(snapshot.nextAction).toMatchObject({
      category: 'review',
      label: 'Review surname formatting before submission',
    });
  });

  it('flags dual-surname order review before employer rollout', () => {
    const profile = makeCase({
      target_last_name: 'Rivera Jordan',
    });
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
        file_name_masked: 'license-•••.pdf',
        issuing_authority: 'California DMV',
        issued_on: '2025-03-01',
        extraction_confidence: 0.9,
      },
      {
        document_kind: 'benefits_account_record',
        display_name: '401k statement',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const basePlan = buildNameChangePlan({ profile, documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      summary: {
        ...basePlan.summary,
        milestoneChecklist: (basePlan.summary.milestoneChecklist ?? []).map((milestone) => milestone.id === 'milestone-legal-proof'
          ? { ...milestone, status: 'complete' as const }
          : milestone),
      },
      steps: basePlan.steps.map((step) => (
        step.id === 'federal-ssa'
          ? { ...step, executionStatus: 'complete' as const }
          : step
      )),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('employer', profile, documents, [], plan);
    expect(snapshot.nextAction).toMatchObject({
      category: 'review',
      label: 'Review dual-surname order before submission',
    });
  });

  it('only marks a target complete when every tracked step is complete', () => {
    const basePlan = buildNameChangePlan({ profile: makeCase(), documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => {
        if (step.id === 'institution-irs-records' || step.id === 'institution-state-tax-agency') {
          return {
            ...step,
            executionStatus: 'complete' as const,
            completedAt: step.id === 'institution-irs-records'
              ? '2026-04-24T18:10:00.000Z'
              : '2026-04-24T20:10:00.000Z',
          };
        }

        return step;
      }),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('taxes', makeCase(), [], [], plan);
    expect(snapshot.statusVault.executionCounts).toEqual({
      todo: 0,
      inProgress: 0,
      complete: 2,
      total: 2,
    });
    expect(snapshot.statusVault.status).toBe('complete');
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

  it('keeps invalid persisted reminder timestamps from outranking real target activity', () => {
    const basePlan = buildNameChangePlan({ profile: makeCase(), documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa'
        ? {
            ...step,
            executionStatus: 'in_progress' as const,
            executionNote: 'SSA packet already filed and waiting on receipt.',
            executionUpdatedAt: '2026-04-24T22:10:00.000Z',
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
        updated_at: 'not-a-date',
      }],
    );

    expect(snapshot.statusVault.reminderSummary).toEqual({
      openCount: 1,
      highUrgencyCount: 1,
      latestReminderAt: 'not-a-date',
    });
    expect(snapshot.statusVault.lastTouchedAt).toBe('2026-04-24T22:10:00.000Z');
    expect(snapshot.statusVault.lastTouchedSource).toBe('execution');
    expect(snapshot.statusVault.notes[0]).toBe('SSA packet already filed and waiting on receipt.');

    const impossibleDateSnapshot = buildNameChangeTargetExecutionSnapshot(
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
        updated_at: '2027-02-30',
      }],
    );

    expect(impossibleDateSnapshot.statusVault.lastTouchedAt).toBe('2026-04-24T22:10:00.000Z');
    expect(impossibleDateSnapshot.statusVault.lastTouchedSource).toBe('execution');
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

  it('preserves execution truth when reminder pressure is newer', () => {
    const basePlan = buildNameChangePlan({ profile: makeCase(), documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa'
        ? {
            ...step,
            executionStatus: 'in_progress' as const,
            executionNote: 'SSA packet already filed and waiting on receipt.',
            executionUpdatedAt: '2026-04-24T22:10:00.000Z',
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

    expect(snapshot.statusVault.lastTouchedSource).toBe('reminder');
    expect(snapshot.statusVault.notes[0]).toBe('Reminder: SSA follow-up — Receipt still missing');
    expect(snapshot.statusVault.notes).toContain('SSA packet already filed and waiting on receipt.');
    expect(snapshot.statusVault.notes).toContainEqual(expect.stringMatching(/^Proof needs: /));
    expect(snapshot.statusVault.proofSummary).toContain('missing');
    expect(snapshot.statusVault.executionNote).toBe('SSA packet already filed and waiting on receipt.');
    expect(snapshot.statusVault.milestoneNote).toBeNull();
    expect(snapshot.statusVault.proofNote).toMatch(/^Proof needs: /);
    expect(snapshot.statusVault.reminderNote).toBe('Reminder: SSA follow-up — Receipt still missing');
  });

  it('ignores sent reminders when choosing the latest target touch', () => {
    const basePlan = buildNameChangePlan({ profile: makeCase(), documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) => step.id === 'federal-ssa'
        ? {
            ...step,
            executionStatus: 'in_progress' as const,
            executionNote: 'SSA packet already filed and waiting on receipt.',
            executionUpdatedAt: '2026-04-24T22:10:00.000Z',
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
        label: 'SSA follow-up sent',
        reason: 'Follow-up email already sent',
        trigger_type: 'manual',
        status: 'sent',
        urgency: 'high',
        focus_target_id: 'ssa',
        updated_at: '2026-04-24T22:20:00.000Z',
      }],
    );

    expect(snapshot.statusVault.reminderSummary).toEqual({
      openCount: 0,
      highUrgencyCount: 0,
      latestReminderAt: null,
    });
    expect(snapshot.statusVault.lastTouchedSource).toBe('execution');
    expect(snapshot.statusVault.notes[0]).toBe('SSA packet already filed and waiting on receipt.');
    expect(snapshot.statusVault.reminderNote).toBeNull();
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
    expect(snapshot.statusVault.notes[0]).toBe('Confirmed milestone: Certified legal proof is grounded and ready to reuse');
    expect(snapshot.statusVault.executionNote).toBe('Court-order reference extraction is not needed for marriage-based cases.');
    expect(snapshot.statusVault.milestoneNote).toBe('Confirmed milestone: Certified legal proof is grounded and ready to reuse');
    expect(snapshot.statusVault.milestoneUpdatedAt).toBeNull();
    expect(snapshot.statusVault.milestoneCounts).toEqual({
      inProgress: 0,
      complete: 1,
      total: 2,
    });
  });

  it('uses milestone timing as the latest touch when milestone progress is newer than execution notes', () => {
    const basePlan = buildNameChangePlan({ profile: makeCase(), documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      summary: {
        ...basePlan.summary,
        milestoneChecklist: (basePlan.summary.milestoneChecklist ?? []).map((milestone) => milestone.id === 'milestone-legal-proof'
          ? { ...milestone, status: 'complete' as const, lastUpdatedAt: '2026-04-24T21:45:00.000Z' }
          : milestone),
      },
      steps: basePlan.steps.map((step) => step.id === 'eligibility-proof'
        ? {
            ...step,
            executionStatus: 'in_progress' as const,
            executionUpdatedAt: '2026-04-24T20:45:00.000Z',
          }
        : step),
    };

    const snapshot = buildNameChangeTargetExecutionSnapshot('courtOrder', makeCase(), [], [], plan);
    expect(snapshot.statusVault.milestoneUpdatedAt).toBe('2026-04-24T21:45:00.000Z');
    expect(snapshot.statusVault.lastTouchedAt).toBe('2026-04-24T21:45:00.000Z');
    expect(snapshot.statusVault.lastTouchedSource).toBe('milestone');
  });

  it('falls back to the guided action detail when no note or milestone confirmation exists yet', () => {
    const snapshot = buildNameChangeTargetExecutionSnapshot('dmv', makeCase(), [], []);

    expect(snapshot.nextAction).not.toBeNull();
    expect(snapshot.statusVault.notes[0]).toBe(getExecutionNextActionDetail(snapshot));
  });

  it('stores supportive optional wait guidance in status-vault fallback notes for downstream targets', () => {
    const snapshot = {
      targetKey: 'banks',
      nextAction: {
        category: 'dependency',
        label: 'Unblock DMV completion',
        detail: 'Wait for the DMV update before submitting bank changes.',
      },
    } as const;

    expect(getExecutionNextActionDetail(snapshot)).toContain('Actual submission can safely wait.');
    expect(hasExecutionSupportiveWaitGuidance(snapshot)).toBe(true);
    expect(getExecutionNextActionGuidance(snapshot)).toEqual({
      overview: 'Wait for the DMV update before submitting bank changes.',
      doNow: 'Gather account numbers, policy details, and contact routes now.',
      whyItHelps: 'That handoff moves faster once DMV completion clears.',
      canWait: 'Actual submission can safely wait.',
    });
  });

  it('parses already-labeled execution guidance without folding it back into the overview', () => {
    const snapshot = {
      targetKey: 'banks',
      nextAction: {
        category: 'dependency',
        label: 'Unblock DMV completion',
        detail: 'Wait for the DMV update before submitting bank changes. Do now: Gather account numbers, policy details, and contact routes now. Why it helps: That handoff moves faster once DMV completion clears. Can wait: Actual submission can safely wait.',
      },
    } as const;

    expect(getExecutionNextActionGuidance(snapshot)).toEqual({
      overview: 'Wait for the DMV update before submitting bank changes.',
      doNow: 'Gather account numbers, policy details, and contact routes now.',
      whyItHelps: 'That handoff moves faster once DMV completion clears.',
      canWait: 'Actual submission can safely wait.',
    });
    expect(hasExecutionSupportiveWaitGuidance(snapshot)).toBe(true);
    expect(getExecutionNextActionDetail(snapshot)).toBe(snapshot.nextAction.detail);
  });

  it('adds title and auto-policy prep guidance to travel supportive waits', () => {
    expect(getExecutionNextActionGuidance({
      targetKey: 'tsa',
      nextAction: {
        category: 'dependency',
        label: 'Unblock passport timing',
        detail: 'Wait for the passport update before submitting travel changes.',
      },
    })).toEqual({
      overview: 'Wait for the passport update before submitting travel changes.',
      doNow: 'Review upcoming bookings, traveler profiles, loyalty accounts, title records, and auto-policy details now.',
      whyItHelps: 'That sync goes quicker once passport timing clears.',
      canWait: 'Actual submission can safely wait.',
    });
  });

  it('keeps travel supportive wait guidance honest when DMV is the blocking identity hop', () => {
    expect(getExecutionNextActionGuidance({
      targetKey: 'tsa',
      nextAction: {
        category: 'dependency',
        label: 'Unblock Primary photo ID underway before DMV title and travel-profile updates',
        detail: 'Travel and mobility follow-through should wait until DMV work is underway so vehicle title, registration, and auto-policy records can stay aligned with the same identity chain.',
      },
    })).toEqual({
      overview: 'Travel and mobility follow-through should wait until DMV work is underway so vehicle title, registration, and auto-policy records can stay aligned with the same identity chain.',
      doNow: 'Review upcoming bookings, traveler profiles, loyalty accounts, title records, and auto-policy details now.',
      whyItHelps: 'That keeps travel, title, and auto-policy updates lined up once the DMV identity chain is moving.',
      canWait: 'Actual submission can safely wait.',
    });
  });

  it('adds structured wait guidance for non-us passport routing blockers', () => {
    expect(getExecutionNextActionGuidance({
      targetKey: 'passport',
      nextAction: {
        category: 'dependency',
        label: 'Route non-U.S. passport follow-through',
        detail: 'Current modeled passport flow assumes U.S. citizenship eligibility.',
      },
    })).toEqual({
      overview: 'Current modeled passport flow assumes U.S. citizenship eligibility.',
      doNow: 'Gather your current passport, citizenship record, and the country-specific change instructions now.',
      whyItHelps: 'That makes the handoff faster once the right consulate or foreign passport authority path is confirmed.',
      canWait: 'Actual submission can safely wait until the correct authority is confirmed.',
    });
  });

  it('adds structured wait guidance for out-of-state passport proof grounding blockers', () => {
    expect(getExecutionNextActionGuidance({
      targetKey: 'passport',
      nextAction: {
        category: 'document',
        label: 'Capture marriage-certificate county + certificate number + issuing authority',
        detail: 'Marriage certificate is present, but the county, certificate number, or issuing authority is not ready yet for out-of-state follow-through.',
      },
    })).toEqual({
      overview: 'Marriage certificate is present, but the county, certificate number, or issuing authority is not ready yet for out-of-state follow-through.',
      doNow: 'Pull the reviewed marriage certificate, issuing county name, certificate number, and issuing office into one proof note now.',
      whyItHelps: 'That gives the passport packet the exact out-of-state reference details it needs once filing moves.',
      canWait: 'Actual submission can safely wait until the marriage-certificate grounding is complete.',
    });
  });

  it('adds structured wait guidance for missing court-order proof uploads', () => {
    expect(getExecutionNextActionGuidance({
      targetKey: 'courtOrder',
      nextAction: {
        category: 'document',
        label: 'Upload court-order proof',
        detail: 'Court-order path is selected, but no court-order proof is represented in intake yet.',
      },
    })).toEqual({
      overview: 'Court-order path is selected, but no court-order proof is represented in intake yet.',
      doNow: 'Pull the petition, filing receipt, hearing details, or signed order draft into one place now.',
      whyItHelps: 'That makes the court-order packet faster to review once the proof is actually in intake.',
      canWait: 'Downstream SSA, DMV, and passport updates can safely wait until the court-order proof is uploaded.',
    });
  });

  it('adds structured wait guidance for missing court-order jurisdiction context', () => {
    expect(getExecutionNextActionGuidance({
      targetKey: 'courtOrder',
      nextAction: {
        category: 'dependency',
        label: 'Ground court-order jurisdiction review',
        detail: 'County context is still missing, so court-order jurisdiction review cannot be grounded yet.',
      },
    })).toEqual({
      overview: 'County context is still missing, so court-order jurisdiction review cannot be grounded yet.',
      doNow: 'Confirm the filing county, residence county, and any court location details now.',
      whyItHelps: 'That grounds the court-order path in the right jurisdiction before downstream packet prep leans on it.',
      canWait: 'Actual downstream filing can safely wait until the court-order jurisdiction context is grounded.',
    });
  });

  it('adds structured wait guidance for court-order path readiness reviews', () => {
    expect(getExecutionNextActionGuidance({
      targetKey: 'courtOrder',
      nextAction: {
        category: 'review',
        label: 'Review Court-order path readiness',
        detail: 'Court-order path is selected, but the modeled packet still needs a verified target legal name and active case path before downstream filing should trust it.',
      },
    })).toEqual({
      overview: 'Court-order path is selected, but the modeled packet still needs a verified target legal name and active case path before downstream filing should trust it.',
      doNow: 'Confirm the exact target legal name, case number, and hearing or signed-order status now.',
      whyItHelps: 'That keeps the court-order packet grounded before downstream government and account updates depend on it.',
      canWait: 'Actual downstream filing can safely wait until the court-order path is verified.',
    });
  });

  it('adds structured wait guidance for court-order target-name extraction blockers', () => {
    expect(getExecutionNextActionGuidance({
      targetKey: 'courtOrder',
      nextAction: {
        category: 'document',
        label: 'Capture court-order target middle name',
        detail: 'Court-order target first and last name are verified, but the target middle name still needs grounded extraction before downstream use is fully trusted.',
      },
    })).toEqual({
      overview: 'Court-order target first and last name are verified, but the target middle name still needs grounded extraction before downstream use is fully trusted.',
      doNow: 'Confirm the exact target legal name, case number, and hearing or signed-order status now.',
      whyItHelps: 'That keeps the court-order packet grounded before downstream government and account updates depend on it.',
      canWait: 'Actual downstream filing can safely wait until the court-order path is verified.',
    });
  });

  it('adds structured wait guidance for court-order extraction-grounding reviews', () => {
    expect(getExecutionNextActionGuidance({
      targetKey: 'courtOrder',
      nextAction: {
        category: 'document',
        label: 'Review court-order extraction grounding',
        detail: 'Court-order proof exists, but the extracted target legal name, case number, or signed-order status still needs review before downstream filing should trust it.',
      },
    })).toEqual({
      overview: 'Court-order proof exists, but the extracted target legal name, case number, or signed-order status still needs review before downstream filing should trust it.',
      doNow: 'Confirm the exact target legal name, case number, and hearing or signed-order status now.',
      whyItHelps: 'That keeps the court-order packet grounded before downstream government and account updates depend on it.',
      canWait: 'Actual downstream filing can safely wait until the court-order path is verified.',
    });
  });

  it('adds structured wait guidance for dual-partner SSA packet branching', () => {
    expect(getExecutionNextActionGuidance({
      targetKey: 'ssa',
      nextAction: {
        category: 'packet',
        label: 'Open two SSA partner packets',
        detail: 'Both partners are changing names, so SSA execution should branch into one SS-5 packet, evidence stack, and submission checkpoint set per partner instead of one shared federal chain.',
      },
    })).toEqual({
      overview: 'Both partners are changing names, so SSA execution should branch into one SS-5 packet, evidence stack, and submission checkpoint set per partner instead of one shared federal chain.',
      doNow: 'Split each partner into a separate SS-5 packet, evidence stack, and appointment or mailing checklist now.',
      whyItHelps: 'That keeps one partner’s federal proof or submission timing from blocking the other partner’s SSA chain.',
      canWait: 'Actual submission can safely wait until both partner packets are cleanly separated.',
    });
  });

  it('adds structured wait guidance for dual-partner DMV branching', () => {
    expect(getExecutionNextActionGuidance({
      targetKey: 'dmv',
      nextAction: {
        category: 'packet',
        label: 'Open two DMV partner appointment tracks',
        detail: 'Both partners are changing names, so DMV execution should branch into separate appointment timing, temporary-ID handling, and title/registration follow-through per partner.',
      },
    })).toEqual({
      overview: 'Both partners are changing names, so DMV execution should branch into separate appointment timing, temporary-ID handling, and title/registration follow-through per partner.',
      doNow: 'Break out separate DMV appointment timing, temporary-ID handling, and title follow-through notes for each partner now.',
      whyItHelps: 'That keeps the state-ID chain honest when one partner can finish DMV earlier than the other.',
      canWait: 'Actual submission can safely wait until each partner has a separate DMV track.',
    });
  });

  it('adds structured wait guidance for dual-partner downstream proof tracking', () => {
    expect(getExecutionNextActionGuidance({
      targetKey: 'banks',
      nextAction: {
        category: 'checklist',
        label: 'Track separate partner completion proof',
        detail: 'Both partners are changing names, so banks and credit cards should keep separate completion status, confirmation artifacts, and mailed-notice proof for each partner. Mark this lane complete only after both partner tracks are finished.',
      },
    })).toEqual({
      overview: 'Both partners are changing names, so banks and credit cards should keep separate completion status, confirmation artifacts, and mailed-notice proof for each partner. Mark this lane complete only after both partner tracks are finished.',
      doNow: 'Create one completion checklist and proof bucket per partner for this downstream lane now.',
      whyItHelps: 'That prevents shared account rollout from looking done when only one partner’s update actually cleared.',
      canWait: 'Actual submission can safely wait until both partner proof tracks are separated.',
    });
  });

  it('adds structured wait guidance for dual-partner tsa travel rollout branching', () => {
    expect(getExecutionNextActionGuidance({
      targetKey: 'tsa',
      nextAction: {
        category: 'checklist',
        label: 'Split travel-profile follow-through by partner',
        detail: 'Both partners are changing names, so TSA, airline traveler profiles, loyalty accounts, and booking-name updates should keep separate completion proof and booked-trip timing for each partner instead of one shared travel rollout.',
      },
    })).toEqual({
      overview: 'Both partners are changing names, so TSA, airline traveler profiles, loyalty accounts, and booking-name updates should keep separate completion proof and booked-trip timing for each partner instead of one shared travel rollout.',
      doNow: 'Break TSA, airline, loyalty, and booked-trip follow-through into one proof checklist per partner now.',
      whyItHelps: 'That keeps one partner’s travel timing or traveler-profile change from hiding incomplete rollout for the other partner.',
      canWait: 'Actual travel-profile submissions can safely wait until each partner has a separate travel rollout track.',
    });
  });

  it('adds structured wait guidance for generic dual-partner downstream rollout branching', () => {
    expect(getExecutionNextActionGuidance({
      targetKey: 'legalGovernment',
      nextAction: {
        category: 'checklist',
        label: 'Track downstream rollout separately for each partner',
        detail: 'Both partners are changing names, so this rollout lane should keep separate account confirmations, mailed notices, and completion proof for each partner instead of collapsing everything into one checklist.',
      },
    })).toEqual({
      overview: 'Both partners are changing names, so this rollout lane should keep separate account confirmations, mailed notices, and completion proof for each partner instead of collapsing everything into one checklist.',
      doNow: 'Create one downstream checklist, mailed-notice log, and proof bucket per partner for this lane now.',
      whyItHelps: 'That keeps a shared rollout lane from collapsing two different completion states into one fake finish.',
      canWait: 'Actual submission can safely wait until both partner rollout tracks are separated.',
    });
  });

  it('adds structured wait guidance for first-passport branch reviews', () => {
    expect(getExecutionNextActionGuidance({
      targetKey: 'passport',
      nextAction: {
        category: 'review',
        label: 'Confirm first-passport eligibility path',
        detail: 'This passport update is really a first-passport branch, so confirm the initial application path and packet before treating it like a standard renewal.',
      },
    })).toEqual({
      overview: 'This passport update is really a first-passport branch, so confirm the initial application path and packet before treating it like a standard renewal.',
      doNow: 'Gather citizenship proof, photo ID, and the in-person acceptance packet details now.',
      whyItHelps: 'That keeps the first-passport packet ready once the initial application path is confirmed.',
      canWait: 'Actual submission can safely wait until the first-passport branch is confirmed.',
    });
  });

  it('adds structured wait guidance for passport amendment-versus-renewal reviews', () => {
    expect(getExecutionNextActionGuidance({
      targetKey: 'passport',
      nextAction: {
        category: 'review',
        label: 'Confirm passport amendment or renewal path',
        detail: 'Your current passport exists, but the filing path still depends on whether this should move through the amendment branch or a renewal packet.',
      },
    })).toEqual({
      overview: 'Your current passport exists, but the filing path still depends on whether this should move through the amendment branch or a renewal packet.',
      doNow: 'Pull the current passport, issue date, and the supporting name-change proof you would use for either branch now.',
      whyItHelps: 'That makes it faster to lock the correct DS form path once the amendment-versus-renewal rule is confirmed.',
      canWait: 'Actual submission can safely wait until the correct passport filing path is confirmed.',
    });
  });

  it('adds structured wait guidance for dual-partner passport branches', () => {
    expect(getExecutionNextActionGuidance({
      targetKey: 'passport',
      nextAction: {
        category: 'review',
        label: 'Split passport work into two partner chains',
        detail: 'Both partners are changing names, so passport follow-through should track separate document packets, travel timing, and submission checkpoints for each partner.',
      },
    })).toEqual({
      overview: 'Both partners are changing names, so passport follow-through should track separate document packets, travel timing, and submission checkpoints for each partner.',
      doNow: 'Separate each partner’s passport proof, travel bookings, and submission timing into two distinct checklists now.',
      whyItHelps: 'That prevents one partner’s passport timing from scrambling the other partner’s travel and filing path.',
      canWait: 'Actual submission can safely wait until each partner has a clean separate passport chain.',
    });
  });

  it('adds structured wait guidance when passport work is still blocked on SSA progress', () => {
    expect(getExecutionNextActionGuidance({
      targetKey: 'passport',
      nextAction: {
        category: 'dependency',
        label: 'Finish SSA before passport packet',
        detail: 'SSA should be underway before the passport packet is submitted so the federal identity chain does not split.',
      },
    })).toEqual({
      overview: 'SSA should be underway before the passport packet is submitted so the federal identity chain does not split.',
      doNow: 'Prep the passport photo, current passport, and citizenship proof now, but hold the packet until SSA progress is real.',
      whyItHelps: 'That keeps the passport handoff ready without getting ahead of the federal identity chain.',
      canWait: 'Actual submission can safely wait until SSA progress clears the passport dependency.',
    });
  });

  it('adds structured wait guidance for out-of-state travel proof grounding blockers', () => {
    expect(getExecutionNextActionGuidance({
      targetKey: 'tsa',
      nextAction: {
        category: 'document',
        label: 'Capture marriage-certificate county + issuing authority',
        detail: 'Marriage certificate is present, but the verified county, certificate number, and issuing authority are still incomplete for out-of-state follow-through.',
      },
    })).toEqual({
      overview: 'Marriage certificate is present, but the verified county, certificate number, and issuing authority are still incomplete for out-of-state follow-through.',
      doNow: 'Pull the reviewed marriage certificate, issuing county name, certificate number, and issuing office into one proof note now.',
      whyItHelps: 'That keeps travel, title, and loyalty follow-through aligned once the out-of-state proof details are grounded.',
      canWait: 'Actual submission can safely wait until the marriage-certificate grounding is complete.',
    });
  });

  it('hides guided next-action fallback notes from the visible status-vault stack', () => {
    const guidedDetail = getExecutionNextActionDetail({
      targetKey: 'banks',
      nextAction: {
        category: 'dependency',
        label: 'Unblock DMV completion',
        detail: 'Wait for the DMV update before submitting bank changes.',
      },
    });

    expect(getExecutionStatusVaultNotes({
      targetKey: 'banks',
      nextAction: {
        category: 'dependency',
        label: 'Unblock DMV completion',
        detail: 'Wait for the DMV update before submitting bank changes.',
      },
      statusVault: {
        notes: [guidedDetail, 'Proof needs: Bring a certified marriage certificate.'],
      },
    } as const)).toEqual(['Proof needs: Bring a certified marriage certificate.']);
  });
});
