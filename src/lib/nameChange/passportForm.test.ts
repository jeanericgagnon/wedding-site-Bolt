import { describe, expect, it } from 'vitest';
import { buildNameChangePassportFormSnapshot } from './passportForm';
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

describe('name change passport form snapshot', () => {
  it('uses DS-82 when the user already has a passport', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'passport-doc',
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'passport-doc',
        field_key: 'issuance_date',
        field_label: 'Passport issue date',
        field_value_masked: '2024-06-01',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    const snapshot = buildNameChangePassportFormSnapshot(makeCase(), documents, extractedFields);
    expect(snapshot.formCode).toBe('DS-82');
    expect(snapshot.fields.find((field) => field.fieldKey === 'applicant.newFirstName')).toMatchObject({
      value: 'Alex',
      source: 'canonical_case',
    });
    expect(snapshot.fields.find((field) => field.fieldKey === 'applicant.newMiddleName')).toMatchObject({
      value: 'Marie',
      source: 'canonical_case',
      sourceFieldKey: 'middle_name',
      required: false,
    });
    expect(snapshot.fields.find((field) => field.fieldKey === 'identity.passportIssueDate')).toMatchObject({
      value: '2024-06-01',
      source: 'extracted_field',
      sourceDocumentKind: 'current_passport',
      sourceFieldKey: 'issuance_date',
    });
  });

  it('uses DS-11 when the user does not already have a passport', () => {
    const snapshot = buildNameChangePassportFormSnapshot(makeCase({ has_us_passport: false }), [], []);
    expect(snapshot.formCode).toBe('DS-11');
  });
});
