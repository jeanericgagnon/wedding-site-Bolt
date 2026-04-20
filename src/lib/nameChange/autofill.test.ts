import { describe, expect, it } from 'vitest';
import { buildNameChangeAutofillPrepSnapshot } from './autofill';
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
      travelBookedSoon: true,
      wantsDocumentIntakeHelp: true,
    },
    latest_plan_summary: null,
    ...overrides,
  };
}

describe('name change autofill prep snapshot', () => {
  it('builds candidate autofill fields from canonical case + extracted fields', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
      },
      {
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        field_key: 'spouse_last_name',
        field_label: 'Spouse last name',
        field_value_masked: 'Jordan-Smith',
        source_type: 'manual',
        is_verified: true,
      },
      {
        field_key: 'county',
        field_label: 'County',
        field_value_masked: 'Orange County',
        source_type: 'manual',
        is_verified: true,
      },
    ];

    const snapshot = buildNameChangeAutofillPrepSnapshot(makeCase(), documents, extractedFields);
    expect(snapshot.summary.ready).toBeGreaterThan(0);
    expect(snapshot.fields.find((field) => field.targetField === 'applicant.target_last_name')).toMatchObject({
      value: expect.objectContaining({
        source: 'extracted_field',
        value: 'Jordan-Smith',
        sourceFieldKey: 'spouse_last_name',
      }),
    });
    expect(snapshot.fields.find((field) => field.targetField === 'applicant.current_first_name')).toMatchObject({
      value: expect.objectContaining({
        source: 'canonical_case',
        value: 'Alex',
      }),
    });
  });

  it('keeps missing fields explicit when neither canonical nor extracted value exists', () => {
    const snapshot = buildNameChangeAutofillPrepSnapshot(makeCase({ county_residence: null, marriage_date: null }), [], []);
    expect(snapshot.fields.find((field) => field.targetField === 'applicant.county')).toMatchObject({
      value: expect.objectContaining({ value: null, confidence: 'low' }),
    });
    expect(snapshot.fields.find((field) => field.targetField === 'legal.marriage_date')).toMatchObject({
      value: expect.objectContaining({ value: null, confidence: 'low' }),
    });
  });
});
