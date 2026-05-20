import { describe, expect, it } from 'vitest';
import { buildNameChangeExecutionSequenceSnapshot } from './executionSequence';
import { buildNameChangePlan } from './engine';
import type { NameChangeCaseInput, NameChangeDocumentInput, NameChangeExtractedFieldInput } from './types';

type CaseOverrides = Partial<Omit<NameChangeCaseInput, 'structured_intake'>> & {
  structured_intake?: Partial<NameChangeCaseInput['structured_intake']>;
};

function makeCase(overrides: CaseOverrides = {}): NameChangeCaseInput {
  const { structured_intake: structuredIntakeOverrides, ...caseOverrides } = overrides;
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
      ...structuredIntakeOverrides,
    },
    latest_plan_summary: null,
    ...caseOverrides,
  };
}

describe('name change execution sequence snapshot', () => {
  it('marks SSA federal dependencies ready when proof + identity coverage exist', () => {
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

    const snapshot = buildNameChangeExecutionSequenceSnapshot('ssa', makeCase(), documents, []);
    expect(snapshot.lane).toBe('federal');
    expect(snapshot.ready).toBe(true);
    expect(snapshot.dependencies.find((dependency) => dependency.key === 'legal-proof-document')).toMatchObject({ status: 'satisfied' });
  });

  it('blocks SSA sequencing when conditional legal-name setup is still incomplete', () => {
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

    const snapshot = buildNameChangeExecutionSequenceSnapshot(
      'ssa',
      makeCase({ current_middle_name: 'Marie', target_middle_name: '' }),
      documents,
      [],
    );

    expect(snapshot.ready).toBe(false);
    expect(snapshot.blockers).toContain('Case setup is still missing target middle name.');
    expect(snapshot.dependencies.find((dependency) => dependency.key === 'case-legal-name-completeness')).toMatchObject({
      status: 'missing',
      blocksReady: true,
      reason: 'Case setup is still missing target middle name.',
    });
  });

  it('keeps DMV sequencing in attention when federal/state dependencies are incomplete', () => {
    const snapshot = buildNameChangeExecutionSequenceSnapshot('dmv', makeCase({ workflow_status: 'draft', county_residence: null }), [], []);
    expect(snapshot.lane).toBe('state');
    expect(snapshot.ready).toBe(false);
    expect(snapshot.dependencies.find((dependency) => dependency.key === 'county-context')).toMatchObject({ status: 'missing' });
    expect(snapshot.dependencies.find((dependency) => dependency.key === 'federal-ssa-progress')).toMatchObject({ status: 'missing' });
  });

  it('preserves blocking attention for partial court-order extraction instead of flattening it to missing', () => {
    const profile = makeCase({
      legal_basis: 'court_order' as never,
      marriage_state: null,
      marriage_date: null,
      county_residence: 'San Diego',
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
        field_label: 'Target first name',
        field_value_masked: 'Alex',
        source_type: 'document_extract',
        is_verified: true,
      },
      {
        document_id: 'court-order-doc',
        field_key: 'middle_name',
        field_label: 'Target middle name',
        field_value_masked: 'Marie',
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
    ];

    const snapshot = buildNameChangeExecutionSequenceSnapshot('courtOrder', profile, documents, extractedFields);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.blockers).toContain('Court-order target legal name and case number are verified, but the signed date still needs grounded extraction before downstream use is fully trusted.');
    expect(snapshot.dependencies.find((dependency) => dependency.key === 'court-order-reference-extraction')).toMatchObject({
      status: 'attention',
      blocksReady: true,
      reason: 'Court-order target legal name and case number are verified, but the signed date still needs grounded extraction before downstream use is fully trusted.',
    });
    expect(snapshot.dependencies.find((dependency) => dependency.key === 'court-order-path-readiness')).toMatchObject({
      nextActionCategory: 'review',
    });
  });

  it('marks DMV sequencing dependency satisfied when the SSA step is complete', () => {
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
    const plan = {
      ...buildNameChangePlan({ profile: makeCase(), documents, extractedFields: [] }),
      steps: buildNameChangePlan({ profile: makeCase(), documents, extractedFields: [] }).steps.map((step) =>
        step.id === 'federal-ssa' ? { ...step, executionStatus: 'complete' as const } : step,
      ),
    };

    const snapshot = buildNameChangeExecutionSequenceSnapshot('dmv', makeCase(), documents, [], plan);
    expect(snapshot.dependencies.find((dependency) => dependency.key === 'federal-ssa-progress')).toMatchObject({ status: 'satisfied' });
  });

  it('treats snapshot-backed opaque court-order uploads as sequence-grounded extraction truth', () => {
    const profile = makeCase({
      legal_basis: 'court_order',
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
        extracted_snapshot: {
          fields: {
            first_name: { value: 'Alex' },
            last_name: { value: 'Jordan' },
            case_number: { value: '24-CV-1188' },
            court_order_date: { value: '2026-04-12' },
          },
        },
      },
    ];

    const snapshot = buildNameChangeExecutionSequenceSnapshot('courtOrder', profile, documents, []);
    expect(snapshot.dependencies.find((dependency) => dependency.key === 'court-order-reference-extraction')).toMatchObject({
      status: 'satisfied',
    });
  });

  it('marks passport sequencing ready once SSA is underway', () => {
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
    const basePlan = buildNameChangePlan({ profile: makeCase(), documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) =>
        step.id === 'federal-ssa' ? { ...step, executionStatus: 'in_progress' as const } : step,
      ),
    };

    const snapshot = buildNameChangeExecutionSequenceSnapshot('passport', makeCase(), documents, [], plan);
    expect(snapshot.lane).toBe('federal');
    expect(snapshot.ready).toBe(true);
    expect(snapshot.dependencies.find((dependency) => dependency.key === 'federal-ssa-progress')).toMatchObject({ status: 'satisfied' });
  });

  it('marks employer sequencing ready after SSA completion for employed users', () => {
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
      steps: basePlan.steps.map((step) =>
        step.id === 'federal-ssa' ? { ...step, executionStatus: 'complete' as const } : step,
      ),
    };

    const snapshot = buildNameChangeExecutionSequenceSnapshot('employer', makeCase(), documents, [], plan);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.dependencies.find((dependency) => dependency.key === 'employment-context')).toMatchObject({ status: 'satisfied' });
  });

  it('marks bank sequencing ready when DMV is in progress', () => {
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
      steps: basePlan.steps.map((step) =>
        step.id === 'state-dmv' ? { ...step, executionStatus: 'in_progress' as const } : step,
      ),
    };

    const snapshot = buildNameChangeExecutionSequenceSnapshot('banks', makeCase(), documents, [], plan);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.dependencies.find((dependency) => dependency.key === 'primary-photo-id-progress')).toMatchObject({ status: 'satisfied' });
  });

  it('adds a dual-partner SSA execution dependency when both partners are changing names', () => {
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

    const snapshot = buildNameChangeExecutionSequenceSnapshot(
      'ssa',
      makeCase({ structured_intake: { spouseLastName: 'Jordan', bothPartnersChangeName: true } }),
      documents,
      [],
    );

    expect(snapshot.dependencies.find((dependency) => dependency.key === 'dual-partner-ssa-split')).toMatchObject({
      status: 'attention',
      nextActionCategory: 'review',
    });
  });

  it('adds dual-partner branching dependencies for DMV and downstream rollout targets', () => {
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
    const profile = makeCase({ structured_intake: { spouseLastName: 'Jordan', bothPartnersChangeName: true } });
    const basePlan = buildNameChangePlan({ profile, documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) =>
        step.id === 'state-dmv' ? { ...step, executionStatus: 'in_progress' as const } : step,
      ),
    };

    const dmvSnapshot = buildNameChangeExecutionSequenceSnapshot('dmv', profile, documents, [], plan);
    const banksSnapshot = buildNameChangeExecutionSequenceSnapshot('banks', profile, documents, [], plan);

    expect(dmvSnapshot.dependencies.find((dependency) => dependency.key === 'dual-partner-dmv-split')).toMatchObject({
      status: 'attention',
      nextActionCategory: 'review',
    });
    expect(banksSnapshot.dependencies.find((dependency) => dependency.key === 'dual-partner-financial-identity-support')).toMatchObject({
      status: 'attention',
      nextActionCategory: 'review',
    });
  });

  it('adds dual-partner branching dependencies across employer and rollout-only targets', () => {
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
      {
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
    ];
    const profile = makeCase({
      employment_status: 'employed',
      structured_intake: { spouseLastName: 'Jordan', bothPartnersChangeName: true },
    });

    const employerSnapshot = buildNameChangeExecutionSequenceSnapshot('employer', profile, documents, []);
    const courtesySnapshot = buildNameChangeExecutionSequenceSnapshot('courtesy', profile, documents, []);
    const voterSnapshot = buildNameChangeExecutionSequenceSnapshot('voter', profile, documents, []);
    const tsaSnapshot = buildNameChangeExecutionSequenceSnapshot('tsa', profile, documents, []);
    const licensesSnapshot = buildNameChangeExecutionSequenceSnapshot('licenses', profile, documents, []);

    expect(employerSnapshot.dependencies.find((dependency) => dependency.key === 'dual-partner-employer-packet')).toMatchObject({
      status: 'attention',
      nextActionCategory: 'review',
    });
    expect(courtesySnapshot.dependencies.find((dependency) => dependency.key === 'dual-partner-courtesy-identity-support')).toMatchObject({
      status: 'attention',
      nextActionCategory: 'review',
    });
    expect(voterSnapshot.dependencies.find((dependency) => dependency.key === 'dual-partner-california-voter-support')).toMatchObject({
      status: 'attention',
      nextActionCategory: 'review',
    });
    expect(tsaSnapshot.dependencies.find((dependency) => dependency.key === 'dual-partner-travel-profile-support')).toMatchObject({
      status: 'attention',
      nextActionCategory: 'review',
    });
    expect(licensesSnapshot.dependencies.find((dependency) => dependency.key === 'dual-partner-license-identity-support')).toMatchObject({
      status: 'attention',
      nextActionCategory: 'review',
    });
  });

  it('marks insurance sequencing ready when DMV is in progress', () => {
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
      steps: basePlan.steps.map((step) =>
        step.id === 'state-dmv' ? { ...step, executionStatus: 'in_progress' as const } : step,
      ),
    };

    const snapshot = buildNameChangeExecutionSequenceSnapshot('insurance', makeCase(), documents, [], plan);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.dependencies.find((dependency) => dependency.key === 'primary-photo-id-progress')).toMatchObject({ status: 'satisfied' });
  });

  it('marks voter sequencing ready when DMV is complete', () => {
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
      steps: basePlan.steps.map((step) =>
        step.id === 'state-dmv' ? { ...step, executionStatus: 'complete' as const } : step,
      ),
    };

    const snapshot = buildNameChangeExecutionSequenceSnapshot('voter', makeCase(), documents, [], plan);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.dependencies.find((dependency) => dependency.key === 'state-dmv-complete')).toMatchObject({ status: 'satisfied' });
  });

  it('marks TSA sequencing ready when passport work is in progress', () => {
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
    const profile = makeCase({ structured_intake: { spouseLastName: 'Jordan', travelBookedSoon: true, wantsDocumentIntakeHelp: true } });
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
      steps: basePlan.steps.map((step) =>
        step.id === 'federal-passport' ? { ...step, executionStatus: 'in_progress' as const } : step,
      ),
    };

    const snapshot = buildNameChangeExecutionSequenceSnapshot('tsa', profile, documents, extractedFields, plan);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.dependencies.find((dependency) => dependency.key === 'passport-progress')).toMatchObject({ status: 'satisfied' });
  });

  it('blocks travel sequencing when out-of-state marriage handling has no certificate intake support', () => {
    const profile = makeCase({ marriage_state: 'Nevada' });
    const basePlan = buildNameChangePlan({ profile, documents: [], extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) =>
        step.id === 'federal-passport' ? { ...step, executionStatus: 'in_progress' as const } : step,
      ),
    };

    const snapshot = buildNameChangeExecutionSequenceSnapshot('tsa', profile, [], [], plan);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.dependencies.find((dependency) => dependency.key === 'marriage-jurisdiction-alignment')).toMatchObject({
      status: 'missing',
      reason: 'Marriage occurred in Nevada, but no marriage certificate is represented in intake for out-of-state certificate handling.',
    });
  });

  it('blocks passport sequencing when out-of-state marriage certificate grounding is still missing', () => {
    const profile = makeCase({ marriage_state: 'Nevada' });
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'doc-marriage',
        document_kind: 'marriage_certificate',
        display_name: 'Marriage certificate',
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
      steps: basePlan.steps.map((step) =>
        step.id === 'federal-ssa' ? { ...step, executionStatus: 'in_progress' as const } : step,
      ),
    };

    const snapshot = buildNameChangeExecutionSequenceSnapshot('passport', profile, documents, [], plan);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.dependencies.find((dependency) => dependency.key === 'out-of-state-marriage-certificate-grounding')).toMatchObject({
      status: 'missing',
      reason: 'Marriage certificate is present, but no grounded county, certificate-number extraction, or issuing-authority metadata is represented yet for out-of-state follow-through.',
    });
  });

  it('blocks travel sequencing when out-of-state marriage certificate grounding is still missing', () => {
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
      steps: basePlan.steps.map((step) =>
        step.id === 'federal-passport' ? { ...step, executionStatus: 'in_progress' as const } : step,
      ),
    };

    const snapshot = buildNameChangeExecutionSequenceSnapshot('tsa', profile, documents, [], plan);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.dependencies.find((dependency) => dependency.key === 'out-of-state-marriage-certificate-grounding')).toMatchObject({
      status: 'missing',
      reason: 'Marriage certificate is present, but no grounded county, certificate-number extraction, or issuing-authority metadata is represented yet for out-of-state follow-through.',
    });
  });

  it('marks professional-license sequencing ready when DMV is in progress for employed users', () => {
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
    const profile = makeCase();
    const basePlan = buildNameChangePlan({ profile, documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) =>
        step.id === 'state-dmv' ? { ...step, executionStatus: 'in_progress' as const } : step,
      ),
    };

    const snapshot = buildNameChangeExecutionSequenceSnapshot('licenses', profile, documents, [], plan);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.dependencies.find((dependency) => dependency.key === 'employment-context')).toMatchObject({ status: 'satisfied' });
  });

  it('blocks California DMV sequencing when launch state is not aligned', () => {
    const snapshot = buildNameChangeExecutionSequenceSnapshot('dmv', makeCase({ launch_state: 'texas' as never }), [], [], null);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.dependencies.find((dependency) => dependency.key === 'launch-state-alignment')).toMatchObject({ status: 'missing' });
  });

  it('marks medical/provider sequencing ready when DMV is in progress', () => {
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
    const profile = makeCase();
    const basePlan = buildNameChangePlan({ profile, documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) =>
        step.id === 'state-dmv' ? { ...step, executionStatus: 'in_progress' as const } : step,
      ),
    };

    const snapshot = buildNameChangeExecutionSequenceSnapshot('medical', profile, documents, [], plan);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.dependencies.find((dependency) => dependency.key === 'primary-photo-id-progress')).toMatchObject({ status: 'satisfied' });
  });

  it('marks utilities/lease sequencing ready when DMV is in progress', () => {
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
    const profile = makeCase();
    const basePlan = buildNameChangePlan({ profile, documents, extractedFields: [] });
    const plan = {
      ...basePlan,
      steps: basePlan.steps.map((step) =>
        step.id === 'state-dmv' ? { ...step, executionStatus: 'in_progress' as const } : step,
      ),
    };

    const snapshot = buildNameChangeExecutionSequenceSnapshot('utilities', profile, documents, [], plan);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.dependencies.find((dependency) => dependency.key === 'primary-photo-id-progress')).toMatchObject({ status: 'satisfied' });
  });

  it('keeps courtesy/social sync lightweight when downstream admin rollout has not started yet', () => {
    const snapshot = buildNameChangeExecutionSequenceSnapshot('courtesy', makeCase(), [], [], null);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.dependencies.find((dependency) => dependency.key === 'banks-or-utilities-progress')).toMatchObject({ status: 'missing' });
  });

  it('preserves required requirement attention while still marking the sequence not ready', () => {
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
        file_name_masked: 'passport-•••.pdf',
      },
    ];

    const snapshot = buildNameChangeExecutionSequenceSnapshot('ssa', makeCase(), documents, []);
    expect(snapshot.dependencies.find((dependency) => dependency.key === 'identity-document-coverage')).toMatchObject({
      status: 'attention',
      required: true,
      nextActionCategory: 'document',
      blocksReady: true,
      reason: 'Identity documents exist in intake, but metadata is still too thin for confident downstream use.',
    });
    expect(snapshot.ready).toBe(false);
  });
});
