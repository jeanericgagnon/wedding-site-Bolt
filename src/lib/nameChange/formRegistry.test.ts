import { describe, expect, it } from 'vitest';
import { NAME_CHANGE_FORM_BUILDERS } from './formRegistry';
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

describe('name change form builder registry', () => {
  it('dispatches SS-5 and DMV form builders through a shared registry', () => {
    const banks = NAME_CHANGE_FORM_BUILDERS.banks(makeCase(), [], []);
    const insurance = NAME_CHANGE_FORM_BUILDERS.insurance(makeCase(), [], []);
    const licenses = NAME_CHANGE_FORM_BUILDERS.licenses(makeCase(), [], []);
    const medical = NAME_CHANGE_FORM_BUILDERS.medical(makeCase(), [], []);
    const tsa = NAME_CHANGE_FORM_BUILDERS.tsa(makeCase(), [], []);
    const voter = NAME_CHANGE_FORM_BUILDERS.voter(makeCase(), [], []);
    const ss5 = NAME_CHANGE_FORM_BUILDERS.ss5(makeCase(), [], []);
    const dmv = NAME_CHANGE_FORM_BUILDERS.dmv(makeCase(), [], []);
    const passport = NAME_CHANGE_FORM_BUILDERS.passport(makeCase(), [], []);
    const employer = NAME_CHANGE_FORM_BUILDERS.employer(makeCase(), [], []);

    expect(banks.formCode).toBe('BANK-ACCOUNT-UPDATE-PACKET');
    expect(insurance.formCode).toBe('INSURANCE-POLICY-UPDATE-PACKET');
    expect(licenses.formCode).toBe('PROFESSIONAL-LICENSE-UPDATE-PACKET');
    expect(medical.formCode).toBe('MEDICAL-PROVIDER-RECORD-UPDATE');
    expect(tsa.formCode).toBe('TSA-TRAVEL-PROFILE-UPDATE');
    expect(voter.formCode).toBe('CA-VOTER-REGISTRATION-UPDATE');
    expect(ss5.formCode).toBe('SSA-SS5');
    expect(dmv.formCode).toBe('CA-DL-44');
    expect(passport.formCode).toBe('DS-82');
    expect(employer.formCode).toBe('EMPLOYER-HR-PACKET');
  });
});
