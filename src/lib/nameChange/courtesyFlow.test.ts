import { describe, expect, it } from 'vitest';
import { buildNameChangeCourtesyExecutionSnapshot } from './courtesyFlow';
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

describe('name change courtesy execution snapshot', () => {
  it('marks courtesy/social sync ready when account-facing identity context exists', () => {
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

    const snapshot = buildNameChangeCourtesyExecutionSnapshot(makeCase(), documents, [], plan);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.recommendedFormCode).toBe('COURTESY-SOCIAL-IDENTITY-SYNC');
    expect(snapshot.sequence.dependencies.find((dependency) => dependency.key === 'courtesy-identity-support')).toMatchObject({ status: 'satisfied' });
  });

  it('stays mostly lightweight when no related account step has started yet', () => {
    const snapshot = buildNameChangeCourtesyExecutionSnapshot(makeCase(), [], []);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.sequence.dependencies.find((dependency) => dependency.key === 'banks-or-utilities-progress')).toMatchObject({ status: 'missing' });
  });
});
