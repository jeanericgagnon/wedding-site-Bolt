import { describe, expect, it } from 'vitest';
import { buildNameChangeTaxPacketSnapshot } from './taxPacket';
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

describe('name change tax packet', () => {
  it('builds a tax identity alignment packet for IRS and state follow-through', () => {
    const snapshot = buildNameChangeTaxPacketSnapshot(makeCase(), [], []);

    expect(snapshot.formCode).toBe('TAX-SSA-STATE-ALIGNMENT-PACKET');
    expect(snapshot.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fieldKey: 'taxpayer.currentFirstName', value: 'Alex' }),
        expect.objectContaining({ fieldKey: 'taxpayer.newLastName', value: 'Jordan' }),
        expect.objectContaining({ fieldKey: 'residence.county', value: 'San Diego' }),
      ]),
    );
  });
});
