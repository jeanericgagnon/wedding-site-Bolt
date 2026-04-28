import { describe, expect, it } from 'vitest';
import { buildNameChangeBankPacketSnapshot } from './bankPacket';
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

describe('name change bank packet snapshot', () => {
  it('builds a structured bank update packet payload', () => {
    const documents: NameChangeDocumentInput[] = [
      {
        id: 'marriage-doc',
        document_kind: 'marriage_certificate',
        display_name: 'Marriage certificate',
        storage_mode: 'metadata_only',
        intake_status: 'reviewed',
        issuing_authority: 'Clark County Clerk',
      },
    ];
    const extractedFields: NameChangeExtractedFieldInput[] = [
      {
        document_id: 'marriage-doc',
        field_key: 'certificate_number',
        field_label: 'Marriage certificate number',
        field_value_masked: 'MC-2026-7781',
        source_type: 'document_extract',
        is_verified: true,
      },
    ];

    const snapshot = buildNameChangeBankPacketSnapshot(makeCase(), documents, extractedFields);
    expect(snapshot.formCode).toBe('BANK-ACCOUNT-UPDATE-PACKET');
    expect(snapshot.fields.find((field) => field.fieldKey === 'accountHolder.currentMiddleName')).toMatchObject({ value: 'Marie' });
    expect(snapshot.fields.find((field) => field.fieldKey === 'accountHolder.newFirstName')).toMatchObject({ value: 'Alex' });
    expect(snapshot.fields.find((field) => field.fieldKey === 'accountHolder.newMiddleName')).toMatchObject({ value: 'Marie' });
    expect(snapshot.fields.find((field) => field.fieldKey === 'accountHolder.newLastName')).toMatchObject({ value: 'Jordan' });
    expect(snapshot.fields.find((field) => field.fieldKey === 'legal.marriageCertificateNumber')).toMatchObject({
      value: 'MC-2026-7781',
      source: 'extracted_field',
      sourceDocumentKind: 'marriage_certificate',
      sourceFieldKey: 'certificate_number',
      required: false,
    });
    expect(snapshot.fields.find((field) => field.fieldKey === 'legal.marriageIssuingAuthority')).toMatchObject({
      value: 'Clark County Clerk',
      source: 'extracted_field',
      sourceDocumentKind: 'marriage_certificate',
      required: false,
    });
  });
});
