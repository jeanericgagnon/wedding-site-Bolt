import { describe, expect, it } from 'vitest';
import { buildNameChangeVoterExecutionSnapshot } from './voterFlow';
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

describe('name change voter execution snapshot', () => {
  it('marks voter update ready when DMV is complete and county context exists', () => {
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

    const snapshot = buildNameChangeVoterExecutionSnapshot(makeCase(), documents, [], plan);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.recommendedFormCode).toBe('CA-VOTER-REGISTRATION-UPDATE');
    expect(snapshot.sequence.dependencies.find((dependency) => dependency.key === 'state-dmv-complete')).toMatchObject({ status: 'satisfied' });
  });

  it('blocks voter update when DMV is unfinished or county context is missing', () => {
    const snapshot = buildNameChangeVoterExecutionSnapshot(makeCase({ county_residence: null }), [], []);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.blockers).toContain('California voter registration should wait until DMV is complete so the state record chain stays aligned.');
    expect(snapshot.sequence.dependencies.find((dependency) => dependency.key === 'state-dmv-complete')).toMatchObject({ status: 'missing' });
  });
});
