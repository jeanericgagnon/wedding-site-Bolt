import { describe, expect, it } from 'vitest';
import { buildNameChangeCourtOrderPacketSnapshot } from './courtOrderPacket';
import type { NameChangeCaseInput } from './types';

function makeCase(overrides: Partial<NameChangeCaseInput> = {}): NameChangeCaseInput {
  return {
    workflow_status: 'draft',
    launch_state: 'california',
    legal_basis: 'court_order',
    current_first_name: 'Alex',
    current_middle_name: 'Marie',
    current_last_name: 'Rivera',
    target_first_name: 'Alex',
    target_middle_name: 'Marie',
    target_last_name: 'Jordan',
    email: null,
    phone_last4: null,
    county_residence: 'San Diego',
    marriage_state: null,
    marriage_date: null,
    urgency_level: 'standard',
    has_us_passport: true,
    passport_needs_update: true,
    has_real_id_license: true,
    is_us_citizen: true,
    employment_status: 'employed',
    change_reasons: ['court_order'],
    structured_intake: {
      spouseLastName: null,
      travelBookedSoon: false,
      wantsDocumentIntakeHelp: true,
    },
    latest_plan_summary: null,
    ...overrides,
  };
}

describe('court-order name change packet snapshot', () => {
  it('builds a structured court-order path review payload', () => {
    const snapshot = buildNameChangeCourtOrderPacketSnapshot(makeCase(), [], []);
    expect(snapshot.formCode).toBe('COURT-ORDER-PATH-REVIEW');
    expect(snapshot.fields.find((field) => field.fieldKey === 'case.targetLastName')).toMatchObject({ value: 'Jordan' });
  });
});
