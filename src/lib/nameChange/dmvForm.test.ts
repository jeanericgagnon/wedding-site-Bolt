import { describe, expect, it } from 'vitest';
import { buildNameChangeDmvFormCompanion, buildNameChangeDmvFormSnapshot } from './dmvForm';
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

describe('name change DMV form snapshot', () => {
  it('builds a structured DMV payload from autofill prep values', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'marriage-doc',
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        issuing_authority: 'Orange County Clerk-Recorder',
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
        document_id: 'marriage-doc',
        field_key: 'county',
        field_label: 'County',
        field_value_masked: 'Orange County',
        source_type: 'manual',
        is_verified: true,
      },
    ];

    const snapshot = buildNameChangeDmvFormSnapshot(makeCase(), documents, extractedFields);
    expect(snapshot.formCode).toBe('CA-DL-44');
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
    expect(snapshot.fields.find((field) => field.fieldKey === 'applicant.newLastName')).toMatchObject({
      value: 'Jordan',
      source: 'canonical_case',
      sourceFieldKey: 'spouse_last_name',
    });
    expect(snapshot.fields.find((field) => field.fieldKey === 'applicant.county')).toMatchObject({
      value: 'Orange County',
      source: 'extracted_field',
      sourceFieldKey: 'county',
      sourceDocumentKind: 'marriage_certificate',
    });
    expect(snapshot.fields.find((field) => field.fieldKey === 'legal.marriageCertificateNumber')).toMatchObject({
      value: null,
      confidence: 'low',
      required: false,
    });
    expect(snapshot.fields.find((field) => field.fieldKey === 'legal.marriageIssuingAuthority')).toMatchObject({
      value: 'Orange County Clerk-Recorder',
      source: 'extracted_field',
      sourceDocumentKind: 'marriage_certificate',
      required: false,
    });
  });

  it('keeps missing DMV payload fields explicit', () => {
    const snapshot = buildNameChangeDmvFormSnapshot(makeCase({ county_residence: null, marriage_date: null }), [], []);
    expect(snapshot.fields.find((field) => field.fieldKey === 'applicant.county')).toMatchObject({ value: null, confidence: 'low' });
    expect(snapshot.fields.find((field) => field.fieldKey === 'legal.marriageDate')).toMatchObject({ value: null, confidence: 'low' });
    expect(snapshot.fields.find((field) => field.fieldKey === 'legal.marriageIssuingAuthority')).toMatchObject({ value: null, confidence: 'low', required: false });
  });

  it('builds DMV companion guidance with copy-ready and missing fields', () => {
    const companion = buildNameChangeDmvFormCompanion(makeCase({ marriage_date: null }), [], []);

    expect(companion.formCode).toBe('CA-DL-44');
    expect(companion.source).toMatchObject({
      officialUrl: 'https://www.dmv.ca.gov/portal/driver-licenses-identification-cards/dl-id-online-app-edl-44/',
      verificationStatus: 'verified_current',
    });
    expect(companion.fields.find((field) => field.fieldKey === 'applicant.newLastName')).toMatchObject({
      officialFieldLabel: 'New last name',
      status: 'ready',
      copyValue: 'Jordan',
    });
    expect(companion.fields.find((field) => field.fieldKey === 'legal.marriageDate')).toMatchObject({
      officialFieldLabel: 'Marriage date',
      status: 'missing',
      copyValue: '',
    });
    expect(companion.summary.missing).toBeGreaterThan(0);
  });
});
