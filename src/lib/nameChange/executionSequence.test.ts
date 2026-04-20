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
});
