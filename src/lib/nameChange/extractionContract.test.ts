import { describe, expect, it } from 'vitest';
import { buildNameChangeExtractionContractSnapshot } from './extractionContract';
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

describe('name change extraction contract', () => {
  it('builds typed marriage certificate and passport extraction payloads', () => {
    const extractedFields: NameChangeExtractedFieldInput[] = [
      { field_key: 'first_name', field_label: 'First name', field_value_masked: 'Alex', source_type: 'manual', is_verified: true },
      { field_key: 'last_name', field_label: 'Last name', field_value_masked: 'Rivera', source_type: 'manual', is_verified: true },
      { field_key: 'spouse_last_name', field_label: 'Spouse last name', field_value_masked: 'Jordan', source_type: 'manual', is_verified: true },
      { field_key: 'county', field_label: 'County', field_value_masked: 'San Diego', source_type: 'manual', is_verified: true },
      { field_key: 'issuance_date', field_label: 'Issue date', field_value_masked: '2026-04-05', source_type: 'manual', is_verified: true },
    ];

    const snapshot = buildNameChangeExtractionContractSnapshot(makeCase(), [], extractedFields);
    expect(snapshot.marriageCertificate).toMatchObject({
      firstName: 'Alex',
      lastName: 'Rivera',
      spouseLastName: 'Jordan',
      county: 'San Diego',
      issuanceDate: '2026-04-05',
    });
    expect(snapshot.currentPassport.issuanceDate).toBe('2026-04-05');
  });

  it('keeps missing typed extraction fields null', () => {
    const snapshot = buildNameChangeExtractionContractSnapshot(makeCase(), [], []);
    expect(snapshot.courtOrder).toMatchObject({
      firstName: null,
      lastName: null,
      courtOrderDate: null,
    });
  });
});
