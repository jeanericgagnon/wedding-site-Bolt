import { describe, expect, it } from 'vitest';
import { buildNameChangeSupplementalIntakePlan } from './formSupplementalIntake';
import type { NameChangeCaseInput } from './types';

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
    email: 'alex@example.com',
    phone_last4: '1234',
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

describe('name change supplemental intake plan', () => {
  it('surfaces extra government-form details that are not in the current companion payload', () => {
    const plan = buildNameChangeSupplementalIntakePlan(makeCase(), ['SSA-SS5', 'DS-82', 'CA-DL-44']);

    expect(plan.summary.missing).toBeGreaterThan(0);
    expect(plan.summary.secureSessionRequired).toBe(1);
    expect(plan.prompts.find((prompt) => prompt.promptKey === 'socialSecurityNumber')).toMatchObject({
      status: 'secure_session_required',
      sensitivity: 'secure_session_only',
      formCodes: ['SSA-SS5', 'DS-82', 'CA-DL-44'],
    });
    expect(plan.prompts.find((prompt) => prompt.promptKey === 'email')).toMatchObject({
      status: 'available',
      currentValueLabel: 'alex@example.com',
    });
  });

  it('marks structured supplemental values as available when they are already captured', () => {
    const plan = buildNameChangeSupplementalIntakePlan(makeCase({
      structured_intake: {
        spouseLastName: 'Jordan',
        travelBookedSoon: false,
        wantsDocumentIntakeHelp: true,
        dateOfBirth: '1994-08-14',
        mailingAddress: '123 Rose St, San Diego, CA 92101',
        placeOfBirth: 'San Diego, California',
      } as NameChangeCaseInput['structured_intake'],
    }), ['SSA-SS5', 'DS-11']);

    expect(plan.prompts.find((prompt) => prompt.promptKey === 'dateOfBirth')).toMatchObject({
      status: 'available',
      currentValueLabel: '1994-08-14',
    });
    expect(plan.prompts.find((prompt) => prompt.promptKey === 'mailingAddress')).toMatchObject({
      status: 'available',
      currentValueLabel: '123 Rose St, San Diego, CA 92101',
    });
  });
});
