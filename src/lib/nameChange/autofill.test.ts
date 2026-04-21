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
        file_name_masked: 'marriage-certificate-•••.pdf',
        issuing_authority: 'San Diego County Clerk',
        issued_on: '2026-04-05',
        extraction_confidence: 0.97,
      },
      {
        document_kind: 'current_passport',
        display_name: 'Passport',
        storage_mode: 'metadata_only',
        intake_status: 'uploaded',
        file_name_masked: 'passport-•••.pdf',
        issuing_authority: 'U.S. Department of State',
        issued_on: '2024-06-01',
        expires_on: '2034-06-01',
        extraction_confidence: 0.92,
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

  it('downgrades extracted confidence when the source document metadata is too thin', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
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
    ];

    const snapshot = buildNameChangeAutofillPrepSnapshot(makeCase(), documents, extractedFields);
    expect(snapshot.fields.find((field) => field.targetField === 'applicant.target_last_name')).toMatchObject({
      value: expect.objectContaining({
        source: 'extracted_field',
        value: 'Jordan-Smith',
        confidence: 'low',
        sourceDocumentKind: 'marriage_certificate',
      }),
    });
  });
});
