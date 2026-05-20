import { describe, expect, it } from 'vitest';
import { buildNameChangeSs5FormCompanion, buildNameChangeSs5FormSnapshot } from './ss5Form';
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

describe('name change SS-5 form snapshot', () => {
  it('builds a structured SS-5 payload from autofill prep values', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'marriage-doc',
        document_kind: 'marriage_certificate',
        display_name: 'Certified marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        issuing_authority: 'San Diego County Clerk',
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

    const snapshot = buildNameChangeSs5FormSnapshot(makeCase(), documents, extractedFields);
    expect(snapshot.formCode).toBe('SSA-SS5');
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
    expect(snapshot.fields.find((field) => field.fieldKey === 'legal.marriageCertificateNumber')).toMatchObject({
      value: null,
      confidence: 'low',
      required: false,
    });
    expect(snapshot.fields.find((field) => field.fieldKey === 'legal.marriageIssuingAuthority')).toMatchObject({
      value: 'San Diego County Clerk',
      source: 'extracted_field',
      sourceDocumentKind: 'marriage_certificate',
      required: false,
    });
    expect(snapshot.summary.ready).toBeGreaterThan(0);
  });

  it('keeps missing SS-5 payload fields explicit', () => {
    const snapshot = buildNameChangeSs5FormSnapshot(makeCase({ current_first_name: '', current_last_name: '', marriage_date: null }), [], []);
    expect(snapshot.fields.find((field) => field.fieldKey === 'applicant.currentFirstName')).toMatchObject({ value: null, confidence: 'low' });
    expect(snapshot.fields.find((field) => field.fieldKey === 'legal.marriageDate')).toMatchObject({ value: null, confidence: 'low' });
    expect(snapshot.fields.find((field) => field.fieldKey === 'legal.marriageIssuingAuthority')).toMatchObject({ value: null, confidence: 'low', required: false });
  });

  it('builds the SS-5 field companion with official source and put-this-here rows', () => {
    const companion = buildNameChangeSs5FormCompanion(makeCase(), [], []);
    expect(companion.formCode).toBe('SSA-SS5');
    expect(companion.source).toMatchObject({
      officialUrl: 'https://www.ssa.gov/forms/ss-5.pdf',
      officialRevisionLabel: 'Form SS-5 (12-2024) UF',
      verificationStatus: 'verified_current',
    });
    expect(companion.sections.map((section) => section.label)).toContain('Name requested on the updated record');
    expect(companion.fields.find((field) => field.fieldKey === 'applicant.newLastName')).toMatchObject({
      officialFieldLabel: 'New last name',
      value: 'Jordan',
      copyValue: 'Jordan',
      status: 'ready',
      userInstruction: 'Put this in the requested last-name field for the corrected Social Security record.',
    });
    expect(companion.reviewWarnings).toContain('This prepares a review draft only. The user must review, sign, and submit through Social Security instructions.');
  });
});
