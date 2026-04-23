import { describe, expect, it } from 'vitest';
import { buildNameChangeMedicalPacketSnapshot } from './medicalPacket';
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

describe('name change medical packet snapshot', () => {
  it('builds a structured medical/provider record update packet payload', () => {
    const snapshot = buildNameChangeMedicalPacketSnapshot(makeCase(), [], []);
    expect(snapshot.formCode).toBe('MEDICAL-PROVIDER-RECORD-UPDATE');
    expect(snapshot.fields.find((field) => field.fieldKey === 'patient.newFirstName')).toMatchObject({ value: 'Alex' });
    expect(snapshot.fields.find((field) => field.fieldKey === 'patient.newLastName')).toMatchObject({ value: 'Jordan' });
  });
});
