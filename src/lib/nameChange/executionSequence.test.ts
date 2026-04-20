import { describe, expect, it } from 'vitest';
import { buildNameChangeExecutionSequenceSnapshot } from './executionSequence';
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

describe('name change execution sequence snapshot', () => {
  it('marks SSA federal dependencies ready when proof + identity coverage exist', () => {
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

    const snapshot = buildNameChangeExecutionSequenceSnapshot('ssa', makeCase(), documents, []);
    expect(snapshot.lane).toBe('federal');
    expect(snapshot.ready).toBe(true);
    expect(snapshot.dependencies.find((dependency) => dependency.key === 'legal-proof-document')).toMatchObject({ status: 'satisfied' });
  });

  it('keeps DMV sequencing in attention when federal/state dependencies are incomplete', () => {
    const snapshot = buildNameChangeExecutionSequenceSnapshot('dmv', makeCase({ workflow_status: 'draft', county_residence: null }), [], []);
    expect(snapshot.lane).toBe('state');
    expect(snapshot.ready).toBe(false);
    expect(snapshot.dependencies.find((dependency) => dependency.key === 'county-context')).toMatchObject({ status: 'missing' });
    expect(snapshot.dependencies.find((dependency) => dependency.key === 'federal-ssa-progress')).toMatchObject({ status: 'missing' });
  });

  it('marks DMV sequencing dependency satisfied when the SSA step is complete', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
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

  it('marks passport sequencing ready once SSA is underway', () => {
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
});
