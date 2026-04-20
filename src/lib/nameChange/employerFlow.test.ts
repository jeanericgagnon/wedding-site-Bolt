import { describe, expect, it } from 'vitest';
import { buildNameChangeEmployerExecutionSnapshot } from './employerFlow';
import { buildNameChangePlan } from './engine';
import type { NameChangeCaseInput, NameChangeDocumentInput } from './types';

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

describe('name change employer execution snapshot', () => {
  it('marks employer packet ready when SSA is complete and employment context is active', () => {
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

    const snapshot = buildNameChangeEmployerExecutionSnapshot(makeCase(), documents, [], plan);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.recommendedFormCode).toBe('EMPLOYER-HR-PACKET');
    expect(snapshot.sequence.dependencies.find((dependency) => dependency.key === 'employment-context')).toMatchObject({ status: 'satisfied' });
  });

  it('blocks employer packet when employment context is inactive or SSA is unfinished', () => {
    const snapshot = buildNameChangeEmployerExecutionSnapshot(makeCase({ employment_status: 'not_employed' }), [], []);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.blockers).toContain('Employer / payroll packet only matters when employment context is active.');
    expect(snapshot.sequence.dependencies.find((dependency) => dependency.key === 'federal-ssa-complete')).toMatchObject({ status: 'missing' });
  });
});
